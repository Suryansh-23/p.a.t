export const poolLaunchAbi = [
  {
    type: "event",
    name: "PoolLaunched",
    inputs: [
      {
        name: "poolId",
        type: "bytes32",
        indexed: true,
      },
      {
        name: "launchConfig",
        type: "tuple",
        indexed: false,
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "token0SeedAmt", type: "uint256" },
          { name: "token1SeedAmt", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "strategyAdapter", type: "address" },
          { name: "thresholdAdapter", type: "address" },
          { name: "curator", type: "address" },
          {
            name: "curatorInfo",
            type: "tuple",
            components: [
              { name: "name", type: "string" },
              { name: "website", type: "string" },
            ],
          },
        ],
      },
    ],
  },
] as const;

export const poolManagerAbi = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount0", type: "int128", indexed: false },
      { name: "amount1", type: "int128", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "tick", type: "int24", indexed: false },
      { name: "fee", type: "uint24", indexed: false },
    ],
  },
] as const;

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
