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
import {BaseThresholdAdapter} from "@adapters/base/BaseThresholdAdapter.sol";

/// @title SwapHandler
/// @notice Handles batched swap execution from TEE for proprietary AMM pools
/// @dev Receives swap batches from TEE, updates proprietary pricing params, executes swaps, checks threshold
contract SwapHandler is IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;

    ////////////////////////////////////////////////////
    ////////////////////// Structs /////////////////////
    ////////////////////////////////////////////////////

    /// @notice Individual swap data from TEE
    struct SwapData {
        address user; // User who requested the swap
        bool zeroForOne; // Swap direction
        int256 amountSpecified; // Amount to swap
        uint256 nonce; // Nonce of the pending swap
    }

    /// @notice Callback data for unlock pattern
    struct CallbackData {
        PoolKey key;
        SwapData[] swaps;
    }

    ////////////////////////////////////////////////////
    ////////////////////// State ///////////////////////
    ////////////////////////////////////////////////////

    /// @notice TEE address (authorized to post batches)
    address public immutable TEE;

    /// @notice PropHook contract
    PropHook public immutable propHook;

    /// @notice PoolManager contract
    IPoolManager public immutable poolManager;

    /// @notice Pool keys by pool ID
    mapping(PoolId => PoolKey) public poolKeys;

    ////////////////////////////////////////////////////
    ////////////////////// Events //////////////////////
    ////////////////////////////////////////////////////

    event BatchPosted(PoolId indexed poolId, uint256 swapCount, uint256 timestamp);
    event SwapExecutedInBatch(PoolId indexed poolId, address indexed user, uint256 indexed nonce);
    event SwapFailedInBatch(PoolId indexed poolId, uint256 indexed nonce, string reason);
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

    constructor(address tee, address _propHook, address _poolManager) {
        require(tee != address(0), "Invalid TEE address");
        require(_propHook != address(0), "Invalid PropHook address");
        require(_poolManager != address(0), "Invalid PoolManager address");

        TEE = tee;
        propHook = PropHook(_propHook);
        poolManager = IPoolManager(_poolManager);
    }

    ////////////////////////////////////////////////////
    ////////////////////// Modifiers ///////////////////
    ////////////////////////////////////////////////////

    modifier onlyTEE() {
        if (msg.sender != TEE) revert SwapHandler__Unauthorized();
        _;
    }

    ////////////////////////////////////////////////////
    /////////////// External Functions /////////////////
    ////////////////////////////////////////////////////

    /// @notice Register a pool key for easier lookup
    /// @param poolId The pool ID
    /// @param key The pool key
    function registerPool(PoolId poolId, PoolKey calldata key) external {
        poolKeys[poolId] = key;
    }

    /// @notice Post a batch of swaps from TEE
    /// @dev This is the main entry point called by TEE after accumulating swap requests
    /// @param poolId The pool ID to execute swaps on
    /// @param strategyUpdateParams Parameters to update the strategy adapter (new bid/ask prices)
    /// @param swaps Array of swap data to execute
    function postBatch(PoolId poolId, bytes calldata strategyUpdateParams, SwapData[] calldata swaps) external onlyTEE {
        if (swaps.length == 0) revert SwapHandler__InvalidSwapData();

        PoolKey memory key = poolKeys[poolId];
        if (Currency.unwrap(key.currency0) == address(0)) revert SwapHandler__PoolNotRegistered();

        // Step 1: Update strategy parameters (bid/ask prices from TEE)
        if (strategyUpdateParams.length > 0) {
            propHook.updateStrategyParams(key, strategyUpdateParams);
            emit StrategyUpdated(poolId, strategyUpdateParams);
        }

        // Step 2: Execute swaps in batch via unlock callback
        CallbackData memory data = CallbackData({key: key, swaps: swaps});
        poolManager.unlock(abi.encode(data));

        // Step 3: Mark swaps as executed
        uint256[] memory nonces = new uint256[](swaps.length);
        for (uint256 i = 0; i < swaps.length; i++) {
            nonces[i] = swaps[i].nonce;
        }
        propHook.markSwapsExecuted(key, nonces);

        // Step 4: Check if rebalancing is needed
        if (propHook.isThresholdReached(key)) {
            _triggerRebalancing(key);
        }

        emit BatchPosted(poolId, swaps.length, block.timestamp);
    }

    /// @notice Unlock callback for executing swaps
    /// @param rawData Encoded CallbackData
    function unlockCallback(bytes calldata rawData) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert SwapHandler__Unauthorized();

        CallbackData memory data = abi.decode(rawData, (CallbackData));

        // Execute each swap in the batch
        for (uint256 i = 0; i < data.swaps.length; i++) {
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
        // Prepare swap params
        SwapParams memory params = SwapParams({
            zeroForOne: swapData.zeroForOne, amountSpecified: swapData.amountSpecified, sqrtPriceLimitX96: 0
        });

        try poolManager.swap(key, params, "") {
            // Swap successful
            emit SwapExecutedInBatch(key.toId(), swapData.user, swapData.nonce);
        } catch Error(string memory reason) {
            // Swap failed - log but continue with batch
            emit SwapFailedInBatch(key.toId(), swapData.nonce, reason);
        } catch {
            // Unknown error
            emit SwapFailedInBatch(key.toId(), swapData.nonce, "Unknown error");
        }
    }

    /// @notice Trigger rebalancing logic when threshold is reached
    /// @param key The pool key
    function _triggerRebalancing(PoolKey memory key) internal {
        // Get current reserves
        (uint256 reserve0, uint256 reserve1) = propHook.getPoolReserves(key);

        // TODO: Implement your rebalancing logic here
        // Options:
        // 1. Adjust internal reserves
        // 2. Call external liquidity providers
        // 3. Update strategy parameters more aggressively
        // 4. Notify TEE to adjust bid/ask spread

        emit RebalancingTriggered(key.toId(), block.timestamp);
    }

    ////////////////////////////////////////////////////
    //////////////// View Functions ////////////////////
    ////////////////////////////////////////////////////

    /// @notice Get pool key for a pool ID
    function getPoolKey(PoolId poolId) external view returns (PoolKey memory) {
        return poolKeys[poolId];
    }
}
