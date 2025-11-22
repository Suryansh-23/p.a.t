/**
 * Mock price simulator for generating realistic price movements
 */

import { MOCK_PRICE_CONFIG } from "../config/defaults.js";

export class PriceSimulator {
  private currentPrice: number;
  private volatility: number;
  private drift: number;

  constructor(
    initialPrice: number = MOCK_PRICE_CONFIG.initialPrice,
    volatility: number = MOCK_PRICE_CONFIG.volatility,
    drift: number = MOCK_PRICE_CONFIG.drift
  ) {
    this.currentPrice = initialPrice;
    this.volatility = volatility;
    this.drift = drift;
  }

  /**
   * Generate next price using Brownian motion (geometric random walk)
   */
  generateNextPrice(): number {
    // Standard normal random variable (Box-Muller transform)
    const u1 = Math.random();
    const u2 = Math.random();
    const standardNormal =
      Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Brownian motion: dS = μ*S*dt + σ*S*dW
    const dt = 1; // time step
    const randomChange = this.volatility * standardNormal * Math.sqrt(dt);
    const driftChange = this.drift * dt;

    // Update price
    this.currentPrice = this.currentPrice * (1 + driftChange + randomChange);

    return this.currentPrice;
  }

  /**
   * Get current price without generating new one
   */
  getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Reset to initial price
   */
  reset(price?: number): void {
    this.currentPrice = price ?? MOCK_PRICE_CONFIG.initialPrice;
  }

  /**
   * Update volatility parameter
   */
  setVolatility(volatility: number): void {
    this.volatility = volatility;
  }

  /**
   * Calculate recent volatility from price history
   */
  static calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    // Calculate returns
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;

    return Math.sqrt(variance);
  }
}
