import { parseAbi } from "viem";

export const poolLaunchAbi = parseAbi([
  "event PoolLaunched(bytes32 indexed poolId, LaunchConfig launchConfig)",

  "struct LaunchConfig { address token0; address token1; uint256 token0SeedAmt; uint256 token1SeedAmt; uint24 fee; address strategyAdapter; address thresholdAdapter; address curator; CuratorInfo curatorInfo; }",

  "struct CuratorInfo { string name; string website; }",
]);

export const poolManagerAbi = parseAbi([
  "event SwapRequested(bytes32 indexed poolId, address sender, bool zeroForOne, int256 amountSpecified)",
]);

export const batcherAbi = [
  {
    type: "function",
    name: "submitBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "parameters", type: "string" },
      {
        name: "orders",
        type: "tuple[]",
        components: [
          { name: "swapId", type: "bytes32" },
          { name: "sender", type: "address" },
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "txHash", type: "bytes32" },
          { name: "blockNumber", type: "uint64" },
          { name: "logIndex", type: "uint32" },
        ],
      },
    ],
    outputs: [],
  },
] as const;
