import type { Hex } from "viem";
import { getHttpClient, getHttpClients } from "../clients/viem.js";
import { config } from "../config/index.js";
import { poolLaunchAbi } from "../abi/index.js";
import { logger } from "../logger.js";
import { addPool, setLastIndexedBlock } from "../state/pools.js";
import type { LaunchConfig, LaunchMetadata, PoolId } from "../types.js";

// Reduced to 5 to stay well within Alchemy free tier 10 block limit
const LOG_CHUNK_SIZE = 5n;
// Number of parallel requests to make (free tier can handle this)
const PARALLEL_REQUESTS = 5;

type LaunchConfigArgs =
  | {
      token0?: Hex;
      token1?: Hex;
      token0SeedAmt?: bigint;
      token1SeedAmt?: bigint;
      strategyAdapter?: Hex;
      thresholdAdapter?: Hex;
      poolName?: string;
      curatorInfo?: {
        curator?: Hex;
        name?: string;
        website?: string;
      };
    }
  | null
  | undefined;

type PoolLaunchLog = {
  args?: {
    poolId?: PoolId | undefined;
    launchConfig?: LaunchConfigArgs;
  };
  blockNumber?: bigint;
  transactionHash?: Hex;
};

export async function startPoolLaunchIndexer(): Promise<() => void> {
  const httpClient = getHttpClient();
  const latestBlock = await httpClient.getBlockNumber();

  logger.info(
    {
      poolLaunchAddress: config.poolLaunchAddress,
      latestBlock: latestBlock.toString(),
      startBlock: config.poolLaunchStartBlock.toString(),
      eventAbi: poolLaunchAbi[0],
    },
    "Pool launch indexer initializing"
  );

  let watchFromBlock = latestBlock;
  if (config.poolLaunchStartBlock >= 0n) {
    logger.info(
      {
        fromBlock: config.poolLaunchStartBlock.toString(),
        toBlock: latestBlock.toString(),
        blockRange: (latestBlock - config.poolLaunchStartBlock).toString(),
      },
      "Starting pool launch backfill"
    );
    await backfillPools(httpClient, config.poolLaunchStartBlock, latestBlock);
    watchFromBlock = latestBlock + 1n;
  } else {
    logger.info(
      { latestBlock: latestBlock.toString() },
      "Skipping pool launch backfill (start block = -1)"
    );
  }

  // Use polling instead of WebSocket watcher to respect free tier limits
  let isPolling = true;
  let lastPolledBlock = watchFromBlock - 1n;

  const pollInterval = setInterval(async () => {
    if (!isPolling) return;

    try {
      const currentBlock = await httpClient.getBlockNumber();

      if (currentBlock > lastPolledBlock) {
        const fromBlock = lastPolledBlock + 1n;
        // Respect free tier limit - poll in small chunks
        const toBlock =
          fromBlock + LOG_CHUNK_SIZE - 1n > currentBlock
            ? currentBlock
            : fromBlock + LOG_CHUNK_SIZE - 1n;

        logger.trace(
          {
            fromBlock: fromBlock.toString(),
            toBlock: toBlock.toString(),
            currentBlock: currentBlock.toString(),
          },
          "Polling for new PoolLaunched events"
        );

        const logs = await httpClient.getLogs({
          address: config.poolLaunchAddress as Hex,
          event: poolLaunchAbi[0],
          fromBlock,
          toBlock,
        });

        if (logs.length > 0) {
          logger.debug(
            {
              count: logs.length,
              fromBlock: fromBlock.toString(),
              toBlock: toBlock.toString(),
            },
            "New PoolLaunched events found"
          );
          logs.forEach((log) => handleLog(log as PoolLaunchLog));
        }

        lastPolledBlock = toBlock;
      }
    } catch (err) {
      logger.error({ err }, "Error polling for PoolLaunched events");
    }
  }, 2000); // Poll every 2 seconds

  logger.info(
    { watchFromBlock: watchFromBlock.toString(), pollInterval: "2s" },
    "Pool launch indexer online (polling mode)"
  );

  return () => {
    isPolling = false;
    clearInterval(pollInterval);
    logger.info("Pool launch indexer stopped");
  };
}

async function backfillPools(
  client: ReturnType<typeof getHttpClient>,
  startBlock: bigint,
  endBlock: bigint
) {
  if (startBlock < 0n || startBlock > endBlock) {
    logger.info(
      { startBlock: startBlock.toString(), endBlock: endBlock.toString() },
      "Skipping backfill: invalid block range"
    );
    return;
  }

  const clients = getHttpClients();
  logger.info(
    {
      address: config.poolLaunchAddress,
      startBlock: startBlock.toString(),
      endBlock: endBlock.toString(),
      eventSignature: poolLaunchAbi[0].name,
      rpcCount: clients.length,
    },
    "Starting pool launch backfill with config"
  );

  try {
    let cursor = startBlock;
    let totalLogs = 0;

    while (cursor <= endBlock) {
      // Prepare batch of chunks to fetch in parallel
      const chunkBatch: { from: bigint; to: bigint }[] = [];

      for (let i = 0; i < PARALLEL_REQUESTS && cursor <= endBlock; i++) {
        const toBlock = cursor + LOG_CHUNK_SIZE - 1n;
        const cappedToBlock = toBlock > endBlock ? endBlock : toBlock;
        chunkBatch.push({ from: cursor, to: cappedToBlock });
        cursor = cappedToBlock + 1n;
      }

      logger.debug(
        {
          batchSize: chunkBatch.length,
          chunks: chunkBatch.map((c) => `${c.from}-${c.to}`),
          progress: `${cursor - startBlock}/${endBlock - startBlock + 1n}`,
        },
        "Fetching pool launch logs batch"
      );

      // Fetch all chunks in parallel, distributing across available RPC clients
      const chunkResults = await Promise.allSettled(
        chunkBatch.map(async ({ from, to }, index) => {
          // Round-robin distribution across available RPC clients
          const rpcClient = clients[index % clients.length];
          if (!rpcClient) {
            throw new Error(`No RPC client available for index ${index}`);
          }
          try {
            const logs = await rpcClient.getLogs({
              address: config.poolLaunchAddress as Hex,
              event: poolLaunchAbi[0],
              fromBlock: from,
              toBlock: to,
            });
            return { logs, from, to, success: true as const };
          } catch (chunkError: any) {
            // Handle block range errors with single-block retry
            if (
              chunkError?.details?.includes("block range") ||
              chunkError?.message?.includes("block range")
            ) {
              logger.debug(
                {
                  error: chunkError.details || chunkError.message,
                  from: from.toString(),
                  to: to.toString(),
                },
                "Block range error, will retry with single blocks"
              );
              // Retry each block individually
              const singleBlockLogs: any[] = [];
              for (let block = from; block <= to; block++) {
                try {
                  const blockLogs = await rpcClient.getLogs({
                    address: config.poolLaunchAddress as Hex,
                    event: poolLaunchAbi[0],
                    fromBlock: block,
                    toBlock: block,
                  });
                  singleBlockLogs.push(...blockLogs);
                } catch (err) {
                  logger.warn(
                    { block: block.toString(), error: err },
                    "Failed to fetch single block"
                  );
                }
              }
              return {
                logs: singleBlockLogs,
                from,
                to,
                success: true as const,
              };
            }
            throw chunkError;
          }
        })
      );

      // Process results
      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        const chunk = chunkBatch[i];

        if (!result || !chunk) continue;

        if (result.status === "fulfilled" && result.value.success) {
          const { logs, from, to } = result.value;

          if (logs.length > 0) {
            logger.debug(
              {
                chunkStart: from.toString(),
                chunkEnd: to.toString(),
                logsFound: logs.length,
              },
              "Processing pool launch logs from chunk"
            );

            logs.forEach((log: any, idx: number) => {
              logger.trace(
                {
                  index: idx,
                  args: log.args,
                  topics: log.topics,
                  data: log.data,
                },
                "Raw PoolLaunched event"
              );
            });
          }

          logs.forEach((log: any) => handleLog(log as PoolLaunchLog));
          totalLogs += logs.length;
        } else {
          logger.error(
            {
              error:
                result.status === "rejected" ? result.reason : "Unknown error",
              chunkStart: chunk.from.toString(),
              chunkEnd: chunk.to.toString(),
            },
            "Failed to fetch logs for chunk"
          );
        }
      }
    }
    logger.info(
      {
        total: totalLogs,
        fromBlock: startBlock.toString(),
        toBlock: endBlock.toString(),
        chunkSize: LOG_CHUNK_SIZE.toString(),
      },
      "Pool launch backfill complete"
    );
  } catch (err) {
    logger.error({ err }, "Pool launch backfill failed");
    throw err;
  }
}

function handleLog(log: PoolLaunchLog) {
  logger.trace(
    {
      hasArgs: !!log.args,
      args: log.args,
      blockNumber: log.blockNumber?.toString(),
      txHash: log.transactionHash,
    },
    "handleLog called with log"
  );

  const poolId = log.args?.poolId as PoolId | undefined;

  if (!poolId) {
    logger.warn(
      {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber?.toString(),
        args: log.args,
      },
      "PoolLaunched event missing poolId, skipping"
    );
    return;
  }

  logger.debug(
    {
      poolId,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber?.toString(),
      hasLaunchConfig: !!log.args?.launchConfig,
      launchConfigRaw: log.args?.launchConfig,
    },
    "Processing PoolLaunched event"
  );

  const launchConfig = mapLaunchConfig(log.args?.launchConfig);
  const metadata: LaunchMetadata = {
    poolId,
    launchedAt: Date.now(),
    launchConfig,
    txHash: (log.transactionHash ?? "0x") as Hex,
    blockNumber: log.blockNumber ?? 0n,
  };

  addPool(metadata);
  if (log.blockNumber) {
    setLastIndexedBlock("poolLaunch", log.blockNumber);
  }

  logger.info(
    {
      poolId,
      block: log.blockNumber?.toString(),
      txHash: log.transactionHash,
      token0: launchConfig.token0,
      token1: launchConfig.token1,
      poolName: launchConfig.poolName,
      curator: launchConfig.curatorInfo?.curator,
    },
    "New pool added"
  );
}

function mapLaunchConfig(
  data: LaunchConfigArgs | undefined
): Partial<LaunchConfig> {
  if (!data) {
    logger.debug("LaunchConfig data is undefined, returning empty config");
    return {};
  }
  const launchConfig: Partial<LaunchConfig> = {};
  if (data.token0) launchConfig.token0 = data.token0 as Hex;
  if (data.token1) launchConfig.token1 = data.token1 as Hex;
  if (typeof data.token0SeedAmt !== "undefined")
    launchConfig.token0SeedAmt = BigInt(data.token0SeedAmt);
  if (typeof data.token1SeedAmt !== "undefined")
    launchConfig.token1SeedAmt = BigInt(data.token1SeedAmt);
  if (data.strategyAdapter)
    launchConfig.strategyAdapter = data.strategyAdapter as Hex;
  if (data.thresholdAdapter)
    launchConfig.thresholdAdapter = data.thresholdAdapter as Hex;
  if (data.poolName) launchConfig.poolName = data.poolName;
  if (data.curatorInfo) {
    launchConfig.curatorInfo = {
      curator: (data.curatorInfo.curator ??
        "0x0000000000000000000000000000000000000000") as Hex,
      name: data.curatorInfo.name ?? "",
      website: data.curatorInfo.website ?? "",
    };
  }
  return launchConfig;
}
