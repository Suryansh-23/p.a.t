/**
 * Type definitions for sequencer parameters and application state
 */

export interface SequencerParameters {
  /** Update frequency in milliseconds (aligned with block time) */
  updateFrequency: number;

  /** Spread range in basis points */
  spreadRange: {
    min: number; // minimum spread in bps
    max: number; // maximum spread in bps
  };

  /** Correlation factor (0.0 - 1.0) used in spread calculation */
  correlationFactor: number;
}

export interface PriceDataPoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Mid-market price */
  midPrice: number;

  /** Upper bound (mid + spread) */
  upperBound: number;

  /** Lower bound (mid - spread) */
  lowerBound: number;

  /** Optional confidence interval (standard deviation) from Pyth */
  confidence?: number;
}

export interface SpreadDataPoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Spread in basis points */
  spreadBps: number;

  /** Spread as percentage */
  spreadPercent: number;
}

export const DEFAULT_PARAMETERS: SequencerParameters = {
  updateFrequency: 2000, // 2 seconds
  spreadRange: {
    min: 1, // 0.01% (1 bps)
    max: 10, // 0.10% (10 bps)
  },
  correlationFactor: 0.7,
};

export const PARAMETER_LIMITS = {
  updateFrequency: {
    min: 1000, // 1 second
    max: 60000, // 60 seconds
    step: 100, // 100ms increments
  },
  spreadRange: {
    min: 1, // 1 bps (0.01%)
    max: 25, // 25 bps (0.25%)
    step: 1, // 1 bps increments
  },
  correlationFactor: {
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
};
