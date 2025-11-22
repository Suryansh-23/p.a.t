// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary, toBalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary,
    toBeforeSwapDelta
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {BaseStrategyAdapter} from "@adapters/base/BaseStrategyAdapter.sol";
import {BaseThresholdAdapter} from "@adapters/base/BaseThresholdAdapter.sol";

/// @title PropHook - Proprietary AMM with Strategy-Based Pricing
/// @notice Hook enabling market makers to launch proprietary pools with custom pricing strategies
/// @dev Each pool has its own strategy adapter defining proprietary pricing logic
contract PropHook is BaseHook {
    using BalanceDeltaLibrary for BalanceDelta;
    using SafeCast for uint256;
    using PoolIdLibrary for PoolKey;

    ////////////////////////////////////////////////////
    ////////////////////// Structs /////////////////////
    ////////////////////////////////////////////////////

    /// @notice Configuration for each pool
    struct PoolConfig {
        address strategyAdapter; // Adapter defining pricing logic
        address thresholdAdapter; // Adapter defining threshold conditions
        bool initialized; // Whether pool config is set
    }

    /// @notice Pending swap request from user (before TEE batch execution)
    struct PendingSwap {
        address user;
        bool zeroForOne;
        int256 amountSpecified;
        uint256 timestamp;
        bool executed;
    }

    ////////////////////////////////////////////////////
    ////////////////////// State ///////////////////////
    ////////////////////////////////////////////////////

    /// @notice Hook reserves per pool and currency
    mapping(bytes32 => mapping(Currency => uint256)) public hookReserves;

    /// @notice Pool configurations
    mapping(bytes32 => PoolConfig) public poolConfigs;

    /// @notice Authorized launchpad address
    address public launchpad;

    /// @notice Authorized swap handler (TEE)
    address public swapHandler;

    /// @notice Pending swaps by pool and nonce
    mapping(bytes32 => mapping(uint256 => PendingSwap)) public pendingSwaps;

    /// @notice Swap nonce counter per pool
    mapping(bytes32 => uint256) public swapNonce;

    /// @notice Locked tokens per user per pool per currency
    mapping(address => mapping(bytes32 => mapping(Currency => uint256))) public lockedTokens;

    ////////////////////////////////////////////////////
    ////////////////////// Errors //////////////////////
    ////////////////////////////////////////////////////

    error PropHook__InvalidLiquidityAmount();
    error PropHook__InsufficientHookReserves();
    error PropHook__PoolNotConfigured();
    error PropHook__InvalidStrategyAdapter();
    error PropHook__Unauthorized();
    error PropHook__InsufficientReserves();
    error PropHook__SwapHandlerNotSet();

    ////////////////////////////////////////////////////
    ////////////////////// Events //////////////////////
    ////////////////////////////////////////////////////

    event PoolConfigured(PoolId indexed poolId, address strategyAdapter, address thresholdAdapter);
    event LaunchpadSet(address indexed launchpad);
    event SwapHandlerSet(address indexed swapHandler);
    event SwapRequested(
        PoolId indexed poolId,
        address indexed user,
        bool zeroForOne,
        int256 amountSpecified,
        uint256 timestamp,
        uint256 indexed nonce
    );
    event SwapExecutedByTEE(PoolId indexed poolId, bool zeroForOne, int256 amountSpecified, uint256 price);
    event BatchExecuted(PoolId indexed poolId, uint256 swapCount, uint256 timestamp);

    ////////////////////////////////////////////////////
    ////////////////////// Modifiers ///////////////////
    ////////////////////////////////////////////////////

    modifier onlyLaunchpad() {
        if (msg.sender != launchpad) revert PropHook__Unauthorized();
        _;
    }

    modifier onlySwapHandler() {
        if (msg.sender != swapHandler) revert PropHook__Unauthorized();
        _;
    }

    ////////////////////////////////////////////////////
    /////////////////// Constructor ////////////////////
    ////////////////////////////////////////////////////

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    ////////////////////////////////////////////////////
    /////////////// Configuration Functions ////////////
    ////////////////////////////////////////////////////

    /// @notice Set the launchpad address (can only be set once)
    /// @param _launchpad Address of the PropLaunchpad contract
    function setLaunchpad(address _launchpad) external {
        if (launchpad != address(0)) revert PropHook__Unauthorized();
        launchpad = _launchpad;
        emit LaunchpadSet(_launchpad);
    }

    /// @notice Set the swap handler address (can only be set once)
    /// @param _swapHandler Address of the SwapHandler contract (TEE)
    function setSwapHandler(address _swapHandler) external {
        if (swapHandler != address(0)) revert PropHook__Unauthorized();
        swapHandler = _swapHandler;
        emit SwapHandlerSet(_swapHandler);
    }

    /// @notice Configure a pool with strategy and threshold adapters
    /// @dev Called by launchpad when initializing a pool
    /// @param key The pool key
    /// @param strategyAdapter Address of the strategy adapter for pricing
    /// @param thresholdAdapter Address of the threshold adapter for conditions
    function configurePool(PoolKey calldata key, address strategyAdapter, address thresholdAdapter)
        external
        onlyLaunchpad
    {
        bytes32 poolId = PoolId.unwrap(key.toId());

        if (strategyAdapter == address(0)) revert PropHook__InvalidStrategyAdapter();

        poolConfigs[poolId] =
            PoolConfig({strategyAdapter: strategyAdapter, thresholdAdapter: thresholdAdapter, initialized: true});

        emit PoolConfigured(key.toId(), strategyAdapter, thresholdAdapter);
    }

    ////////////////////////////////////////////////////
    /////////////// Hook Permission Setup //////////////
    ////////////////////////////////////////////////////

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: true,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: true,
            afterRemoveLiquidityReturnDelta: true
        });
    }

    function _beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        if (sender != launchpad) revert PropHook__Unauthorized();

        return IHooks.beforeAddLiquidity.selector;
    }

    /// @notice After adding liquidity - override the standard delta to accept single-sided or custom amounts
    /// @dev This is where we bypass the x*y=k curve entirely
    function _afterAddLiquidity(
        address,
        PoolKey calldata key,
        ModifyLiquidityParams calldata,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) internal override returns (bytes4, BalanceDelta) {
        // Decode the desired custom amounts from hookData
        (address asset, uint256 amountDesired) = abi.decode(hookData, (address, uint256));

        // Convert to int128 (negative because user is providing tokens)
        int128 customAmount = -int128(int256(amountDesired));

        BalanceDelta hookBalanceDelta;

        {
            int128 hookDelta;

            if (Currency.wrap(asset) == key.currency0) {
                hookDelta = customAmount - (delta.amount0() - feesAccrued.amount0());
                hookBalanceDelta = toBalanceDelta(hookDelta, 0);
            } else {
                hookDelta = customAmount - (delta.amount1() - feesAccrued.amount1());
                hookBalanceDelta = toBalanceDelta(0, hookDelta);
            }
        }

        hookReserves[PoolId.unwrap(key.toId())][Currency.wrap(asset)] += amountDesired;

        return (IHooks.afterAddLiquidity.selector, hookBalanceDelta);
    }

    /// @notice Before removing liquidity
    function _beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        // hookData should contain the desired withdrawal amounts
        if (sender != launchpad) revert PropHook__Unauthorized();

        return IHooks.beforeRemoveLiquidity.selector;
    }

    /// @notice After removing liquidity - allow custom withdrawal amounts
    function _afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) internal override returns (bytes4, BalanceDelta) {
        // Decode desired withdrawal (address asset, uint256 amount)
        (address asset, uint256 amountDesired) = abi.decode(hookData, (address, uint256));

        bytes32 poolId = PoolId.unwrap(key.toId());
        Currency currency = Currency.wrap(asset);

        // Ensure pool has sufficient reserves
        if (hookReserves[poolId][currency] < amountDesired) revert PropHook__InsufficientHookReserves();

        // Update reserves
        hookReserves[poolId][currency] -= amountDesired;

        // Convert to int128 (positive because user is receiving tokens)
        int128 customAmount = int128(int256(amountDesired));

        BalanceDelta hookBalanceDelta;

        if (currency == key.currency0) {
            int128 hookDelta = customAmount - (delta.amount0() - feesAccrued.amount0());
            hookBalanceDelta = toBalanceDelta(hookDelta, 0);
        } else {
            int128 hookDelta = customAmount - (delta.amount1() - feesAccrued.amount1());
            hookBalanceDelta = toBalanceDelta(0, hookDelta);
        }

        return (IHooks.afterRemoveLiquidity.selector, hookBalanceDelta);
    }

    ////////////////////////////////////////////////////
    ////////////////// View Functions //////////////////
    ////////////////////////////////////////////////////

    /// @notice Get pool configuration
    function getPoolConfig(PoolKey calldata key) external view returns (PoolConfig memory) {
        return poolConfigs[PoolId.unwrap(key.toId())];
    }

    /// @notice Get current reserves for a pool
    function getPoolReserves(PoolKey calldata key) external view returns (uint256 reserve0, uint256 reserve1) {
        bytes32 poolId = PoolId.unwrap(key.toId());
        reserve0 = hookReserves[poolId][key.currency0];
        reserve1 = hookReserves[poolId][key.currency1];
    }

    /// @notice Get current price from strategy adapter
    /// @param key The pool key
    /// @return price The current price (scaled by 1e18)
    function getCurrentPrice(PoolKey calldata key) external returns (uint256 price) {
        bytes32 poolId = PoolId.unwrap(key.toId());
        PoolConfig memory config = poolConfigs[poolId];

        if (!config.initialized) revert PropHook__PoolNotConfigured();

        uint256 reserve0 = hookReserves[poolId][key.currency0];
        uint256 reserve1 = hookReserves[poolId][key.currency1];

        price = BaseStrategyAdapter(config.strategyAdapter)
            .price(
                abi.encode(reserve0, reserve1, true) // true = zeroForOne for price quote
            );
    }

    /// @notice Check if threshold is reached for a pool
    function isThresholdReached(PoolKey calldata key) external returns (bool) {
        bytes32 poolId = PoolId.unwrap(key.toId());
        PoolConfig memory config = poolConfigs[poolId];

        if (config.thresholdAdapter == address(0)) return false;

        uint256 reserve0 = hookReserves[poolId][key.currency0];
        uint256 reserve1 = hookReserves[poolId][key.currency1];

        return BaseThresholdAdapter(config.thresholdAdapter).theresholdReached(abi.encode(reserve0, reserve1));
    }

    /// @notice Get pending swap details
    function getPendingSwap(PoolKey calldata key, uint256 nonce) external view returns (PendingSwap memory) {
        bytes32 poolId = PoolId.unwrap(key.toId());
        return pendingSwaps[poolId][nonce];
    }

    /// @notice Get current swap nonce for a pool
    function getCurrentNonce(PoolKey calldata key) external view returns (uint256) {
        bytes32 poolId = PoolId.unwrap(key.toId());
        return swapNonce[poolId];
    }

    ////////////////////////////////////////////////////
    ///////////// SwapHandler Functions ////////////////
    ////////////////////////////////////////////////////

    /// @notice Mark swaps as executed (called by SwapHandler after batch execution)
    /// @dev Only SwapHandler can call this
    function markSwapsExecuted(PoolKey calldata key, uint256[] calldata nonces) external onlySwapHandler {
        bytes32 poolId = PoolId.unwrap(key.toId());

        for (uint256 i = 0; i < nonces.length; i++) {
            pendingSwaps[poolId][nonces[i]].executed = true;
        }

        emit BatchExecuted(key.toId(), nonces.length, block.timestamp);
    }

    /// @notice Update strategy adapter parameters (called by SwapHandler)
    /// @dev Only SwapHandler can call this to update pricing
    function updateStrategyParams(PoolKey calldata key, bytes calldata params) external onlySwapHandler {
        bytes32 poolId = PoolId.unwrap(key.toId());
        PoolConfig memory config = poolConfigs[poolId];

        if (!config.initialized) revert PropHook__PoolNotConfigured();

        // Update strategy parameters
        BaseStrategyAdapter(config.strategyAdapter).update(params);
    }

    /// @notice Before swap - handles both user requests and TEE batch execution
    /// @dev Regular users: swap request queued for TEE batch
    ///      SwapHandler: swap executes immediately
    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        bytes32 poolId = PoolId.unwrap(key.toId());
        PoolConfig memory config = poolConfigs[poolId];

        // Ensure pool is configured
        if (!config.initialized) revert PropHook__PoolNotConfigured();

        // Check if caller is authorized SwapHandler (TEE)
        if (sender == swapHandler) {
            // TEE batch execution - execute swap normally
            return _executeSwapForTEE(poolId, key, config, params);
        } else {
            // Regular user - queue swap request for TEE batch
            return _queueUserSwap(poolId, key, sender, params);
        }
    }

    /// @notice Execute swap for TEE batch (authorized caller)
    function _executeSwapForTEE(
        bytes32 poolId,
        PoolKey calldata key,
        PoolConfig memory config,
        SwapParams calldata params
    ) internal returns (bytes4, BeforeSwapDelta, uint24) {
        // Get current reserves
        uint256 reserve0 = hookReserves[poolId][key.currency0];
        uint256 reserve1 = hookReserves[poolId][key.currency1];

        // Get price from strategy adapter
        uint256 price =
            BaseStrategyAdapter(config.strategyAdapter).price(abi.encode(reserve0, reserve1, params.zeroForOne));

        // Calculate swap amounts based on strategy price
        BeforeSwapDelta beforeSwapDelta =
            _calculateSwapDelta(params.amountSpecified, params.zeroForOne, price, reserve0, reserve1);

        // Update reserves based on the swap
        _updateReservesFromSwap(poolId, key, params, beforeSwapDelta);

        emit SwapExecutedByTEE(key.toId(), params.zeroForOne, params.amountSpecified, price);

        return (IHooks.beforeSwap.selector, beforeSwapDelta, 0);
    }

    /// @notice Queue user swap request for TEE batch processing
    function _queueUserSwap(bytes32 poolId, PoolKey calldata key, address user, SwapParams calldata params)
        internal
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Get next nonce
        uint256 nonce = swapNonce[poolId]++;

        // Store pending swap
        pendingSwaps[poolId][nonce] = PendingSwap({
            user: user,
            zeroForOne: params.zeroForOne,
            amountSpecified: params.amountSpecified,
            timestamp: block.timestamp,
            executed: false
        });

        // Emit event for TEE to catch
        emit SwapRequested(key.toId(), user, params.zeroForOne, params.amountSpecified, block.timestamp, nonce);

        // Return zero delta - swap will NOT execute now
        // TEE will execute it later in batch
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice Calculate swap delta based on strategy price
    /// @param amountSpecified The amount specified by the user (negative for exact input, positive for exact output)
    /// @param zeroForOne Direction of the swap
    /// @param price The price from strategy adapter (scaled by 1e18)
    /// @param reserve0 Current reserve of token0
    /// @param reserve1 Current reserve of token1
    /// @return delta The calculated before swap delta
    function _calculateSwapDelta(
        int256 amountSpecified,
        bool zeroForOne,
        uint256 price,
        uint256 reserve0,
        uint256 reserve1
    ) internal pure returns (BeforeSwapDelta delta) {
        if (amountSpecified == 0) return BeforeSwapDeltaLibrary.ZERO_DELTA;

        int128 specifiedDelta;
        int128 unspecifiedDelta;

        // Exact input (negative amountSpecified)
        if (amountSpecified < 0) {
            uint256 amountIn = uint256(-amountSpecified);
            uint256 amountOut;

            if (zeroForOne) {
                // Selling token0 for token1
                // amountOut = amountIn * price / 1e18
                amountOut = (amountIn * price) / 1e18;

                // Check sufficient reserves
                if (amountOut > reserve1) {
                    amountOut = reserve1; // Cap at available reserves
                }

                specifiedDelta = int128(int256(amountIn)); // Hook takes token0
                unspecifiedDelta = -int128(int256(amountOut)); // Hook gives token1
            } else {
                // Selling token1 for token0
                // amountOut = amountIn * 1e18 / price
                amountOut = (amountIn * 1e18) / price;

                if (amountOut > reserve0) {
                    amountOut = reserve0;
                }

                specifiedDelta = int128(int256(amountIn)); // Hook takes token1
                unspecifiedDelta = -int128(int256(amountOut)); // Hook gives token0
            }
        }
        // Exact output (positive amountSpecified)
        else {
            uint256 amountOut = uint256(amountSpecified);
            uint256 amountIn;

            if (zeroForOne) {
                // Want exact token1 out, calculate token0 in
                // amountIn = amountOut * 1e18 / price
                amountIn = (amountOut * 1e18) / price;

                specifiedDelta = -int128(int256(amountOut)); // Hook gives token1
                unspecifiedDelta = int128(int256(amountIn)); // Hook takes token0
            } else {
                // Want exact token0 out, calculate token1 in
                // amountIn = amountOut * price / 1e18
                amountIn = (amountOut * price) / 1e18;

                specifiedDelta = -int128(int256(amountOut)); // Hook gives token0
                unspecifiedDelta = int128(int256(amountIn)); // Hook takes token1
            }
        }

        return toBeforeSwapDelta(specifiedDelta, unspecifiedDelta);
    }

    /// @notice Update reserves after a swap
    function _updateReservesFromSwap(
        bytes32 poolId,
        PoolKey calldata key,
        SwapParams calldata params,
        BeforeSwapDelta delta
    ) internal {
        int128 amount0Delta;
        int128 amount1Delta;

        if (params.zeroForOne) {
            // Swapping token0 for token1
            if (params.amountSpecified < 0) {
                // Exact input
                amount0Delta = BeforeSwapDeltaLibrary.getSpecifiedDelta(delta);
                amount1Delta = BeforeSwapDeltaLibrary.getUnspecifiedDelta(delta);
            } else {
                // Exact output
                amount0Delta = BeforeSwapDeltaLibrary.getUnspecifiedDelta(delta);
                amount1Delta = BeforeSwapDeltaLibrary.getSpecifiedDelta(delta);
            }
        } else {
            // Swapping token1 for token0
            if (params.amountSpecified < 0) {
                // Exact input
                amount1Delta = BeforeSwapDeltaLibrary.getSpecifiedDelta(delta);
                amount0Delta = BeforeSwapDeltaLibrary.getUnspecifiedDelta(delta);
            } else {
                // Exact output
                amount1Delta = BeforeSwapDeltaLibrary.getUnspecifiedDelta(delta);
                amount0Delta = BeforeSwapDeltaLibrary.getSpecifiedDelta(delta);
            }
        }

        // Update reserves
        if (amount0Delta > 0) {
            hookReserves[poolId][key.currency0] += uint256(int256(amount0Delta));
        } else if (amount0Delta < 0) {
            uint256 amount = uint256(int256(-amount0Delta));
            if (hookReserves[poolId][key.currency0] < amount) revert PropHook__InsufficientReserves();
            hookReserves[poolId][key.currency0] -= amount;
        }

        if (amount1Delta > 0) {
            hookReserves[poolId][key.currency1] += uint256(int256(amount1Delta));
        } else if (amount1Delta < 0) {
            uint256 amount = uint256(int256(-amount1Delta));
            if (hookReserves[poolId][key.currency1] < amount) revert PropHook__InsufficientReserves();
            hookReserves[poolId][key.currency1] -= amount;
        }
    }
}
