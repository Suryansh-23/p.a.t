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
    url: z.string().url().default("http://localhost:3000"),
    poolId: z
      .string()
      .default(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      ),
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

  // Blockchain settings
  blockchain: z.object({
    rpcUrl: z.string().url().default("https://sepolia.unichain.org"),
    chainId: z.coerce.number().default(1301),
    privateKey: z.string().optional(),
  }),

  // Swap simulator settings
  swap: z.object({
    enabled: z
      .string()
      .transform((val) => val.toLowerCase() === "true")
      .pipe(z.boolean())
      .default("false"),
    minAmount: z.coerce.number().positive().default(0.01),
    maxAmount: z.coerce.number().positive().default(0.1),
    minInterval: z.coerce.number().positive().default(5000),
    maxInterval: z.coerce.number().positive().default(30000),
    routerAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "Router address must be a valid address")
      .default("0x0000000000000000000000000000000000000000"),
    wethAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "WETH address must be a valid address")
      .default("0x4200000000000000000000000000000000000006"),
    usdcAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "USDC address must be a valid address")
      .default("0x0000000000000000000000000000000000000000"),
    hookAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "Hook address must be a valid address")
      .default("0x0000000000000000000000000000000000000000"),
  }),
});

/**
 * Load and validate configuration from environment variables
 */
function loadConfig() {
  const raw = {
    sequencer: {
      url: process.env.SEQUENCER_URL,
      poolId: process.env.POOL_ID,
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
    blockchain: {
      rpcUrl: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID,
      privateKey: process.env.PRIVATE_KEY,
    },
    swap: {
      enabled: process.env.SWAP_ENABLED,
      minAmount: process.env.SWAP_MIN_AMOUNT,
      maxAmount: process.env.SWAP_MAX_AMOUNT,
      minInterval: process.env.SWAP_MIN_INTERVAL,
      maxInterval: process.env.SWAP_MAX_INTERVAL,
      routerAddress: process.env.SWAP_ROUTER_ADDRESS,
      wethAddress: process.env.WETH_ADDRESS,
      usdcAddress: process.env.USDC_ADDRESS,
      hookAddress: process.env.HOOK_ADDRESS,
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
