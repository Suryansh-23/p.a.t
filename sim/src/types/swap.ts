/**
 * Swap-related type definitions
 */

export interface SwapStats {
  totalSwaps: number;
  successfulSwaps: number;
  failedSwaps: number;
  totalVolumeWeth: string;
  lastSwapTime?: Date;
  lastSwapAmount?: string;
  lastSwapSuccess?: boolean;
}

export interface SwapConfig {
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  minInterval: number;
  maxInterval: number;
  routerAddress: string;
  wethAddress: string;
  usdcAddress: string;
  hookAddress: string;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  amount: string;
  error?: string;
}
