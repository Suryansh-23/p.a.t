/**
 * Swap Simulator Service
 * Generates realistic swap activity by executing swaps at random intervals
 */

import { parseEther, type Hash } from "viem";
import { Web3Client } from "../clients/web3Client.js";
import { swapRouterAbi } from "../abi/swapRouter.js";
import type { SwapConfig, SwapStats, SwapResult } from "../types/swap.js";
import { logger, networkLogger } from "../logger.js";

export class SwapSimulator {
  private web3Client: Web3Client;
  private config: SwapConfig;
  private stats: SwapStats;
  private timer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(web3Client: Web3Client, config: SwapConfig) {
    this.web3Client = web3Client;
    this.config = config;
    this.stats = {
      totalSwaps: 0,
      successfulSwaps: 0,
      failedSwaps: 0,
      totalVolumeWeth: "0",
    };
  }

  /**
   * Start generating swaps at random intervals
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info("Swap simulator is disabled in configuration");
      return;
    }

    if (!this.web3Client.hasWallet()) {
      logger.warn("Swap simulator requires a private key to be configured");
      return;
    }

    if (this.isRunning) {
      logger.warn("Swap simulator is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting swap simulator");
    this.scheduleNextSwap();
  }

  /**
   * Stop generating swaps
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.isRunning = false;
    logger.info("Stopped swap simulator");
  }

  /**
   * Get current swap statistics
   */
  getStats(): SwapStats {
    return { ...this.stats };
  }

  /**
   * Schedule the next swap at a random interval
   */
  private scheduleNextSwap(): void {
    if (!this.isRunning) return;

    const interval = this.getRandomInterval();
    this.timer = setTimeout(() => {
      this.executeSwap().then(() => {
        this.scheduleNextSwap();
      });
    }, interval);
  }

  /**
   * Execute a single swap transaction
   */
  private async executeSwap(): Promise<void> {
    const amount = this.getRandomAmount();
    const amountWei = parseEther(amount.toString());

    networkLogger.info(
      {
        amount: amount.toString(),
        amountWei: amountWei.toString(),
      },
      "SwapSimulator: Executing swap"
    );

    try {
      const result = await this.sendSwapTransaction(amountWei);

      if (result.success) {
        this.stats.successfulSwaps++;
        this.stats.totalVolumeWeth = (
          parseFloat(this.stats.totalVolumeWeth) + amount
        ).toFixed(4);
        networkLogger.success(
          {
            txHash: result.txHash,
            amount: result.amount,
          },
          "SwapSimulator: Swap executed successfully"
        );
      } else {
        this.stats.failedSwaps++;
        networkLogger.error(
          {
            error: result.error,
            amount: result.amount,
          },
          "SwapSimulator: Swap failed"
        );
      }

      this.stats.totalSwaps++;
      this.stats.lastSwapTime = new Date();
      this.stats.lastSwapAmount = result.amount;
      this.stats.lastSwapSuccess = result.success;
    } catch (error) {
      this.stats.failedSwaps++;
      this.stats.totalSwaps++;
      networkLogger.error(
        { error },
        "SwapSimulator: Unexpected error during swap execution"
      );
    }
  }

  /**
   * Send the swap transaction to the blockchain
   */
  private async sendSwapTransaction(amountWei: bigint): Promise<SwapResult> {
    const walletClient = this.web3Client.getWalletClient();
    const account = this.web3Client.getAccount();

    if (!walletClient || !account) {
      return {
        success: false,
        amount: (Number(amountWei) / 1e18).toFixed(4),
        error: "No wallet configured",
      };
    }

    try {
      // Construct PoolKey struct
      const poolKey = {
        currency0: this.config.wethAddress as `0x${string}`,
        currency1: this.config.usdcAddress as `0x${string}`,
        fee: 0,
        tickSpacing: 1,
        hooks: this.config.hookAddress as `0x${string}`,
      };

      // Execute the swap (no native ETH needed - WETH allowance already granted)
      const hash: Hash = await walletClient.writeContract({
        address: this.config.routerAddress as `0x${string}`,
        abi: swapRouterAbi,
        functionName: "swapExactInput",
        args: [
          poolKey,
          this.config.wethAddress as `0x${string}`,
          this.config.usdcAddress as `0x${string}`,
          amountWei,
        ],
        chain: null, // Use wallet client's configured chain
        account: account, // Explicitly pass account
      });

      return {
        success: true,
        txHash: hash,
        amount: (Number(amountWei) / 1e18).toFixed(4),
      };
    } catch (error: any) {
      return {
        success: false,
        amount: (Number(amountWei) / 1e18).toFixed(4),
        error: error.message || String(error),
      };
    }
  }

  /**
   * Generate a random swap amount between min and max
   */
  private getRandomAmount(): number {
    const min = this.config.minAmount;
    const max = this.config.maxAmount;
    return Math.random() * (max - min) + min;
  }

  /**
   * Generate a random interval between swaps (Poisson-like distribution)
   */
  private getRandomInterval(): number {
    const min = this.config.minInterval;
    const max = this.config.maxInterval;
    // Use exponential distribution for more realistic timing
    const lambda = 1 / ((min + max) / 2);
    const u = Math.random();
    const interval = -Math.log(1 - u) / lambda;
    // Clamp to min/max bounds
    return Math.max(min, Math.min(max, interval));
  }
}
