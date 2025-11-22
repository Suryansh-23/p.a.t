// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

interface IPropHook {
    function configurePool(PoolKey calldata key, address strategyAdapter, address thresholdAdapter) external;

    function getPoolReserves(PoolKey calldata key) external view returns (uint256 reserve0, uint256 reserve1);

    function markSwapsExecuted(PoolKey calldata key, uint256[] calldata nonces) external;
}
