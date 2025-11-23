/**
 * Default configuration and parameter values
 */

import type { SequencerParameters } from "../types/parameters.js";
import type { UIConfig } from "../types/state.js";

export const DEFAULT_PARAMETERS: SequencerParameters = {
  updateFrequency: 1000, // 1 second - typical L2 block time
  spreadRange: {
    min: 6,
    max: 12,
  },
  correlationFactor: 0.7, // moderate correlation
};

export const UI_CONFIG: UIConfig = {
  width: 120,
  height: 35,
  maxHistoryPoints: 100,
  updateDebounceMs: 500,
};

export const MOCK_PRICE_CONFIG = {
  /** Starting mid-price for simulation */
  initialPrice: 2750.5,

  /** Base volatility (standard deviation) */
  volatility: 0.5,

  /** Drift (trend) per update */
  drift: 0.0,

  /** Whether to use Brownian motion */
  useBrownianMotion: true,
};
