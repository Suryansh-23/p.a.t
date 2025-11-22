import type { Hex } from "viem";
import { poolManagerAbi } from "../abi/index.js";
import { config } from "../config/index.js";
import { getHttpClient, getWebSocketClient } from "../clients/viem.js";
import { logger } from "../logger.js";
import { hasPool, setLastIndexedBlock } from "../state/pools.js";
import { enqueueSwap, isQueueEmpty, queueSize } from "../state/queue.js";
import type { SwapOrder } from "../types.js";

const LOG_CHUNK_SIZE = 10n;

type SwapLog = {
  args?: {
    id?: Hex | undefined;
    sender?: Hex | undefined;
    amount0?: bigint | undefined;
    amount1?: bigint | undefined;
    sqrtPriceX96?: bigint | undefined;
    liquidity?: bigint | undefined;
    tick?: number | undefined;
    fee?: number | undefined;
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
    await backfillSwaps(
      httpClient,
      config.poolManagerStartBlock,
      latestBlock
    );
    watchFromBlock = latestBlock + 1n;
  }

  const unwatch = wsClient.watchContractEvent({
    address: config.poolManagerAddress as Hex,
    abi: poolManagerAbi,
    eventName: "Swap",
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
  const poolId = log.args?.id as Hex | undefined;
  if (!poolId) return;
  if (!hasPool(poolId)) {
    return;
  }

  const sender =
    (log.args?.sender ??
      "0x0000000000000000000000000000000000000000") as Hex;
  const order: SwapOrder = {
    poolId,
    swapId: (log.transactionHash ?? poolId) as Hex,
    sender,
    amount0: log.args?.amount0 ?? 0n,
    amount1: log.args?.amount1 ?? 0n,
    sqrtPriceX96: log.args?.sqrtPriceX96 ?? 0n,
    liquidity: log.args?.liquidity ?? 0n,
    tick: Number(log.args?.tick ?? 0),
    fee: Number(log.args?.fee ?? 0),
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
    logger.info(
      { queueSize: queueSize(), latestPool: poolId },
      "Swap queued"
    );
  } else if (isQueueEmpty()) {
    logger.debug("Swap queue empty");
  }
}
