import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import pinoHttp from "pino-http";
import { z } from "zod";
import type { Server } from "node:http";
import { config } from "../config/index.js";
import { logger } from "../logger.js";
import type { SubmitBatchFn } from "../submitter.js";
import {
  dequeueBatch,
  isQueueEmpty,
  queueSize,
  requeueFront,
} from "../state/queue.js";
import {
  getPoolConfigMap,
  getPoolMetadata,
  hasPool,
  lastIndexedBlock,
  poolCount,
} from "../state/pools.js";
import type { PoolId } from "../types.js";
import { getAppId } from "../appd.js";

const UpdateSchema = z.object({
  poolId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  parameters: z.string().min(1).max(8192),
});

const PoolIdParamSchema = z.object({
  poolId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export interface HttpServerDeps {
  submitBatch: SubmitBatchFn;
  readiness: () => boolean;
}

export interface HttpServerHandle {
  close: () => Promise<void>;
}

export async function startHttpServer(
  deps: HttpServerDeps
): Promise<HttpServerHandle> {
  const app = buildApp(deps);
  const server = await listen(app);
  logger.info(
    {
      host: config.expressHost,
      port: config.expressPort,
      batchSize: config.batchSize,
    },
    "HTTP server listening"
  );
  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      }),
  };
}

function buildApp({ submitBatch, readiness }: HttpServerDeps): Express {
  const app = express();
  type PinoHttpFn = typeof import("pino-http").default;
  const httpLogger = (pinoHttp as unknown as PinoHttpFn)({
    logger,
    autoLogging: true,
  });
  app.use(httpLogger);
  app.use(
    express.json({
      limit: "2mb",
    })
  );

  let cachedAppId: string | null = null;

  app.get("/", async (_req: Request, res: Response) => {
    if (!readiness()) {
      return res.status(503).json({ ok: false, message: "Indexer warming up" });
    }
    if (!cachedAppId) {
      try {
        cachedAppId = await getAppId();
      } catch {
        cachedAppId = null;
      }
    }
    return res.json({
      ok: true,
      appId: cachedAppId,
      chainId: config.chainId,
      poolCount: poolCount(),
      queuedOrders: queueSize(),
      lastIndexedBlock: {
        poolLaunch: lastIndexedBlock.poolLaunch.toString(),
        swaps: lastIndexedBlock.swaps.toString(),
      },
      startedAt: app.locals.startedAt,
      gitCommit: process.env.GIT_COMMIT ?? null,
    });
  });

  app.get("/api/pools", (_req: Request, res: Response) => {
    if (!readiness()) {
      return res.status(503).json({ ok: false, message: "Indexer warming up" });
    }
    const pools = getPoolConfigMap();
    return res.json({ ok: true, pools, total: Object.keys(pools).length });
  });

  app.get("/api/pools/:poolId", (req: Request, res: Response) => {
    if (!readiness()) {
      return res.status(503).json({ ok: false, message: "Indexer warming up" });
    }
    const parsed = PoolIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, errors: parsed.error.issues });
    }
    const poolId = parsed.data.poolId as PoolId;
    const metadata = getPoolMetadata(poolId);
    if (!metadata) {
      return res
        .status(404)
        .json({ ok: false, message: "Unknown poolId", poolId });
    }
    return res.json({
      ok: true,
      poolId,
      launchConfig: metadata.launchConfig,
      launchedAt: metadata.launchedAt,
      blockNumber: metadata.blockNumber.toString(),
      txHash: metadata.txHash,
    });
  });

  let inFlight = false;
  app.post("/update", async (req: Request, res: Response) => {
    logger.info({ body: req.body }, "POST /update: received request");

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        { errors: parsed.error.issues, body: req.body },
        "POST /update: validation failed"
      );
      return res.status(400).json({ ok: false, errors: parsed.error.issues });
    }

    const { poolId, parameters } = parsed.data;
    logger.info(
      {
        poolId,
        parametersLength: parameters.length,
        parametersPreview: parameters.slice(0, 66),
      },
      "POST /update: validated request"
    );

    if (!hasPool(poolId as PoolId)) {
      logger.warn({ poolId }, "POST /update: unknown poolId");
      return res.status(404).json({ ok: false, message: "Unknown poolId" });
    }

    const currentQueueSize = queueSize();
    if (isQueueEmpty()) {
      logger.info(
        { poolId, queueSize: currentQueueSize },
        "POST /update: queue is empty, no orders to process"
      );
      return res.status(202).json({
        ok: true,
        message: "No swap orders queued",
      });
    }

    if (inFlight) {
      logger.warn(
        { poolId, queueSize: currentQueueSize },
        "POST /update: batch submission already in flight"
      );
      return res
        .status(409)
        .json({ ok: false, message: "Batch submission already running" });
    }

    inFlight = true;
    logger.info(
      { poolId, queueSize: currentQueueSize, batchSize: config.batchSize },
      "POST /update: dequeuing batch"
    );

    const drained = dequeueBatch(config.batchSize);
    if (drained.length === 0) {
      inFlight = false;
      logger.warn(
        { poolId, queueSize: currentQueueSize },
        "POST /update: no orders dequeued despite non-empty queue"
      );
      return res
        .status(202)
        .json({ ok: true, message: "No swap orders dequeued" });
    }

    logger.info(
      { poolId, orderCount: drained.length, parameters },
      "POST /update: submitting batch"
    );

    try {
      const result = await submitBatch({
        poolId: poolId as PoolId,
        parameters,
        orders: drained,
      });
      logger.info(
        { poolId, orderCount: drained.length, result },
        "POST /update: batch submitted successfully"
      );
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      requeueFront(drained);
      logger.error(
        { err, poolId, orderCount: drained.length, parameters },
        "POST /update: submitBatch failed, requeued swaps"
      );
      return res
        .status(502)
        .json({ ok: false, message: "Failed to submit batch" });
    } finally {
      inFlight = false;
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ ok: false, message: "Internal error" });
  });

  app.locals.startedAt = new Date().toISOString();
  return app;
}

function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(config.expressPort, config.expressHost, () => {
      resolve(server);
    });
  });
}
