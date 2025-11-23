/**
 * Logger utility with file logging for network and critical operations
 */

import fs from "fs";
import path from "path";

// Log directory
const LOG_DIR = path.join(process.cwd(), "logs");
const NETWORK_LOG_FILE = path.join(LOG_DIR, "network.log");
const APP_LOG_FILE = path.join(LOG_DIR, "app.log");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log message with timestamp
 */
function formatLogMessage(level: string, msg: any, context?: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : "";
  const msgStr = typeof msg === "object" ? JSON.stringify(msg) : String(msg);
  return `${timestamp} [${level}]${contextStr} ${msgStr}\n`;
}

/**
 * Write to network log file
 */
function writeToNetworkLog(level: string, msg: any, context?: string): void {
  const logMessage = formatLogMessage(level, msg, context);
  fs.appendFileSync(NETWORK_LOG_FILE, logMessage, "utf-8");
}

/**
 * Write to app log file
 */
function writeToAppLog(level: string, msg: any, context?: string): void {
  const logMessage = formatLogMessage(level, msg, context);
  fs.appendFileSync(APP_LOG_FILE, logMessage, "utf-8");
}

/**
 * Standard logger - writes to file only (no console output to avoid TUI overlap)
 */
export const logger = {
  info: (msg: any, context?: string) => {
    writeToAppLog("INFO", msg, context);
  },
  warn: (msg: any, context?: string) => {
    writeToAppLog("WARN", msg, context);
  },
  error: (msg: any, context?: string) => {
    writeToAppLog("ERROR", msg, context);
  },
};

/**
 * Network logger - logs to file only
 * Use for: Pyth price updates, sequencer posts, swap transactions
 */
export const networkLogger = {
  info: (msg: any, context?: string) => {
    writeToNetworkLog("INFO", msg, context);
  },
  warn: (msg: any, context?: string) => {
    writeToNetworkLog("WARN", msg, context);
  },
  error: (msg: any, context?: string) => {
    writeToNetworkLog("ERROR", msg, context);
  },
  success: (msg: any, context?: string) => {
    const successMsg =
      typeof msg === "object" ? { ...msg, status: "SUCCESS" } : msg;
    writeToNetworkLog("SUCCESS", successMsg, context);
  },
};
