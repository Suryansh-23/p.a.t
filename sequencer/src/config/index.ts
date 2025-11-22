import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const hexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected 20-byte hex address (0x...)");

const hexPrivateKey = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Expected 32-byte hex private key (0x...)");

const logLevelEnum = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

const startBlockSchema = z
  .coerce.bigint()
  .refine(
    (value) => value >= -1n,
    "Start block must be -1 (start from latest) or >= 0"
  )
  .default(0n);

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: logLevelEnum.default("info"),
  CHAIN_ID: z.coerce.number().int().positive(),
  CHAIN_RPC_HTTP: z.string().url(),
  CHAIN_RPC_WS: z.string().url().optional(),
  POOL_LAUNCH_ADDRESS: hexAddress,
  POOL_LAUNCH_START_BLOCK: startBlockSchema,
  POOL_MANAGER_ADDRESS: hexAddress,
  POOL_MANAGER_START_BLOCK: startBlockSchema,
  BATCH_TARGET_ADDRESS: hexAddress,
  BATCH_SIZE: z.coerce.number().int().positive().default(10),
  EXPRESS_PORT: z.coerce.number().int().positive().default(8080),
  EXPRESS_HOST: z.string().default("0.0.0.0"),
  BATCHER_PRIVATE_KEY: hexPrivateKey,
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  logLevel: parsed.data.LOG_LEVEL,
  chainId: parsed.data.CHAIN_ID,
  rpcHttpUrl: parsed.data.CHAIN_RPC_HTTP,
  rpcWsUrl: parsed.data.CHAIN_RPC_WS ?? null,
  poolLaunchAddress: parsed.data.POOL_LAUNCH_ADDRESS,
  poolLaunchStartBlock: parsed.data.POOL_LAUNCH_START_BLOCK,
  poolManagerAddress: parsed.data.POOL_MANAGER_ADDRESS,
  poolManagerStartBlock: parsed.data.POOL_MANAGER_START_BLOCK,
  batchTargetAddress: parsed.data.BATCH_TARGET_ADDRESS,
  batchSize: parsed.data.BATCH_SIZE,
  expressPort: parsed.data.EXPRESS_PORT,
  expressHost: parsed.data.EXPRESS_HOST,
  batcherPrivateKey: parsed.data.BATCHER_PRIVATE_KEY,
} as const;
