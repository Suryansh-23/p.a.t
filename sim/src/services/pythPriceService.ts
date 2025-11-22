/**
 * Pyth Network price feed service
 * Connects to Hermes for real-time price updates via Server-Sent Events
 */

import { HermesClient } from "@pythnetwork/hermes-client";
import { config } from "../config/index.js";

export interface PythPriceUpdate {
  id: string;
  price: {
    price: string; // Price as string (needs to be parsed)
    conf: string; // Confidence interval
    expo: number; // Exponent for price (price * 10^expo)
    publishTime: number; // Unix timestamp
  };
  emaPrice: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
}

export interface NormalizedPriceData {
  price: number; // Actual numeric price
  confidence: number; // Confidence interval as a number
  timestamp: number; // Publish time in milliseconds
  expo: number; // Original exponent
}

export type PriceUpdateCallback = (data: NormalizedPriceData) => void;

/**
 * Service for subscribing to Pyth Network price feeds via Hermes
 */
export class PythPriceService {
  private client: HermesClient;
  private eventSource?: any; // EventSource type from getPriceUpdatesStream
  private feedId: string;
  private callbacks: Set<PriceUpdateCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2s delay

  constructor(hermesUrl?: string, feedId?: string) {
    this.client = new HermesClient(hermesUrl || config.pyth.hermesUrl, {});
    this.feedId = feedId || config.pyth.feedId;
  }

  /**
   * Subscribe to price updates
   * @param callback Function to call when a price update is received
   */
  subscribe(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);

    // Start streaming if this is the first subscriber
    if (this.callbacks.size === 1 && !this.isConnected) {
      this.startStreaming();
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);

      // Stop streaming if no more subscribers
      if (this.callbacks.size === 0) {
        this.stopStreaming();
      }
    };
  }

  /**
   * Get the latest price (one-time fetch)
   */
  async getLatestPrice(): Promise<NormalizedPriceData | null> {
    try {
      const priceUpdates = await this.client.getLatestPriceUpdates([
        this.feedId,
      ]);

      if (!priceUpdates?.parsed || priceUpdates.parsed.length === 0) {
        return null;
      }

      const priceData = priceUpdates.parsed[0];
      return this.normalizePriceData(priceData);
    } catch (error) {
      console.error("Error fetching latest price:", error);
      return null;
    }
  }

  /**
   * Start streaming price updates via Server-Sent Events
   */
  private async startStreaming(): Promise<void> {
    try {
      // Get the SSE stream
      this.eventSource = await this.client.getPriceUpdatesStream(
        [this.feedId],
        {
          encoding: "hex",
          parsed: true,
        }
      );

      this.eventSource.onmessage = (event: any) => {
        try {
          const data = JSON.parse(event.data);

          if (data.parsed && data.parsed.length > 0) {
            const priceData = data.parsed[0];
            const normalized = this.normalizePriceData(priceData);

            // Notify all subscribers
            this.callbacks.forEach((callback) => {
              try {
                callback(normalized);
              } catch (error) {
                console.error("Error in price update callback:", error);
              }
            });
          }
        } catch (error) {
          console.error("Error parsing price update:", error);
        }
      };

      this.eventSource.onerror = (error: any) => {
        console.error("EventSource error:", error);
        this.isConnected = false;

        // Attempt to reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay =
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

          console.log(
            `Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );

          setTimeout(() => {
            this.stopStreaming();
            this.startStreaming();
          }, delay);
        } else {
          console.error("Max reconnect attempts reached. Stopping stream.");
          this.stopStreaming();
        }
      };

      this.eventSource.onopen = () => {
        console.log("Connected to Pyth Hermes price stream");
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
      };
    } catch (error) {
      console.error("Error starting price stream:", error);
      this.isConnected = false;
    }
  }

  /**
   * Stop streaming and clean up
   */
  private stopStreaming(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
      this.isConnected = false;
    }
  }

  /**
   * Normalize raw Pyth price data into a usable format
   */
  private normalizePriceData(data: any): NormalizedPriceData {
    const priceStr = data.price?.price || "0";
    const confStr = data.price?.conf || "0";
    const expo = data.price?.expo || 0;
    const publishTime = data.price?.publishTime || 0;

    // Convert price and confidence using the exponent
    // Price is given as an integer that must be multiplied by 10^expo
    const price = Number(priceStr) * Math.pow(10, expo);
    const confidence = Number(confStr) * Math.pow(10, expo);

    return {
      price,
      confidence,
      timestamp: publishTime * 1000, // Convert to milliseconds
      expo,
    };
  }

  /**
   * Get connection status
   */
  isStreamConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Clean up and close all connections
   */
  destroy(): void {
    this.callbacks.clear();
    this.stopStreaming();
  }
}
