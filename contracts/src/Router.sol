// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";

/// @title Router
/// @notice Router for Prop AMM that holds user funds and attempts swaps
/// @dev Swaps are queued (not executed) and funds are held for TEE batch execution
contract Router is IUnlockCallback {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    ////////////////////////////////////////////////////
    /////////////////// Immutables /////////////////////
    ////////////////////////////////////////////////////

    /// @notice PoolManager address
    IPoolManager public immutable poolManager;

    /// @notice SwapHandler address (authorized to pull funds)
    address public swapHandler;

    ////////////////////////////////////////////////////
    ////////////////////// State ///////////////////////
    ////////////////////////////////////////////////////

    /// @notice Tracks user deposits per pool and token
    /// poolId => user => token => amount
    mapping(PoolId => mapping(address => mapping(address => uint256))) public userDeposits;

    ////////////////////////////////////////////////////
    ////////////////////// Events //////////////////////
    ////////////////////////////////////////////////////

    event SwapAttempted(
        PoolId indexed poolId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bool zeroForOne
    );

    event FundsDeposited(PoolId indexed poolId, address indexed user, address token, uint256 amount);

    event FundsWithdrawn(PoolId indexed poolId, address indexed user, address token, uint256 amount);

    event FundsPulledByTEE(PoolId indexed poolId, address indexed user, address token, uint256 amount);

    event SwapRequested(PoolId indexed poolId, address sender, bool zeroForOne, int256 amountSpecified);

    ////////////////////////////////////////////////////
    ////////////////////// Errors //////////////////////
    ////////////////////////////////////////////////////

    error Router__Unauthorized();
    error Router__InvalidAmount();
    error Router__InsufficientBalance();
    error Router__InvalidToken();
    error Router__TransferFailed();
    error Router__SwapHandlerAlreadySet();

    ////////////////////////////////////////////////////
    /////////////////// Constructor ////////////////////
    ////////////////////////////////////////////////////

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    ////////////////////////////////////////////////////
    ///////////////// External Functions ///////////////
    ////////////////////////////////////////////////////

    /// @notice Set the SwapHandler address (one-time only)
    /// @param _swapHandler The SwapHandler address
    function setSwapHandler(address _swapHandler) external {
        if (swapHandler != address(0)) revert Router__SwapHandlerAlreadySet();
        if (_swapHandler == address(0)) revert Router__Unauthorized();
        swapHandler = _swapHandler;
    }

    /// @notice Execute exact input swap (will be queued, not executed immediately)
    /// @param poolKey The pool key
    /// @param tokenIn The input token
    /// @param tokenOut The output token
    /// @param amountIn The exact amount of input token
    /// @dev User must approve this contract first
    /// @dev This function just holds tokens - actual swap execution happens via TEE batch
    function swapExactInput(PoolKey calldata poolKey, address tokenIn, address tokenOut, uint256 amountIn)
        external
        payable
    {
        if (amountIn == 0) revert Router__InvalidAmount();

        PoolId poolId = poolKey.toId();

        // Determine swap direction
        bool zeroForOne = tokenIn == Currency.unwrap(poolKey.currency0);
        if (!zeroForOne && tokenIn != Currency.unwrap(poolKey.currency1)) {
            revert Router__InvalidToken();
        }

        // Transfer tokens from user to this contract (escrow)
        if (tokenIn != address(0)) {
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        } else {
            if (msg.value != amountIn) revert Router__InvalidAmount();
        }

        // Track user deposit
        userDeposits[poolId][msg.sender][tokenIn] += amountIn;

        emit SwapRequested(poolId, msg.sender, zeroForOne, -int256(amountIn));
    }

    /// @notice Unlock callback - not used in simplified design
    function unlockCallback(bytes calldata) external pure override returns (bytes memory) {
        revert("Router: unlockCallback not used");
    }

    /// @notice Pull funds from router (only SwapHandler/TEE)
    /// @param poolId The pool ID
    /// @param user The user whose funds to pull
    /// @param token The token to pull
    /// @param amount The amount to pull
    function pullFunds(PoolId poolId, address user, address token, uint256 amount) external {
        if (msg.sender != swapHandler) revert Router__Unauthorized();
        if (userDeposits[poolId][user][token] < amount) revert Router__InsufficientBalance();

        userDeposits[poolId][user][token] -= amount;

        if (token != address(0)) {
            IERC20(token).safeTransfer(swapHandler, amount);
        } else {
            (bool success,) = swapHandler.call{value: amount}("");
            if (!success) revert Router__TransferFailed();
        }

        emit FundsPulledByTEE(poolId, user, token, amount);
    }

    /// @notice Withdraw deposited funds (if swap not executed yet)
    /// @param poolId The pool ID
    /// @param token The token to withdraw
    /// @param amount The amount to withdraw
    /// @dev Users can withdraw their funds if TEE hasn't processed their swap yet
    function withdraw(PoolId poolId, address token, uint256 amount) external {
        if (userDeposits[poolId][msg.sender][token] < amount) revert Router__InsufficientBalance();

        userDeposits[poolId][msg.sender][token] -= amount;

        if (token != address(0)) {
            IERC20(token).safeTransfer(msg.sender, amount);
        } else {
            (bool success,) = msg.sender.call{value: amount}("");
            if (!success) revert Router__TransferFailed();
        }

        emit FundsWithdrawn(poolId, msg.sender, token, amount);
    }

    ////////////////////////////////////////////////////
    ///////////////// View Functions ///////////////////
    ////////////////////////////////////////////////////

    /// @notice Get user's deposited balance for a pool and token
    function getUserBalance(PoolId poolId, address user, address token) external view returns (uint256) {
        return userDeposits[poolId][user][token];
    }

    /// @notice Receive ETH
    receive() external payable {}
}

