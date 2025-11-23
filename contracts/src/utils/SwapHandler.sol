// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {PropHook} from "@core/PropHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

import {SwapActions} from "@utils/SwapActions.sol";

import {BaseThresholdAdapter} from "@adapters/base/BaseThresholdAdapter.sol";
import {ISwapHandler} from "@interfaces/ISwapHandler.sol";
import {IPropLaunchpad} from "@interfaces/IPropLaunchpad.sol";
import {IThresholdAdapter} from "@interfaces/IThresholdAdapter.sol";
import {IStrategyAdapter} from "@interfaces/IStrategyAdapter.sol";
import {IPropHook} from "@interfaces/IPropHook.sol";
import {IRouter} from "@interfaces/IRouter.sol";

/// @title SwapHandler
/// @notice Handles batched swap execution from TEE for proprietary AMM pools
/// @dev Receives swap batches from TEE, updates proprietary pricing params, executes swaps, checks threshold
contract SwapHandler is SwapActions, IUnlockCallback, ISwapHandler {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;

    ////////////////////////////////////////////////////
    ////////////////////// State ///////////////////////
    ////////////////////////////////////////////////////

    /// @notice TEE address (authorized to post batches)
    address public TEE;

    /// @notice Router contract (holds user funds)
    address public immutable propRouter;

    /// @notice PropHook contract
    IPropLaunchpad public immutable propLaunchpad;

    /// @notice PropHook contract
    IPropHook public immutable propHook;

    ////////////////////////////////////////////////////
    ////////////////////// Events //////////////////////
    ////////////////////////////////////////////////////

    event BatchPosted(PoolId indexed poolId, uint256 swapCount, uint256 timestamp);
    event SwapExecutedInBatch(PoolId indexed poolId, address indexed sender);
    event StrategyUpdated(PoolId indexed poolId, bytes params);
    event RebalancingTriggered(PoolId indexed poolId, uint256 timestamp);

    ////////////////////////////////////////////////////
    ////////////////////// Errors //////////////////////
    ////////////////////////////////////////////////////

    error SwapHandler__Unauthorized();
    error SwapHandler__PoolNotRegistered();
    error SwapHandler__InvalidSwapData();

    ////////////////////////////////////////////////////
    /////////////////// Constructor ////////////////////
    ////////////////////////////////////////////////////

    constructor(
        address _tee,
        address _propLaunchpad,
        address _propHook,
        address _poolManager,
        address _universalRouter,
        address _propRouter,
        address _permit2
    ) SwapActions(_universalRouter, _poolManager, _permit2) {
        require(_propLaunchpad != address(0), "Invalid PropLaunchpad address");
        require(_poolManager != address(0), "Invalid PoolManager address");
        require(_propRouter != address(0), "Invalid Router address");

        TEE = _tee;
        propRouter = _propRouter;
        propHook = IPropHook(_propHook);
        poolManager = IPoolManager(_poolManager);
        propLaunchpad = IPropLaunchpad(_propLaunchpad);
    }

    ////////////////////////////////////////////////////
    ////////////////////// Modifiers ///////////////////
    ////////////////////////////////////////////////////

    modifier onlyTEE() {
        _checkTEE();
        _;
    }

    ////////////////////////////////////////////////////
    /////////////// External Functions /////////////////
    ////////////////////////////////////////////////////

    function setTEE(address _tee) external {
        TEE = _tee;
    }

    /// @notice Post a batch of swaps from TEE
    /// @dev This is the main entry point called by TEE after accumulating swap requests
    /// @param poolId The pool ID to execute swaps on
    /// @param strategyUpdateParams Parameters to update the strategy adapter (new bid/ask prices)
    /// @param swaps Array of swap data to execute
    function postBatch(PoolId poolId, bytes calldata strategyUpdateParams, SwapData[] calldata swaps) external onlyTEE {
        if (swaps.length == 0) revert SwapHandler__InvalidSwapData();

        IPropLaunchpad.LaunchConfig memory config = propLaunchpad.getLaunchConfig(poolId);

        if (bytes(config.poolName).length == 0) revert SwapHandler__PoolNotRegistered();

        (bytes memory strategyParams, bytes[] memory priceUpdate) = abi.decode(strategyUpdateParams, (bytes, bytes[]));

        if (strategyParams.length > 0) {
            IStrategyAdapter(propLaunchpad.getLaunchConfig(poolId).strategyAdapter).update(strategyParams, priceUpdate);
            emit StrategyUpdated(poolId, strategyUpdateParams);
        }

        CallbackData memory data = CallbackData({
            key: PoolKey({
                currency0: Currency.wrap(config.token0),
                currency1: Currency.wrap(config.token1),
                fee: 0,
                tickSpacing: 1,
                hooks: IHooks(address(propHook))
            }),
            swaps: swaps
        });
        poolManager.unlock(abi.encode(data));

        emit BatchPosted(poolId, swaps.length, block.timestamp);
    }

    /// @notice Unlock callback for executing swaps
    /// @param rawData Encoded CallbackData
    function unlockCallback(bytes calldata rawData) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert SwapHandler__Unauthorized();

        CallbackData memory data = abi.decode(rawData, (CallbackData));

        // Execute each swap in the batch
        for (uint256 i; i < data.swaps.length; ++i) {
            _executeSwap(data.key, data.swaps[i]);
        }

        return "";
    }

    ////////////////////////////////////////////////////
    /////////////// Internal Functions /////////////////
    ////////////////////////////////////////////////////

    /// @notice Execute a single swap from the batch
    /// @param key The pool key
    /// @param swapData The swap data
    function _executeSwap(PoolKey memory key, SwapData memory swapData) internal {
        // Pull funds from Router
        // Get absolute amount for exact input (amountSpecified is negative)
        uint256 amountIn =
            swapData.amountSpecified < 0 ? uint256(-swapData.amountSpecified) : uint256(swapData.amountSpecified);

        // Pull funds from Router to this contract
        IRouter(propRouter).pullFunds(key.toId(), swapData.sender, swapData.tokenIn, amountIn);

        // Execute swap
        _swapExactInputUnlockedV4(swapData, key);

        // Swap successful
        emit SwapExecutedInBatch(key.toId(), swapData.sender);
    }

    function _checkTEE() internal view {
        if (msg.sender != TEE) revert SwapHandler__Unauthorized();
    }
}
