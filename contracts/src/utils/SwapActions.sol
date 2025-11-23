pragma solidity 0.8.30;
// SPDX-License-Identifier: MIT

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {TransientSlot} from "@openzeppelin/contracts/utils/TransientSlot.sol";

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";

import {Commands} from "@uniswap/universal-router/libraries/Commands.sol";

import {IPermit2} from "@uniswap/permit2/src/interfaces/IPermit2.sol";

import {IUniversalRouter} from "@uniswap/universal-router/interfaces/IUniversalRouter.sol";

import {ISwapHandler} from "@interfaces/ISwapHandler.sol";

/// @title SwapActions
/// @notice A contract that facilitates token swapping on Uniswap V4 with slippage management.
/// @dev Uses Universal Router and Truncated Oracle hook for swap actions and TWAP calculations.
contract SwapActions is ReentrancyGuardTransient {
    using TransientSlot for *;
    using SafeCast for uint256;
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IUniversalRouter immutable router;
    IPermit2 immutable PERMIT2;
    IPoolManager immutable poolManager;

    address constant ZERO_ADDRESS = address(0);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _router, address _poolManager, address _permit2) {
        router = IUniversalRouter(_router);
        poolManager = IPoolManager(_poolManager);
        PERMIT2 = IPermit2(_permit2);
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/
    receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/
    /// @notice Execute exact input swap via Universal Router
    /// @dev amountSpecified should be NEGATIVE for exact input (Uniswap V4 convention)
    function _swapExactInputV4(ISwapHandler.SwapData memory swapData, PoolKey memory key)
        internal
        returns (uint256 amountReceived)
    {
        address tokenIn = swapData.tokenIn;
        address tokenOut = swapData.tokenOut;

        // For exact input, amountSpecified is negative, get absolute value
        uint256 amountIn =
            swapData.amountSpecified < 0 ? uint256(-swapData.amountSpecified) : uint256(swapData.amountSpecified);

        bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
        bytes[] memory params = new bytes[](3);

        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: tokenIn == Currency.unwrap(key.currency0) ? true : false,
                amountIn: uint128(amountIn),
                amountOutMinimum: 0,
                hookData: ""
            })
        );

        // Second parameter: specify input tokens for the swap (absolute value)
        params[1] = abi.encode(tokenIn, amountIn);

        // Third parameter: specify output tokens from the swap
        params[2] = abi.encode(tokenOut, 0); // We check the slippage after the swap

        // Combine actions and params into inputs
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            abi.encodePacked(uint8(Actions.SWAP_EXACT_IN_SINGLE), uint8(Actions.SETTLE_ALL), uint8(Actions.TAKE_ALL)),
            params
        );

        if (tokenIn != ZERO_ADDRESS) {
            // Approve the token for the swap (absolute value)
            IERC20(tokenIn).safeIncreaseAllowance(address(PERMIT2), amountIn);
            PERMIT2.approve(tokenIn, address(router), uint160(amountIn), uint48(block.timestamp + 10000));
        }

        // Execute the swap (use absolute value for msg.value)
        router.execute{value: tokenIn == ZERO_ADDRESS ? amountIn : 0}(commands, inputs, block.timestamp + 10000);

        amountReceived = IERC20(tokenOut).balanceOf(address(this));
    }

    /// @notice Execute exact input swap directly via PoolManager (must be called within unlock)
    /// @dev amountSpecified should be NEGATIVE for exact input (Uniswap V4 convention)
    function _swapExactInputUnlockedV4(ISwapHandler.SwapData memory swapData, PoolKey memory key)
        internal
        returns (uint256 amountReceived)
    {
        address tokenIn = swapData.tokenIn;
        address tokenOut = swapData.tokenOut;

        amountReceived = _getBalance(tokenOut);

        bool zeroForOne = tokenIn == Currency.unwrap(key.currency0);

        // For exact input, amountSpecified should already be negative
        // If it's positive, make it negative
        int256 amountSpecified = swapData.amountSpecified < 0 ? swapData.amountSpecified : -swapData.amountSpecified;

        BalanceDelta swapDelta = poolManager.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amountSpecified,
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            abi.encode(swapData.sender)
        );

        // Get absolute amount for token transfers (always positive)
        uint256 amountIn =
            swapData.amountSpecified < 0 ? uint256(-swapData.amountSpecified) : uint256(swapData.amountSpecified);

        // We cannot account for the fee on transfer here
        uint256 amountToTake = uint256(int256(zeroForOne ? swapDelta.amount1() : swapDelta.amount0()));

        amountReceived = _getBalance(tokenOut) - amountReceived;
    }

    /// @notice Gets the balance for the token
    /// @param _token The token to get the balance for
    function _getBalance(address _token) internal view returns (uint256 balance) {
        if (_token == address(0)) {
            balance = address(this).balance;
        } else {
            balance = IERC20(_token).balanceOf(address(this));
        }
    }
}
