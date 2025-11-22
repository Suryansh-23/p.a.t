import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const hexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected 20-byte hex address (0x...)");

const optionalHex32 = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Expected 32-byte hex value (0x...)");

const logLevelEnum = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  CHAIN_ID: z.coerce.number().int().positive(),
  CHAIN_RPC_HTTP: z.string().url(),
  CHAIN_RPC_WS: z.string().url().optional(),
  POOL_LAUNCH_ADDRESS: hexAddress,
  POOL_LAUNCH_START_BLOCK: z.coerce.bigint().nonnegative().default(0n),
  POOL_MANAGER_ADDRESS: hexAddress,
  POOL_MANAGER_START_BLOCK: z.coerce.bigint().nonnegative().default(0n),
  BATCH_TARGET_ADDRESS: hexAddress,
  BATCH_SIZE: z.coerce.number().int().positive().default(10),
  EXPRESS_PORT: z.coerce.number().int().positive().default(8080),
  EXPRESS_HOST: z.string().default("0.0.0.0"),
  ALLOW_LOCAL_DEV: z
    .union([
      z.literal("true"),
      z.literal("false"),
      z.literal("1"),
      z.literal("0"),
    ])
    .default("false"),
  LOCAL_DEV_SK: optionalHex32.optional(),
  LOG_LEVEL: logLevelEnum.default("info"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

const boolean = (value: string) =>
  value === "true" || value === "1" ? true : false;

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
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
  allowLocalDev: boolean(parsed.data.ALLOW_LOCAL_DEV),
  localDevSecretKey: parsed.data.LOCAL_DEV_SK,
  logLevel: parsed.data.LOG_LEVEL,
} as const;
