import { logger } from "./logger.js";
import { startPoolLaunchIndexer } from "./agents/poolLaunchIndexer.js";
import { startSwapIndexer } from "./agents/swapIndexer.js";
import { initBatchSubmitter } from "./submitter.js";
import { startHttpServer } from "./http/server.js";

let shuttingDown = false;
let ready = false;

async function main() {
  try {
    logger.info("Booting pool batcher");
    const stopPoolIndexer = await startPoolLaunchIndexer();
    const stopSwapIndexer = await startSwapIndexer();
    const submitBatch = await initBatchSubmitter();

    const httpServer = await startHttpServer({
      submitBatch,
      readiness: () => ready,
    });

    ready = true;
    logger.info("Service ready");

    const shutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      ready = false;
      logger.info({ signal }, "Shutting down");
      await Promise.allSettled([httpServer.close()]);
      stopPoolIndexer();
      stopSwapIndexer();
      process.exit(0);
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  } catch (err) {
    logger.error({ err }, "Fatal error during boot");
    process.exit(1);
  }
}

main();
