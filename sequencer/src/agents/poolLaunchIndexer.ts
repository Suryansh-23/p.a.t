import type { Hex } from "viem";
import { getPublicClient } from "../clients/viem.js";
import { config } from "../config/index.js";
import { poolLaunchAbi } from "../abi/index.js";
import { logger } from "../logger.js";
import { addPool, setLastIndexedBlock } from "../state/pools.js";
import type { LaunchConfig, LaunchMetadata, PoolId } from "../types.js";

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
  const client = getPublicClient();
  await backfillPools(client);

  const unwatch = client.watchContractEvent({
    address: config.poolLaunchAddress as Hex,
    abi: poolLaunchAbi,
    eventName: "PoolLaunched",
    onLogs: (logs) => logs.forEach((log) => handleLog(log)),
    onError: (err) =>
      logger.error({ err }, "PoolLaunched watcher error, retrying"),
  });

  logger.info("Pool launch indexer online");
  return () => {
    unwatch();
    logger.info("Pool launch indexer stopped");
  };
}

async function backfillPools(client: ReturnType<typeof getPublicClient>) {
  try {
    const latest = await client.getBlockNumber();
    const logs = await client.getLogs({
      address: config.poolLaunchAddress as Hex,
      event: poolLaunchAbi[0],
      fromBlock: config.poolLaunchStartBlock,
      toBlock: latest,
    });
    logs.forEach((log) => handleLog(log as PoolLaunchLog));
    logger.info(
      { total: logs.length, latestBlock: latest.toString() },
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

function mapLaunchConfig(data: LaunchConfigArgs | undefined): Partial<LaunchConfig> {
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
