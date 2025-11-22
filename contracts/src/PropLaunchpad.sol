// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary, toBalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

import {IPropHook} from "@interfaces/IPropHook.sol";

/// @title PropLaunchpad
/// @notice Factory and manager for proposition AMM pools with strategy-based pricing
/// @dev Handles pool creation, liquidity management, and integrates with PropHook
contract PropLaunchpad is Ownable, IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;

    ////////////////////////////////////////////////////
    ////////////////////// Structs /////////////////////
    ////////////////////////////////////////////////////

    /// @notice Configuration for launching a new pool
    struct LaunchConfig {
        address token0;
        address token1;
        uint256 token0SeedAmt;
        uint256 token1SeedAmt;
        uint24 fee;
        address strategyAdapter;
        address thresholdAdapter;
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
        bool isAdd; // true = add liquidity, false = remove liquidity
    }

    /// @notice PoolManager contract instance
    address public immutable POOL_MANAGER;

    ////////////////////////////////////////////////////
    ////////////////////// State ///////////////////////
    ////////////////////////////////////////////////////

    /// @notice PropHook contract instance
    IPropHook public propHook;

    /// @notice Launch configurations by pool ID
    mapping(PoolId => LaunchConfig) public launchConfigs;

    ////////////////////////////////////////////////////
    ////////////////////// Events //////////////////////
    ////////////////////////////////////////////////////

    event PoolLaunched(
        PoolId indexed poolId,
        address indexed token0,
        address indexed token1,
        address strategyAdapter,
        address thresholdAdapter
    );

    event LiquidityAdded(PoolId indexed poolId, address indexed provider, address asset, uint256 amount);

    event LiquidityRemoved(PoolId indexed poolId, address indexed provider, address asset, uint256 amount);

    ////////////////////////////////////////////////////
    ////////////////////// Errors //////////////////////
    ////////////////////////////////////////////////////

    error PropLaunchpad__InvalidTokens();
    error PropLaunchpad__InvalidStrategy();
    error PropLaunchpad__PoolAlreadyExists();
    error PropLaunchpad__PoolNotFound();
    error PropLaunchpad__InvalidAsset();
    error PropLaunchpad__InsufficientAmount();
    error PropLaunchpad__Unauthorized();
    error PropLaunchpad__PropHookAlreadySet();
    error PropLaunchpad__InvalidThresholdAdapter();
    error PropLaunchpad__InvalidStrategyAdapter();
    error PropLaunchpad__InvalidPoolManager();

    ////////////////////////////////////////////////////
    /////////////////// Constructor ////////////////////
    ////////////////////////////////////////////////////

    constructor(address _owner, address _poolManager) Ownable(_owner) {
        if (_poolManager == address(0)) revert PropLaunchpad__InvalidPoolManager();
        POOL_MANAGER = _poolManager;
    }

    ////////////////////////////////////////////////////
    /////////////// External Functions /////////////////
    ////////////////////////////////////////////////////

    function setPropHook(address _propHook) external onlyOwner {
        if (address(propHook) != address(0)) revert PropLaunchpad__PropHookAlreadySet();
        propHook = IPropHook(_propHook);
    }

    /// @notice Launch a new proposition pool with custom strategy
    /// @param _launchConfig Configuration including tokens and adapters
    /// @return poolId The ID of the newly created pool

    function launch(LaunchConfig calldata _launchConfig) external returns (PoolId poolId) {
        _validateLaunchConfig(_launchConfig);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(_launchConfig.token0),
            currency1: Currency.wrap(_launchConfig.token1),
            fee: 0,
            tickSpacing: 60,
            hooks: IHooks(address(propHook))
        });

        poolId = key.toId();

        // Check if pool already exists
        if (launchConfigs[poolId].token0 != address(0)) {
            revert PropLaunchpad__PoolAlreadyExists();
        }

        // Initialize pool in PoolManager
        IPoolManager(POOL_MANAGER).initialize(key, 79228162514264337593543950336); // sqrtPriceX96 for 1:1 price

        // Configure PropHook with strategy and threshold adapters
        propHook.configurePool(key, _launchConfig.strategyAdapter, _launchConfig.thresholdAdapter);

        // Store configuration
        launchConfigs[poolId] = _launchConfig;

        emit PoolLaunched(
            poolId,
            _launchConfig.token0,
            _launchConfig.token1,
            _launchConfig.strategyAdapter,
            _launchConfig.thresholdAdapter
        );
    }

    /// @notice Add single-sided liquidity to a pool
    /// @param poolId The pool ID
    /// @param asset The token to deposit (must be token0 or token1)
    /// @param amount The amount to deposit
    function addLiquidity(PoolId poolId, address asset, uint256 amount) external {
        LaunchConfig memory config = launchConfigs[poolId];
        if (config.token0 == address(0)) revert PropLaunchpad__PoolNotFound();
        if (asset != config.token0 && asset != config.token1) revert PropLaunchpad__InvalidAsset();
        if (amount == 0) revert PropLaunchpad__InsufficientAmount();

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(config.token0),
            currency1: Currency.wrap(config.token1),
            fee: config.fee,
            tickSpacing: 1,
            hooks: IHooks(address(propHook))
        });

        // Transfer tokens from user to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Prepare callback data
        CallbackData memory data =
            CallbackData({sender: msg.sender, key: key, asset: asset, amount: amount, isAdd: true});

        // Execute via unlock callback
        IPoolManager(POOL_MANAGER).unlock(abi.encode(data));

        emit LiquidityAdded(poolId, msg.sender, asset, amount);
    }

    /// @notice Remove liquidity from a pool
    /// @param poolId The pool ID
    /// @param asset The token to withdraw
    /// @param amount The amount to withdraw
    function removeLiquidity(PoolId poolId, address asset, uint256 amount) external {
        LaunchConfig memory config = launchConfigs[poolId];
        if (config.token0 == address(0)) revert PropLaunchpad__PoolNotFound();
        if (asset != config.token0 && asset != config.token1) revert PropLaunchpad__InvalidAsset();
        if (amount == 0) revert PropLaunchpad__InsufficientAmount();

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(config.token0),
            currency1: Currency.wrap(config.token1),
            fee: config.fee,
            tickSpacing: 1,
            hooks: IHooks(address(propHook))
        });

        // Prepare callback data
        CallbackData memory data =
            CallbackData({sender: msg.sender, key: key, asset: asset, amount: amount, isAdd: false});

        // Execute via unlock callback
        IPoolManager(POOL_MANAGER).unlock(abi.encode(data));

        emit LiquidityRemoved(poolId, msg.sender, asset, amount);
    }

    ////////////////////////////////////////////////////
    /////////////// Callback Implementation ////////////
    ////////////////////////////////////////////////////

    /// @notice Unlock callback for pool operations
    /// @param rawData Encoded callback data
    function unlockCallback(bytes calldata rawData) external override returns (bytes memory) {
        if (msg.sender != POOL_MANAGER) revert PropLaunchpad__Unauthorized();

        CallbackData memory data = abi.decode(rawData, (CallbackData));

        if (data.isAdd) {
            // Add liquidity
            _addLiquidityCallback(data);
        } else {
            // Remove liquidity
            _removeLiquidityCallback(data);
        }

        return "";
    }

    ////////////////////////////////////////////////////
    /////////////// Internal Functions /////////////////
    ////////////////////////////////////////////////////

    /// @notice Internal callback for adding liquidity
    function _addLiquidityCallback(CallbackData memory data) internal {
        // Encode hook data with asset and amount
        bytes memory hookData = abi.encode(data.asset, data.amount);

        // Create modify liquidity params (amounts will be overridden by hook)
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: 1e18, // Arbitrary, overridden by hook
            salt: bytes32(0)
        });

        // Modify liquidity
        (BalanceDelta delta,) = IPoolManager(POOL_MANAGER).modifyLiquidity(data.key, params, hookData);

        // Settle balances
        Currency currency = Currency.wrap(data.asset);

        // If delta is negative, we owe tokens to the pool
        if (currency == data.key.currency0) {
            if (delta.amount0() < 0) {
                uint256 amount = uint256(int256(-delta.amount0()));
                // Transfer tokens and settle
                IERC20(data.asset).forceApprove(address(POOL_MANAGER), amount);
                IPoolManager(POOL_MANAGER).sync(currency);
            }
        } else {
            if (delta.amount1() < 0) {
                uint256 amount = uint256(int256(-delta.amount1()));
                IERC20(data.asset).forceApprove(address(POOL_MANAGER), amount);
                IPoolManager(POOL_MANAGER).sync(Currency.wrap(data.asset));
            }
        }
        IPoolManager(POOL_MANAGER).settle();
    }

    /// @notice Internal callback for removing liquidity
    function _removeLiquidityCallback(CallbackData memory data) internal {
        // Encode hook data with asset and amount
        bytes memory hookData = abi.encode(data.asset, data.amount);

        // Create modify liquidity params
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: -1e18, // Negative for removal
            salt: bytes32(0)
        });

        // Modify liquidity
        (BalanceDelta delta,) = IPoolManager(POOL_MANAGER).modifyLiquidity(data.key, params, hookData);

        // Take tokens from pool
        Currency currency = Currency.wrap(data.asset);

        if (currency == data.key.currency0) {
            if (delta.amount0() > 0) {
                uint256 amount = uint256(int256(delta.amount0()));
                IPoolManager(POOL_MANAGER).take(currency, data.sender, amount);
            }
        } else {
            if (delta.amount1() > 0) {
                uint256 amount = uint256(int256(delta.amount1()));
                IPoolManager(POOL_MANAGER).take(currency, data.sender, amount);
            }
        }
    }

    ////////////////////////////////////////////////////
    //////////////// View Functions ////////////////////
    ////////////////////////////////////////////////////

    /// @notice Get launch configuration for a pool
    function getLaunchConfig(PoolId poolId) external view returns (LaunchConfig memory) {
        return launchConfigs[poolId];
    }

    function _validateLaunchConfig(LaunchConfig calldata _launchConfig) internal view {
        if (_launchConfig.token1 == address(0)) {
            revert PropLaunchpad__InvalidTokens();
        }
        if (_launchConfig.token0 >= _launchConfig.token1) {
            revert PropLaunchpad__InvalidTokens();
        }
        if (_launchConfig.strategyAdapter == address(0)) {
            revert PropLaunchpad__InvalidStrategy();
        }
        if (_launchConfig.thresholdAdapter == address(0)) {
            revert PropLaunchpad__InvalidThresholdAdapter();
        }
    }
}
