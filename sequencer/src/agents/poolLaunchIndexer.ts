import type { Hex } from "viem";
import { getHttpClient, getWebSocketClient } from "../clients/viem.js";
import { config } from "../config/index.js";
import { poolLaunchAbi } from "../abi/index.js";
import { logger } from "../logger.js";
import { addPool, setLastIndexedBlock } from "../state/pools.js";
import type { LaunchConfig, LaunchMetadata, PoolId } from "../types.js";

const LOG_CHUNK_SIZE = 10n;

type LaunchConfigArgs = {
  token0?: Hex;
  token1?: Hex;
  token0SeedAmt?: bigint;
  token1SeedAmt?: bigint;
  fee?: number;
  strategyAdapter?: Hex;
  thresholdAdapter?: Hex;
  curator?: Hex;
  curatorInfo?: {
    name?: string;
    website?: string;
  };
} | null | undefined;

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
  const wsClient = getWebSocketClient();
  const latestBlock = await httpClient.getBlockNumber();

  let watchFromBlock = latestBlock;
  if (config.poolLaunchStartBlock >= 0n) {
    await backfillPools(httpClient, config.poolLaunchStartBlock, latestBlock);
    watchFromBlock = latestBlock + 1n;
  }

  const unwatch = wsClient.watchContractEvent({
    address: config.poolLaunchAddress as Hex,
    abi: poolLaunchAbi,
    eventName: "PoolLaunched",
    fromBlock: watchFromBlock,
    onLogs: (logs: PoolLaunchLog[]) => logs.forEach((log) => handleLog(log)),
    onError: (err: unknown) =>
      logger.error({ err }, "PoolLaunched watcher error, retrying"),
  });

  logger.info(
    { watchFromBlock: watchFromBlock.toString() },
    "Pool launch indexer online"
  );
  return () => {
    unwatch();
    logger.info("Pool launch indexer stopped");
  };
}

async function backfillPools(
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
        address: config.poolLaunchAddress as Hex,
        event: poolLaunchAbi[0],
        fromBlock: cursor,
        toBlock: cappedToBlock,
      });
      logs.forEach((log) => handleLog(log as PoolLaunchLog));
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
      "Pool launch backfill complete"
    );
  } catch (err) {
    logger.error({ err }, "Pool launch backfill failed");
    throw err;
  }
}

function handleLog(log: PoolLaunchLog) {
  const poolId = log.args?.poolId as PoolId | undefined;
  if (!poolId) return;

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

  logger.info({ poolId, block: log.blockNumber?.toString() }, "New pool added");
}

function mapLaunchConfig(
  data: LaunchConfigArgs | undefined
): Partial<LaunchConfig> {
  if (!data) return {};
  const launchConfig: Partial<LaunchConfig> = {};
  if (data.token0) launchConfig.token0 = data.token0 as Hex;
  if (data.token1) launchConfig.token1 = data.token1 as Hex;
  if (typeof data.token0SeedAmt !== "undefined")
    launchConfig.token0SeedAmt = BigInt(data.token0SeedAmt);
  if (typeof data.token1SeedAmt !== "undefined")
    launchConfig.token1SeedAmt = BigInt(data.token1SeedAmt);
  if (typeof data.fee !== "undefined") launchConfig.fee = Number(data.fee);
  if (data.strategyAdapter) launchConfig.strategyAdapter = data.strategyAdapter as Hex;
  if (data.thresholdAdapter)
    launchConfig.thresholdAdapter = data.thresholdAdapter as Hex;
  if (data.curator) launchConfig.curator = data.curator as Hex;
  if (data.curatorInfo) {
    launchConfig.curatorInfo = {
      name: data.curatorInfo.name ?? "",
      website: data.curatorInfo.website ?? "",
    };
  }
  return launchConfig;
}
