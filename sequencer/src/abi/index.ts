import { parseAbi } from "viem";

// export const poolLaunchAbi = [
//   {
//     type: "event",
//     name: "PoolLaunched",
//     inputs: [
//       {
//         name: "poolId",
//         type: "bytes32",
//         indexed: true,
//       },
//       {
//         name: "launchConfig",
//         type: "tuple",
//         indexed: false,
//         components: [
//           { name: "token0", type: "address" },
//           { name: "token1", type: "address" },
//           { name: "token0SeedAmt", type: "uint256" },
//           { name: "token1SeedAmt", type: "uint256" },
//           { name: "fee", type: "uint24" },
//           { name: "strategyAdapter", type: "address" },
//           { name: "thresholdAdapter", type: "address" },
//           { name: "curator", type: "address" },
//           {
//             name: "curatorInfo",
//             type: "tuple",
//             components: [
//               { name: "name", type: "string" },
//               { name: "website", type: "string" },
//             ],
//           },
//         ],
//       },
//     ],
//   },
// ] as const;

export const poolLaunchAbi = parseAbi([
  "event PoolLaunched(bytes32 indexed poolId, LaunchConfig launchConfig)",

  "struct LaunchConfig { address token0; address token1; uint256 token0SeedAmt; uint256 token1SeedAmt; uint24 fee; address strategyAdapter; address thresholdAdapter; address curator; CuratorInfo curatorInfo; }",

  "struct CuratorInfo { string name; string website; }",
]);

export const poolManagerAbi = parseAbi([
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
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
          { name: "amount0", type: "int128" },
          { name: "amount1", type: "int128" },
          { name: "sqrtPriceX96", type: "uint160" },
          { name: "liquidity", type: "uint128" },
          { name: "tick", type: "int24" },
          { name: "fee", type: "uint24" },
          { name: "txHash", type: "bytes32" },
          { name: "blockNumber", type: "uint64" },
          { name: "logIndex", type: "uint32" },
        ],
      },
    ],
    outputs: [],
  },
] as const;
