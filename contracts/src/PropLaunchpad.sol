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
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

import {IPropHook} from "@interfaces/IPropHook.sol";
import {IPropLaunchpad} from "@interfaces/IPropLaunchpad.sol";

/// @title PropLaunchpad
/// @notice Factory and manager for proprietary AMM pools with custom pricing strategies
/// @dev Enables market makers to launch and manage their own proprietary pools with PropHook
contract PropLaunchpad is Ownable, IUnlockCallback, IPropLaunchpad {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;
    using CurrencySettler for Currency;

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

    event PoolLaunched(PoolId indexed poolId, LaunchConfig launchConfig);

    event LiquidityAdded(PoolId indexed poolId, address indexed provider, address asset, uint256 amount);

    event LiquidityRemoved(PoolId indexed poolId, address indexed provider, address asset, uint256 amount);

    ////////////////////////////////////////////////////
    ////////////////////// Errors //////////////////////
    ////////////////////////////////////////////////////

    error PropLaunchpad__InvalidTokens();
    error PropLaunchpad__InvalidStrategy();
    error PropLaunchpad__PoolAlreadyExists();
    error PropLaunchpad__InvalidAsset();
    error PropLaunchpad__InsufficientAmount();
    error PropLaunchpad__Unauthorized();
    error PropLaunchpad__PropHookAlreadySet();
    error PropLaunchpad__InvalidThresholdAdapter();
    error PropLaunchpad__InvalidStrategyAdapter();
    error PropLaunchpad__InvalidPoolManager();

    ////////////////////////////////////////////////////
    ////////////////////// Modifiers ///////////////////
    ////////////////////////////////////////////////////

    modifier onlyCurator(PoolId poolId) {
        _checkCurator(poolId);
        _;
    }

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
            tickSpacing: 1,
            hooks: IHooks(address(propHook))
        });

        poolId = key.toId();

        if (bytes(launchConfigs[poolId].poolName).length != 0) {
            revert PropLaunchpad__PoolAlreadyExists();
        }

        IPoolManager(POOL_MANAGER).initialize(key, 7922816251426433759354395);

        propHook.configurePool(key, _launchConfig.strategyAdapter, _launchConfig.thresholdAdapter);

        launchConfigs[poolId] = _launchConfig;

        addLiquidity(poolId, _launchConfig.token0, _launchConfig.token0SeedAmt);
        addLiquidity(poolId, _launchConfig.token1, _launchConfig.token1SeedAmt);

        emit PoolLaunched(poolId, _launchConfig);
    }

    /// @notice Add liquidity to a pool
    /// @param poolId The pool ID
    /// @param asset The token to deposit (must be token0 or token1)
    /// @param amount The amount to deposit
    function addLiquidity(PoolId poolId, address asset, uint256 amount) public payable onlyCurator(poolId) {
        LaunchConfig memory config = launchConfigs[poolId];

        if (asset != config.token0 && asset != config.token1) revert PropLaunchpad__InvalidAsset();

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(config.token0),
            currency1: Currency.wrap(config.token1),
            fee: 0,
            tickSpacing: 1,
            hooks: IHooks(address(propHook))
        });

        // Transfer tokens from user to this contract
        if (asset != address(0)) {
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        } else {
            if (msg.value != amount) revert PropLaunchpad__InsufficientAmount();
        }

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
    function removeLiquidity(PoolId poolId, address asset, uint256 amount) public onlyCurator(poolId) {
        LaunchConfig memory config = launchConfigs[poolId];

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(config.token0),
            currency1: Currency.wrap(config.token1),
            fee: 0,
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
            _addLiquidityCallback(data);
        } else {
            _removeLiquidityCallback(data);
        }

        return "";
    }

    ////////////////////////////////////////////////////
    /////////////// Internal Functions /////////////////
    ////////////////////////////////////////////////////

    /// @notice Internal callback for adding liquidity
    /// @dev Supports SINGLE-SIDED liquidity: curator provides only ONE asset at a time
    function _addLiquidityCallback(CallbackData memory data) internal {
        Currency.wrap(data.asset).settle(IPoolManager(POOL_MANAGER), address(this), data.amount, false);
        Currency.wrap(data.asset).take(IPoolManager(POOL_MANAGER), address(this), data.amount, true);
    }

    /// @notice Internal callback for removing liquidity
    /// @dev Supports SINGLE-SIDED withdrawal: curator withdraws only ONE asset at a time
    function _removeLiquidityCallback(CallbackData memory data) internal {
        Currency.wrap(data.asset).settle(IPoolManager(POOL_MANAGER), address(this), data.amount, true);
        Currency.wrap(data.asset).take(IPoolManager(POOL_MANAGER), address(this), data.amount, false);
    }

    ////////////////////////////////////////////////////
    //////////////// View Functions ////////////////////
    ////////////////////////////////////////////////////

    /// @notice Get launch configuration for a pool
    function getLaunchConfig(PoolId poolId) external view returns (LaunchConfig memory) {
        return launchConfigs[poolId];
    }

    /// @notice Get the PoolKey for a given PoolId
    /// @param poolId The pool ID
    /// @return key The PoolKey for the pool
    function getPoolKey(PoolId poolId) external view returns (PoolKey memory key) {
        LaunchConfig memory config = launchConfigs[poolId];
        key = PoolKey({
            currency0: Currency.wrap(config.token0),
            currency1: Currency.wrap(config.token1),
            fee: 0,
            tickSpacing: 1,
            hooks: IHooks(address(propHook))
        });
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
    }

    function _checkCurator(PoolId poolId) internal view {
        if (msg.sender != launchConfigs[poolId].curatorInfo.curator) revert PropLaunchpad__Unauthorized();
    }
}
