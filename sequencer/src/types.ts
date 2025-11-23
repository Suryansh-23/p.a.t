export type HexString = `0x${string}`;
export type PoolId = HexString;

export interface CuratorInfo {
  name: string;
  website: string;
}

export interface LaunchConfig {
  token0: HexString;
  token1: HexString;
  token0SeedAmt: bigint;
  token1SeedAmt: bigint;
  fee: number;
  strategyAdapter: HexString;
  thresholdAdapter: HexString;
  curator: HexString;
  curatorInfo: CuratorInfo;
}

export interface LaunchMetadata {
  poolId: PoolId;
  launchedAt: number;
  launchConfig: Partial<LaunchConfig>;
  txHash: HexString;
  blockNumber: bigint;
}

export interface SwapOrder {
  poolId: PoolId;
  swapId: HexString;
  sender: HexString;
  zeroForOne: boolean;
  amountSpecified: bigint;
  tokenIn: HexString;
  tokenOut: HexString;
  metadata: {
    blockNumber: bigint;
    logIndex: number;
    txHash: HexString;
    observedAt: number;
  };
}

export interface BatchRequestPayload {
  poolId: PoolId;
  parameters: string;
}
