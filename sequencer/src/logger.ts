import pino from "pino";
import { config } from "./config/index.js";

export const logger = pino({
  level: config.logLevel,
  base: { service: "pool-batcher" },
});
