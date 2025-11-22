import type { LaunchMetadata, PoolId } from "../types.js";

const poolIds = new Set<PoolId>();
const poolDetails = new Map<PoolId, LaunchMetadata>();

export const lastIndexedBlock = {
  poolLaunch: 0n,
  swaps: 0n,
};

export function addPool(metadata: LaunchMetadata): void {
  poolIds.add(metadata.poolId);
  poolDetails.set(metadata.poolId, metadata);
}

export function getPoolSet(): ReadonlySet<PoolId> {
  return poolIds;
}

export function hasPool(poolId: PoolId): boolean {
  return poolIds.has(poolId);
}

export function poolCount(): number {
  return poolIds.size;
}

export function getPools(): LaunchMetadata[] {
  return Array.from(poolDetails.values());
}

export function getPoolMetadata(poolId: PoolId): LaunchMetadata | undefined {
  return poolDetails.get(poolId);
}

export function getPoolConfigMap(): Record<
  PoolId,
  LaunchMetadata["launchConfig"]
> {
  const entries = Array.from(poolDetails.values()).map((meta) => [
    meta.poolId,
    meta.launchConfig,
  ]);
  return Object.fromEntries(entries) as Record<
    PoolId,
    LaunchMetadata["launchConfig"]
  >;
}

export function setLastIndexedBlock(
  key: keyof typeof lastIndexedBlock,
  block: bigint
): void {
  lastIndexedBlock[key] = block;
}
