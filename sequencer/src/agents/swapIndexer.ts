import type { Hex } from "viem";
import { poolManagerAbi } from "../abi/index.js";
import { config } from "../config/index.js";
import { getHttpClient, getWebSocketClient } from "../clients/viem.js";
import { logger } from "../logger.js";
import {
  hasPool,
  setLastIndexedBlock,
  getPoolMetadata,
} from "../state/pools.js";
import { enqueueSwap, isQueueEmpty, queueSize } from "../state/queue.js";
import type { SwapOrder } from "../types.js";

const LOG_CHUNK_SIZE = 10n;

type SwapLog = {
  args?: {
    poolId?: Hex | undefined;
    sender?: Hex | undefined;
    zeroForOne?: boolean | undefined;
    amountSpecified?: bigint | undefined;
  };
  blockNumber?: bigint;
  logIndex?: number;
  transactionHash?: Hex;
};

export async function startSwapIndexer(): Promise<() => void> {
  const httpClient = getHttpClient();
  const wsClient = getWebSocketClient();
  const latestBlock = await httpClient.getBlockNumber();

  let watchFromBlock = latestBlock;
  if (config.poolManagerStartBlock >= 0n) {
    logger.info(
      {
        fromBlock: config.poolManagerStartBlock.toString(),
        toBlock: latestBlock.toString(),
      },
      "Starting swap backfill"
    );
    await backfillSwaps(httpClient, config.poolManagerStartBlock, latestBlock);
    watchFromBlock = latestBlock + 1n;
  } else {
    logger.info(
      { latestBlock: latestBlock.toString() },
      "Skipping swap backfill (start block = -1)"
    );
  }

  const unwatch = wsClient.watchContractEvent({
    address: config.poolManagerAddress as Hex,
    abi: poolManagerAbi,
    eventName: "SwapRequested",
    fromBlock: watchFromBlock,
    onLogs: (logs: SwapLog[]) => logs.forEach((log) => handleSwap(log)),
    onError: (err: unknown) => logger.error({ err }, "Swap watcher error"),
  });

  logger.info(
    { watchFromBlock: watchFromBlock.toString() },
    "Swap indexer online"
  );
  return () => {
    unwatch();
    logger.info("Swap indexer stopped");
  };
}

async function backfillSwaps(
  client: ReturnType<typeof getHttpClient>,
  startBlock: bigint,
  endBlock: bigint
) {
  if (startBlock < 0n || startBlock > endBlock) {
    return;
  }
  try {
    let cursor = startBlock;
    let totalLogs = 0;
    while (cursor <= endBlock) {
      const toBlock = cursor + LOG_CHUNK_SIZE - 1n;
      const cappedToBlock = toBlock > endBlock ? endBlock : toBlock;
      const logs = await client.getLogs({
        address: config.poolManagerAddress as Hex,
        event: poolManagerAbi[0],
        fromBlock: cursor,
        toBlock: cappedToBlock,
      });
      logs.forEach((log) => handleSwap(log as SwapLog));
      totalLogs += logs.length;
      logger.debug(
        {
          chunkStart: cursor.toString(),
          chunkEnd: cappedToBlock.toString(),
          logs: logs.length,
        },
        "Processed swap log chunk"
      );
      cursor = cappedToBlock + 1n;
    }
    logger.info(
      {
        total: totalLogs,
        fromBlock: startBlock.toString(),
        toBlock: endBlock.toString(),
        chunkSize: LOG_CHUNK_SIZE.toString(),
      },
      "Swap backfill complete"
    );
  } catch (err) {
    logger.error({ err }, "Swap backfill failed");
    throw err;
  }
}

function handleSwap(log: SwapLog) {
  const poolId = log.args?.poolId as Hex | undefined;
  if (!poolId) return;
  if (!hasPool(poolId)) {
    logger.debug(
      { poolId, txHash: log.transactionHash },
      "Ignoring swap for unknown poolId"
    );
    return;
  }

  const poolMeta = getPoolMetadata(poolId);
  if (!poolMeta?.launchConfig) {
    logger.warn(
      { poolId, txHash: log.transactionHash },
      "Pool metadata missing for swap"
    );
    return;
  }

  const sender = (log.args?.sender ??
    "0x0000000000000000000000000000000000000000") as Hex;
  const zeroForOne = log.args?.zeroForOne ?? false;

  // Determine tokenIn and tokenOut based on swap direction
  const token0 = poolMeta.launchConfig.token0 as Hex;
  const token1 = poolMeta.launchConfig.token1 as Hex;
  const tokenIn = zeroForOne ? token0 : token1;
  const tokenOut = zeroForOne ? token1 : token0;

  const order: SwapOrder = {
    poolId,
    swapId: (log.transactionHash ?? poolId) as Hex,
    sender,
    zeroForOne,
    amountSpecified: log.args?.amountSpecified ?? 0n,
    tokenIn,
    tokenOut,
    metadata: {
      blockNumber: log.blockNumber ?? 0n,
      logIndex: log.logIndex ?? 0,
      txHash: (log.transactionHash ?? "0x") as Hex,
      observedAt: Date.now(),
    },
  };

  enqueueSwap(order);
  if (log.blockNumber) setLastIndexedBlock("swaps", log.blockNumber);

  if (queueSize() % config.batchSize === 0 || queueSize() === 1) {
    logger.info({ queueSize: queueSize(), latestPool: poolId }, "Swap queued");
  } else if (isQueueEmpty()) {
    logger.debug("Swap queue empty");
  }
}
