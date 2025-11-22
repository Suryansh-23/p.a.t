/**
 * Application configuration loader
 * Loads environment variables and provides typed config object
 */

import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

/**
 * Configuration schema with validation
 */
const configSchema = z.object({
  // Sequencer settings
  sequencer: z.object({
    host: z.string().default("localhost"),
    port: z.coerce.number().default(3000),
    apiKey: z.string().optional(),
  }),

  // Pyth Network settings
  pyth: z.object({
    hermesUrl: z.string().url().default("https://hermes.pyth.network"),
    feedId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/, "Feed ID must be a valid hex string")
      .default(
        "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
      ), // BTC/USD
  }),

  // UI settings
  ui: z.object({
    updateDebounceMs: z.coerce.number().min(0).default(500),
    enableMockData: z
      .string()
      .transform((val) => val.toLowerCase() === "true")
      .pipe(z.boolean())
      .default("false"),
  }),

  // Mock simulator settings (used when enableMockData is true)
  mock: z.object({
    initialPrice: z.coerce.number().positive().default(2750.5),
    volatility: z.coerce.number().min(0).default(0.5),
    drift: z.coerce.number().default(0.0),
  }),
});

/**
 * Load and validate configuration from environment variables
 */
function loadConfig() {
  const raw = {
    sequencer: {
      host: process.env.SEQUENCER_HOST,
      port: process.env.SEQUENCER_PORT,
      apiKey: process.env.SEQUENCER_API_KEY,
    },
    pyth: {
      hermesUrl: process.env.PYTH_HERMES_URL,
      feedId: process.env.PYTH_FEED_ID,
    },
    ui: {
      updateDebounceMs: process.env.UPDATE_DEBOUNCE_MS,
      enableMockData: process.env.ENABLE_MOCK_DATA,
    },
    mock: {
      initialPrice: process.env.INITIAL_PRICE,
      volatility: process.env.VOLATILITY,
      drift: process.env.DRIFT,
    },
  };

  try {
    return configSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Configuration validation error:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Application configuration singleton
 */
export const config = loadConfig();

/**
 * Configuration type export
 */
export type AppConfig = z.infer<typeof configSchema>;
