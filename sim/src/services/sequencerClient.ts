/**
 * Future: HTTP client for communicating with sequencer service
 */

import type { SequencerParameters } from "../types/parameters.js";

export interface SequencerClientConfig {
  host: string;
  port: number;
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
   * Push parameter updates to sequencer
   */
  async updateParameters(params: SequencerParameters): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to sequencer");
    }

    // TODO: Implement API call
    // POST /api/v1/parameters
    // Placeholder - would send params to this.config.host:this.config.port
    void params;
  }

  /**
   * Get current parameters from sequencer
   */
  async getParameters(): Promise<SequencerParameters> {
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
