// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

interface IPropLaunchpad {
    ////////////////////////////////////////////////////
    ////////////////////// Structs /////////////////////
    ////////////////////////////////////////////////////

    /// @notice Configuration for launching a new pool
    struct LaunchConfig {
        address token0;
        address token1;
        uint256 token0SeedAmt;
        uint256 token1SeedAmt;
        address strategyAdapter;
        address thresholdAdapter;
        string poolName;
        CuratorInfo curatorInfo;
    }

    struct CuratorInfo {
        address curator;
        string name;
        string website;
    }

    /// @notice Callback data for liquidity operations
    struct CallbackData {
        address sender;
        PoolKey key;
        address asset;
        uint256 amount;
        bool isAdd;
    }

    function getLaunchConfig(PoolId poolId) external view returns (LaunchConfig memory);
}
