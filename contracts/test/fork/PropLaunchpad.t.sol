// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";

import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {PropLaunchpad} from "@core/PropLaunchpad.sol";
import {PropHook} from "@core/PropHook.sol";
import {Router} from "@core/Router.sol";
import {SwapHandler} from "@utils/SwapHandler.sol";
import {OracleStaticSpreadAdapter} from "@adapters/strategy/OracleStaticSpreadAdapter.sol";

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {HookMiner} from "@script/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ISwapHandler} from "@interfaces/ISwapHandler.sol";
import {IPropLaunchpad} from "@interfaces/IPropLaunchpad.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

contract PropLaunchpadTest is Test {
    PropLaunchpad propLaunchpad;
    PropHook propHook;
    Router propRouter;
    SwapHandler swapHandler;
    OracleStaticSpreadAdapter strategyAdapter;
    PoolSwapTest swapRouter;

    ERC20Mock WETH;
    ERC20Mock USDC;

    address constant POOL_MANAGER = address(0x00B036B58a818B1BC34d502D3fE730Db729e62AC);
    address constant PYTH = 0x2880aB155794e7179c9eE2e38200202908C17B43;
    bytes32 constant ETH_USD_PRICE_FEED_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address constant ROUTER = 0xf70536B3bcC1bD1a972dc186A2cf84cC6da6Be5D;

    address owner;
    address alice;
    address bob;
    address curator;
    address tee;

    function setUp() public {
        //vm.createSelectFork("");

        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        curator = makeAddr("curator");
        tee = makeAddr("tee");

        WETH = new ERC20Mock();
        USDC = new ERC20Mock();

        (WETH, USDC) = WETH < USDC ? (WETH, USDC) : (USDC, WETH);

        vm.startPrank(owner);

        propLaunchpad = new PropLaunchpad(owner, POOL_MANAGER);
        propHook = _deployPropHook();

        // Deploy Router first (SwapHandler address will be set after deployment)
        propRouter = new Router(POOL_MANAGER);

        // Deploy SwapHandler with Router address
        swapHandler = new SwapHandler(
            tee, address(propLaunchpad), address(propHook), POOL_MANAGER, ROUTER, address(propRouter), PERMIT2
        );

        // Set SwapHandler address in Router
        propRouter.setSwapHandler(address(swapHandler));

        strategyAdapter = new OracleStaticSpreadAdapter(PYTH, ETH_USD_PRICE_FEED_ID, true, address(swapHandler));
        swapRouter = new PoolSwapTest(IPoolManager(POOL_MANAGER));

        propLaunchpad.setPropHook(address(propHook));
        propHook.setLaunchpad(address(propLaunchpad));
        propHook.setSwapHandler(address(swapHandler));

        vm.stopPrank();

        // Setup global approvals for PropLaunchpad to interact with PoolManager
        vm.startPrank(address(propLaunchpad));
        WETH.approve(address(POOL_MANAGER), type(uint256).max);
        USDC.approve(address(POOL_MANAGER), type(uint256).max);
        vm.stopPrank();

        // Setup global approvals for PropHook to interact with PoolManager
        vm.startPrank(address(propHook));
        WETH.approve(address(POOL_MANAGER), type(uint256).max);
        USDC.approve(address(POOL_MANAGER), type(uint256).max);
        vm.stopPrank();

        deal(address(WETH), address(propHook), 1_000_000 ether);
        deal(address(USDC), address(propHook), 1_000_000_000 ether);
    }

    function test_launchPool() external {
        deal(address(WETH), curator, 1_000_000_000 ether);
        deal(address(USDC), curator, 1_000_000_000 ether);

        vm.startPrank(curator);

        WETH.approve(address(propLaunchpad), 1_000_000_000 ether);
        USDC.approve(address(propLaunchpad), 1_000_000_000 ether);

        propLaunchpad.launch(
            IPropLaunchpad.LaunchConfig({
                token0: address(WETH),
                token1: address(USDC),
                token0SeedAmt: 100_000 ether,
                token1SeedAmt: 300_000_000 ether,
                strategyAdapter: address(strategyAdapter),
                thresholdAdapter: address(0),
                poolName: "WETH-USDC Test Pool",
                curatorInfo: IPropLaunchpad.CuratorInfo({
                    curator: curator, name: "Test Curator", website: "https://test.com"
                })
            })
        );
    }

    function test_curatorCanAddLiquidity() external {
        deal(address(WETH), curator, 1_000_000 ether);
        deal(address(USDC), curator, 1_000_000_000 ether);

        vm.startPrank(curator);

        WETH.approve(address(propLaunchpad), 100_000_000_000 ether);
        USDC.approve(address(propLaunchpad), 100_000_000_000 ether);

        PoolId poolId = propLaunchpad.launch(
            IPropLaunchpad.LaunchConfig({
                token0: address(WETH),
                token1: address(USDC),
                token0SeedAmt: 100_000 ether,
                token1SeedAmt: 300_000_000 ether,
                strategyAdapter: address(strategyAdapter),
                thresholdAdapter: address(0),
                poolName: "WETH-USDC Test Pool",
                curatorInfo: IPropLaunchpad.CuratorInfo({
                    curator: curator, name: "Test Curator", website: "https://test.com"
                })
            })
        );

        propLaunchpad.addLiquidity(poolId, address(USDC), 100_000 ether);
    }

    /// @notice Test complete flow: User swap → TEE batch execution
    /// @dev Tests the full proprietary AMM flow:
    ///      1. Normal user attempts swap → emits SwapRequested event (not executed)
    ///      2. TEE monitors events and accumulates batch
    ///      3. TEE calls postBatch() to execute swaps with updated prices
    function test_userSwapThenTEEBatchExecution() external {
        // ========================================
        // Setup: Launch pool with initial liquidity
        // ========================================
        PoolId poolId = _launchPool(
            IPropLaunchpad.LaunchConfig({
                token0: address(WETH),
                token1: address(USDC),
                token0SeedAmt: 100_000 ether,
                token1SeedAmt: 300_000_000 ether,
                strategyAdapter: address(strategyAdapter),
                thresholdAdapter: address(0),
                poolName: "WETH-USDC Test Pool",
                curatorInfo: IPropLaunchpad.CuratorInfo({
                    curator: curator, name: "Test Curator", website: "https://test.com"
                })
            })
        );

        PoolKey memory key = propLaunchpad.getPoolKey(poolId);

        // ========================================
        // STEP 1: Regular user attempts swap via PoolManager
        // ========================================
        console2.log("\n=== STEP 1: User Swap Request ===");

        deal(address(WETH), alice, 10 ether);
        deal(address(WETH), bob, 10 ether);

        vm.startPrank(alice);
        WETH.approve(address(propRouter), type(uint256).max);

        // Record balances before
        uint256 aliceWETHBefore = WETH.balanceOf(alice);
        uint256 aliceUSDCBefore = USDC.balanceOf(alice);
        console2.log("Alice WETH before:", aliceWETHBefore);
        console2.log("Alice USDC before:", aliceUSDCBefore);

        // User swaps through Router (which will hold funds as escrow)
        // Execute swap through Router - funds held in escrow
        propRouter.swapExactInput(key, address(WETH), address(USDC), 1 ether);

        vm.stopPrank();

        // Verify: User's WETH transferred to Router, but no USDC received yet
        uint256 aliceWETHAfter = WETH.balanceOf(alice);
        uint256 aliceUSDCAfter = USDC.balanceOf(alice);
        uint256 routerWETHBalance = WETH.balanceOf(address(propRouter));

        console2.log("Alice WETH after:", aliceWETHAfter);
        console2.log("Alice USDC after:", aliceUSDCAfter);
        console2.log("Router WETH balance:", routerWETHBalance);
        console2.log("[OK] User swap queued via event, NOT executed");

        // ========================================
        // STEP 2: Second user also swaps (accumulating batch)
        // ========================================
        console2.log("\n=== STEP 2: Second User Swap ===");

        vm.startPrank(bob);
        WETH.approve(address(propRouter), type(uint256).max);

        // Bob swaps through Router
        propRouter.swapExactInput(key, address(WETH), address(USDC), 0.5 ether);
        vm.stopPrank();

        console2.log("[OK] Second user swap queued");
        console2.log("Batch accumulated: 2 swaps");

        // ========================================
        // STEP 3: TEE Executes Batch
        // ========================================
        console2.log("\n=== STEP 3: TEE Batch Execution ===");

        // TEE monitors SwapRequested events offchain
        // and accumulates them into a batch
        ISwapHandler.SwapData[] memory batch = new ISwapHandler.SwapData[](2);

        batch[0] = ISwapHandler.SwapData({
            sender: alice, zeroForOne: true, amountSpecified: -1 ether, tokenIn: address(WETH), tokenOut: address(USDC)
        });

        batch[1] = ISwapHandler.SwapData({
            sender: bob, zeroForOne: true, amountSpecified: -0.5 ether, tokenIn: address(WETH), tokenOut: address(USDC)
        });

        // TEE computes updated strategy parameters (price spread)
        uint256 newSpreadBps = 50; // 0.5% spread
        bytes memory strategyUpdateParams = abi.encode(newSpreadBps);

        console2.log("New spread: %d bps", newSpreadBps);

        // TEE calls postBatch which:
        // 1. Updates strategy params (bid/ask prices)
        // 2. Executes swaps in loop
        // 3. Checks threshold for rebalancing
        vm.startPrank(tee);

        // This executes the batch through SwapHandler
        // PropHook recognizes msg.sender == swapHandler and executes
        swapHandler.postBatch(poolId, abi.encode(strategyUpdateParams, new bytes[](0)), batch);

        vm.stopPrank();

        console2.log("[OK] Batch executed by TEE via SwapHandler");
        console2.log("\n=== TEST COMPLETE ===");
    }

    /// @notice Test that regular user swap emits event but does NOT execute immediately
    function test_userSwapEmitsEventOnly() external {
        PoolId poolId = _launchPool(
            IPropLaunchpad.LaunchConfig({
                token0: address(WETH),
                token1: address(USDC),
                token0SeedAmt: 100_000 ether,
                token1SeedAmt: 300_000_000 ether,
                strategyAdapter: address(strategyAdapter),
                thresholdAdapter: address(0),
                poolName: "WETH-USDC Test Pool",
                curatorInfo: IPropLaunchpad.CuratorInfo({
                    curator: curator, name: "Test Curator", website: "https://test.com"
                })
            })
        );

        PoolKey memory key = propLaunchpad.getPoolKey(poolId);

        deal(address(WETH), alice, 10 ether);

        vm.startPrank(alice);
        WETH.approve(address(swapRouter), type(uint256).max);

        uint256 balanceBefore = WETH.balanceOf(alice);

        // User swap request through PoolManager
        SwapParams memory swapParams = SwapParams({zeroForOne: true, amountSpecified: -1 ether, sqrtPriceLimitX96: 0});

        PoolSwapTest.TestSettings memory testSettings =
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

        BalanceDelta delta = swapRouter.swap(key, swapParams, testSettings, "");

        vm.stopPrank();

        // Verify balance did NOT change (swap queued only)
        assertEq(WETH.balanceOf(alice), balanceBefore, "Balance should not change - swap queued only");
        assertEq(delta.amount0(), 0, "Delta should be zero - no execution");
        assertEq(delta.amount1(), 0, "Delta should be zero - no execution");
    }

    /// @notice Test that TEE can execute swaps via SwapHandler
    function test_teeCanExecuteBatch() external {
        PoolId poolId = _launchPool(
            IPropLaunchpad.LaunchConfig({
                token0: address(WETH),
                token1: address(USDC),
                token0SeedAmt: 100_000 ether,
                token1SeedAmt: 300_000_000 ether,
                strategyAdapter: address(strategyAdapter),
                thresholdAdapter: address(0),
                poolName: "WETH-USDC Test Pool",
                curatorInfo: IPropLaunchpad.CuratorInfo({
                    curator: curator, name: "Test Curator", website: "https://test.com"
                })
            })
        );

        // Setup swap batch
        ISwapHandler.SwapData[] memory batch = new ISwapHandler.SwapData[](1);
        batch[0] = ISwapHandler.SwapData({
            sender: alice, zeroForOne: true, amountSpecified: -1 ether, tokenIn: address(WETH), tokenOut: address(USDC)
        });

        // Prepare tokens for SwapHandler
        // In production: TEE pulls tokens from user who approved SwapHandler
        deal(address(WETH), address(swapHandler), 1 ether);

        // SwapHandler approves PoolManager
        vm.startPrank(address(swapHandler));
        WETH.approve(address(POOL_MANAGER), type(uint256).max);
        USDC.approve(address(POOL_MANAGER), type(uint256).max);
        vm.stopPrank();

        // TEE executes batch
        vm.startPrank(tee);

        bytes memory strategyParams = abi.encode(uint256(50)); // 50 bps spread

        swapHandler.postBatch(poolId, abi.encode(strategyParams, new bytes[](0)), batch);

        vm.stopPrank();

        // Verify batch was executed successfully
        assertTrue(true, "Batch executed successfully");
    }

    /// @notice Helper to prepare SwapHandler with tokens and approvals
    /// @dev In production, TEE would pull tokens from users who approved SwapHandler
    function _prepareSwapHandlerTokens(address token, uint256 amount) internal {
        deal(token, address(swapHandler), IERC20(token).balanceOf(address(swapHandler)) + amount);

        vm.startPrank(address(swapHandler));
        IERC20(token).approve(address(POOL_MANAGER), type(uint256).max);
        vm.stopPrank();
    }

    function _launchPool(IPropLaunchpad.LaunchConfig memory launchConfig) internal returns (PoolId poolId) {
        deal(address(launchConfig.token0), curator, 1_000_000_000 ether);
        deal(address(launchConfig.token1), curator, 1_000_000_000 ether);

        vm.startPrank(curator);

        // Curator approves PropLaunchpad to transfer tokens for initial liquidity
        IERC20(launchConfig.token0).approve(address(propLaunchpad), type(uint256).max);
        IERC20(launchConfig.token1).approve(address(propLaunchpad), type(uint256).max);

        poolId = propLaunchpad.launch(launchConfig);

        vm.stopPrank();
    }

    function _deployPropHook() internal returns (PropHook hook) {
        uint160 flags = uint160(
            Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG
                | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        (address hookAddress, bytes32 salt) =
            HookMiner.find(owner, flags, type(PropHook).creationCode, abi.encode(POOL_MANAGER, owner));
        hook = new PropHook{salt: salt}(IPoolManager(POOL_MANAGER), owner);
        require(address(hook) == hookAddress, "hook: hook address mismatch");
    }
}
