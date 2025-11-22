/**
 * Spread and price calculation utilities
 */

import type {
  SequencerParameters,
  PriceDataPoint,
} from "../types/parameters.js";

/**
 * Calculate upper and lower spread bounds from mid-price
 */
export function calculateSpreadBounds(
  midPrice: number,
  spreadBps: number
): { upper: number; lower: number } {
  const spreadMultiplier = spreadBps / 10000;
  return {
    upper: midPrice * (1 + spreadMultiplier),
    lower: midPrice * (1 - spreadMultiplier),
  };
}

/**
 * Calculate current spread based on parameters and market conditions
 * Uses correlation factor to adjust spread dynamically
 */
export function calculateDynamicSpread(
  params: SequencerParameters,
  midPrice: number,
  confidence?: number,
  volatility: number = 0
): number {
  const { spreadRange, correlationFactor } = params;

  // If we have confidence data, use the new logic
  if (confidence !== undefined && midPrice > 0) {
    // 1. Calculate Pyth Spread (bps)
    // Ratio of confidence interval to price, multiplied by 10,000
    const pythSpreadBps = (confidence / midPrice) * 10000;

    // 2. Calculate User Mean Spread (center point of min & max)
    const userMeanSpread = (spreadRange.min + spreadRange.max) / 2;

    // 3. Calculate Composite Spread (weighted by correlation factor)
    // Correlation factor defines how much to depend on Pyth spread
    const compositeSpread =
      correlationFactor * pythSpreadBps +
      (1 - correlationFactor) * userMeanSpread;

    // 4. Clip final value between spread range
    return Math.max(
      spreadRange.min,
      Math.min(spreadRange.max, compositeSpread)
    );
  }

  // Fallback logic when no confidence data is available
  // Base spread interpolation
  const baseSpread =
    spreadRange.min + (spreadRange.max - spreadRange.min) * correlationFactor;

  // Adjust for volatility (higher volatility = wider spread)
  const volatilityAdjustment = volatility * correlationFactor * 100;

  const adjustedSpread = baseSpread + volatilityAdjustment;

  // Clamp to min/max bounds
  return Math.max(spreadRange.min, Math.min(spreadRange.max, adjustedSpread));
}

/**
 * Calculate spread as percentage from basis points
 */
export function bpsToPercentage(bps: number): number {
  return bps / 100;
}

/**
 * Calculate the width of the spread in absolute terms
 */
export function calculateSpreadWidth(upper: number, lower: number): number {
  return upper - lower;
}

/**
 * Calculate the spread in basis points from price bounds
 */
export function calculateSpreadBps(midPrice: number, upper: number): number {
  const spreadMultiplier = (upper - midPrice) / midPrice;
  return Math.round(spreadMultiplier * 10000);
}

/**
 * Generate a complete price data point with spread bounds
 */
export function generatePriceDataPoint(
  timestamp: number,
  midPrice: number,
  params: SequencerParameters,
  volatility: number = 0,
  confidence?: number
): PriceDataPoint {
  const spreadBps = calculateDynamicSpread(
    params,
    midPrice,
    confidence,
    volatility
  );
  const { upper, lower } = calculateSpreadBounds(midPrice, spreadBps);

  return {
    timestamp,
    midPrice,
    upperBound: upper,
    lowerBound: lower,
    confidence,
  };
}
