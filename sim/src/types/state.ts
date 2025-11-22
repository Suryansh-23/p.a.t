/**
 * Application state type definitions
 */

import type {
  SequencerParameters,
  PriceDataPoint,
  SpreadDataPoint,
} from "./parameters.js";

export type ConnectionStatus = "connected" | "disconnected" | "error";

export interface AppState {
  /** Current sequencer parameters */
  parameters: SequencerParameters;

  /** Historical price data points */
  priceHistory: PriceDataPoint[];

  /** Historical spread data points */
  spreadHistory: SpreadDataPoint[];

  /** Connection status to sequencer service */
  connectionStatus: ConnectionStatus;

  /** Timestamp of last update */
  lastUpdate: Date;

  /** Whether updates are paused */
  isPaused: boolean;

  /** Current focused widget (for keyboard navigation) */
  focusedWidget: string | null;
}

export interface UIConfig {
  /** Terminal width */
  width: number;

  /** Terminal height */
  height: number;

  /** Maximum price data points to keep in history */
  maxHistoryPoints: number;

  /** Update debounce in milliseconds */
  updateDebounceMs: number;
}
