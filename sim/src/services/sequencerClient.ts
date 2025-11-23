/**
 * HTTP client for communicating with sequencer service
 */

import { encodeAbiParameters } from "viem";
import { networkLogger } from "../logger.js";
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
   * @param priceUpdateData Optional Pyth price update data (hex strings)
   */
  async postSpreadUpdate(
    poolId: string,
    spreadBps: number,
    priceUpdateData?: string[]
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Convert spread (bps) to bytes
      const spreadUint256 = BigInt(Math.round(spreadBps));
      const spreadBytes = `0x${spreadUint256.toString(16).padStart(64, "0")}`;

      // Prepare Pyth price update data (default to empty array if not provided)
      const pythUpdates = (priceUpdateData || []).map(
        (hex) => hex as `0x${string}`
      );

      // Encode composite parameter: abi.encode(bytes, bytes[])
      // This matches Solidity's: abi.decode(strategyUpdateParams, (bytes, bytes[]))
      const parametersBytes = encodeAbiParameters(
        [
          { type: "bytes", name: "spreadData" },
          { type: "bytes[]", name: "priceUpdates" },
        ],
        [spreadBytes as `0x${string}`, pythUpdates]
      );

      const url = `${this.config.url}/update`;

      networkLogger.info(
        {
          url,
          poolId,
          spreadBps,
          pythUpdateCount: pythUpdates.length,
          parametersBytes: parametersBytes.slice(0, 66) + "...",
        },
        "SequencerClient: Posting spread update"
      );

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
        networkLogger.error(
          {
            status: response.status,
            statusText: response.statusText,
            poolId,
            spreadBps,
          },
          "SequencerClient: HTTP error"
        );
        return { ok: false, error: `HTTP ${response.status}` };
      }

      networkLogger.success(
        {
          poolId,
          spreadBps,
          pythUpdateCount: pythUpdates.length,
          status: response.status,
        },
        "SequencerClient: Spread update posted successfully"
      );

      return { ok: true };
    } catch (error) {
      // Suppress all errors from sequencer
      networkLogger.error(
        {
          error: String(error),
          poolId,
          spreadBps,
        },
        "SequencerClient: Request failed"
      );
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
