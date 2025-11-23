import { parseAbi } from "viem";

export const poolLaunchAbi = parseAbi([
  "event PoolLaunched(bytes32 indexed poolId, LaunchConfig launchConfig)",

  "struct LaunchConfig { address token0; address token1; uint256 token0SeedAmt; uint256 token1SeedAmt; uint24 fee; address strategyAdapter; address thresholdAdapter; address curator; CuratorInfo curatorInfo; }",

  "struct CuratorInfo { string name; string website; }",
]);

export const poolManagerAbi = parseAbi([
  "event SwapRequested(bytes32 indexed poolId, address sender, bool zeroForOne, int256 amountSpecified)",
]);

export const batcherAbi = parseAbi([
  "function postBatch(bytes32 poolId, bytes calldata strategyUpdateParams, SwapData[] calldata swaps) external",
  "struct SwapData { address sender; bool zeroForOne; int256 amountSpecified; address tokenIn; address tokenOut; }",
]);
