// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

/// @title IRouter
/// @notice Interface for the Router contract
interface IRouter {
    /// @notice Pull funds from router (only SwapHandler/TEE)
    /// @param poolId The pool ID
    /// @param user The user whose funds to pull
    /// @param token The token to pull
    /// @param amount The amount to pull
    function pullFunds(PoolId poolId, address user, address token, uint256 amount) external;

    /// @notice Get user's deposited balance for a pool and token
    function getUserBalance(PoolId poolId, address user, address token) external view returns (uint256);
}

