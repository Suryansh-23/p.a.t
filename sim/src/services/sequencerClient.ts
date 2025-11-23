/**
 * HTTP client for communicating with sequencer service
 */

import type { SequencerParameters } from "../types/parameters.js";

export interface SequencerClientConfig {
  url: string;
  apiKey?: string;
}

export class SequencerClient {
  private config: SequencerClientConfig;
  private connected: boolean = false;

  constructor(config: SequencerClientConfig) {
    this.config = config;
  }

  /**
   * Connect to sequencer service
   */
  async connect(): Promise<void> {
    // TODO: Implement connection logic
    // For now, this is a stub
    this.connected = false;
  }

  /**
   * Disconnect from sequencer service
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Push spread update to sequencer
   * @param poolId The pool ID (hex string with 0x prefix)
   * @param spreadBps The spread in basis points
   */
  async postSpreadUpdate(
    poolId: string,
    spreadBps: number
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Convert spread (bps) to Solidity uint256 bytes representation
      // Spread in bps as uint256, then encode as bytes
      const spreadUint256 = BigInt(Math.round(spreadBps));
      const spreadHex = spreadUint256.toString(16).padStart(64, "0");
      const parametersBytes = "0x" + spreadHex;

      const url = `${this.config.url}/update`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolId,
          parameters: parametersBytes,
        }),
      });

      if (!response.ok) {
        // Suppress errors - just return failure status
        return { ok: false, error: `HTTP ${response.status}` };
      }

      return { ok: true };
    } catch (error) {
      // Suppress all errors from sequencer
      return { ok: false, error: String(error) };
    }
  }

  /**
   * Get current parameters from sequencer
   */
  async getParameters(): Promise<SequencerParameters | null> {
    if (!this.connected) {
      throw new Error("Not connected to sequencer");
    }

    // TODO: Implement API call
    // GET /api/v1/parameters
    throw new Error("Not implemented");
  }

  /**
   * Check if connected to sequencer
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // TODO: Implement health check
    // GET /api/v1/health
    return false;
  }
}
