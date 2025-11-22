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
  volatility: number = 0
): number {
  const { spreadRange, correlationFactor } = params;

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
  volatility: number = 0
): PriceDataPoint {
  const spreadBps = calculateDynamicSpread(params, volatility);
  const { upper, lower } = calculateSpreadBounds(midPrice, spreadBps);

  return {
    timestamp,
    midPrice,
    upperBound: upper,
    lowerBound: lower,
  };
}
