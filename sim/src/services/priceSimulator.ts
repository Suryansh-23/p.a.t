/**
 * Price data manager - combines real Pyth data with mock simulation fallback
 */

import { MOCK_PRICE_CONFIG } from "../config/defaults.js";
import { config } from "../config/index.js";
import {
  PythPriceService,
  type NormalizedPriceData,
} from "./pythPriceService.js";

export class PriceSimulator {
  private currentPrice: number;
  private currentConfidence?: number;
  private volatility: number;
  private drift: number;
  private pythService?: PythPriceService;
  private useMockData: boolean;

  constructor(
    initialPrice: number = MOCK_PRICE_CONFIG.initialPrice,
    volatility: number = MOCK_PRICE_CONFIG.volatility,
    drift: number = MOCK_PRICE_CONFIG.drift
  ) {
    this.currentPrice = initialPrice;
    this.volatility = volatility;
    this.drift = drift;
    this.useMockData = config.ui.enableMockData;

    // Initialize Pyth service if not using mock data
    if (!this.useMockData) {
      this.pythService = new PythPriceService();
    }
  }

  /**
   * Subscribe to price updates (real or simulated)
   * @param callback Function called with each price update
   * @returns Unsubscribe function
   */
  subscribe(
    callback: (price: number, timestamp: number, confidence?: number) => void
  ): () => void {
    if (this.useMockData) {
      // For mock data, we'll use a timer-based approach
      // This will be called by the app's update loop
      return () => {}; // No-op for mock mode
    } else if (this.pythService) {
      // Subscribe to real Pyth price updates
      return this.pythService.subscribe((data: NormalizedPriceData) => {
        this.currentPrice = data.price;
        this.currentConfidence = data.confidence;
        callback(data.price, data.timestamp, data.confidence);
      });
    }
    return () => {};
  }

  /**
   * Generate next price using Brownian motion (geometric random walk)
   * Only used in mock mode
   */
  generateNextPrice(): number {
    if (!this.useMockData) {
      // In real mode, just return the current price from Pyth
      return this.currentPrice;
    }

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
   * Get latest price from Pyth (async, one-time fetch)
   */
  async fetchLatestPrice(): Promise<number | null> {
    if (this.useMockData || !this.pythService) {
      return this.currentPrice;
    }

    const priceData = await this.pythService.getLatestPrice();
    if (priceData) {
      this.currentPrice = priceData.price;
      this.currentConfidence = priceData.confidence;
      return priceData.price;
    }

    return null;
  }

  /**
   * Get current price without generating new one
   */
  getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Get current confidence interval
   */
  getCurrentConfidence(): number | undefined {
    return this.currentConfidence;
  }

  /**
   * Check if connected to Pyth stream
   */
  isConnected(): boolean {
    if (this.useMockData) {
      return true; // Mock mode is always "connected"
    }
    return this.pythService?.isStreamConnected() ?? false;
  }

  /**
   * Get data source mode
   */
  getMode(): "mock" | "live" {
    return this.useMockData ? "mock" : "live";
  }

  /**
   * Reset to initial price
   */
  reset(price?: number): void {
    this.currentPrice = price ?? MOCK_PRICE_CONFIG.initialPrice;
  }

  /**
   * Update volatility parameter (mock mode only)
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

  /**
   * Clean up resources
   */
  destroy(): void {
    this.pythService?.destroy();
  }
}
