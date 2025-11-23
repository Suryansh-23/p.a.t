import { parseAbi } from "viem";

export const poolLaunchAbi = parseAbi([
  "event PoolLaunched(bytes32 indexed poolId, LaunchConfig launchConfig)",

  "struct LaunchConfig { address token0; address token1; uint256 token0SeedAmt; uint256 token1SeedAmt; address strategyAdapter; address thresholdAdapter; string poolName; CuratorInfo curatorInfo; }",

  "struct CuratorInfo { address curator; string name; string website; }",
]);

export const poolManagerAbi = parseAbi([
  "event SwapRequested(bytes32 indexed poolId, address sender, bool zeroForOne, int256 amountSpecified)",
]);

export const batcherAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "_tee", type: "address", internalType: "address" },
      { name: "_propLaunchpad", type: "address", internalType: "address" },
      { name: "_propHook", type: "address", internalType: "address" },
      { name: "_poolManager", type: "address", internalType: "address" },
      { name: "_universalRouter", type: "address", internalType: "address" },
      { name: "_propRouter", type: "address", internalType: "address" },
      { name: "_permit2", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "TEE",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "postBatch",
    inputs: [
      { name: "poolId", type: "bytes32", internalType: "PoolId" },
      { name: "strategyUpdateParams", type: "bytes", internalType: "bytes" },
      {
        name: "swaps",
        type: "tuple[]",
        internalType: "struct ISwapHandler.SwapData[]",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "zeroForOne", type: "bool", internalType: "bool" },
          { name: "amountSpecified", type: "int256", internalType: "int256" },
          { name: "tokenIn", type: "address", internalType: "address" },
          { name: "tokenOut", type: "address", internalType: "address" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "propHook",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IPropHook" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "propLaunchpad",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IPropLaunchpad" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "propRouter",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unlockCallback",
    inputs: [{ name: "rawData", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "", type: "bytes", internalType: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "BatchPosted",
    inputs: [
      {
        name: "poolId",
        type: "bytes32",
        indexed: true,
        internalType: "PoolId",
      },
      {
        name: "swapCount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RebalancingTriggered",
    inputs: [
      {
        name: "poolId",
        type: "bytes32",
        indexed: true,
        internalType: "PoolId",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StrategyUpdated",
    inputs: [
      {
        name: "poolId",
        type: "bytes32",
        indexed: true,
        internalType: "PoolId",
      },
      { name: "params", type: "bytes", indexed: false, internalType: "bytes" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SwapExecutedInBatch",
    inputs: [
      {
        name: "poolId",
        type: "bytes32",
        indexed: true,
        internalType: "PoolId",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  { type: "error", name: "SwapHandler__InvalidSwapData", inputs: [] },
  { type: "error", name: "SwapHandler__PoolNotRegistered", inputs: [] },
  { type: "error", name: "SwapHandler__Unauthorized", inputs: [] },
] as const;
