export const PropAMMLaunchPadAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_poolManager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "POOL_MANAGER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addLiquidity",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "name": "asset",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getLaunchConfig",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "internalType": "PoolId"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct PropLaunchpad.LaunchConfig",
        "components": [
          {
            "name": "token0",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "token1",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "token0SeedAmt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "token1SeedAmt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "strategyAdapter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "thresholdAdapter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "poolName",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "curatorInfo",
            "type": "tuple",
            "internalType": "struct PropLaunchpad.CuratorInfo",
            "components": [
              {
                "name": "curator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "name",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "website",
                "type": "string",
                "internalType": "string"
              }
            ]
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "launch",
    "inputs": [
      {
        "name": "_launchConfig",
        "type": "tuple",
        "internalType": "struct PropLaunchpad.LaunchConfig",
        "components": [
          {
            "name": "token0",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "token1",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "token0SeedAmt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "token1SeedAmt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "strategyAdapter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "thresholdAdapter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "poolName",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "curatorInfo",
            "type": "tuple",
            "internalType": "struct PropLaunchpad.CuratorInfo",
            "components": [
              {
                "name": "curator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "name",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "website",
                "type": "string",
                "internalType": "string"
              }
            ]
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "internalType": "PoolId"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "launchConfigs",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "PoolId"
      }
    ],
    "outputs": [
      {
        "name": "token0",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "token1",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "token0SeedAmt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "token1SeedAmt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "strategyAdapter",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "thresholdAdapter",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "poolName",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "curatorInfo",
        "type": "tuple",
        "internalType": "struct PropLaunchpad.CuratorInfo",
        "components": [
          {
            "name": "curator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "website",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "propHook",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPropHook"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removeLiquidity",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "name": "asset",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPropHook",
    "inputs": [
      {
        "name": "_propHook",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unlockCallback",
    "inputs": [
      {
        "name": "rawData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "LiquidityAdded",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "PoolId"
      },
      {
        "name": "provider",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LiquidityRemoved",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "PoolId"
      },
      {
        "name": "provider",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PoolLaunched",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "PoolId"
      },
      {
        "name": "token0",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "token1",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "strategyAdapter",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "thresholdAdapter",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InsufficientAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InvalidAsset",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InvalidPoolManager",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InvalidStrategy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InvalidStrategyAdapter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InvalidThresholdAdapter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__InvalidTokens",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__PoolAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__PoolNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__PropHookAlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PropLaunchpad__Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const
