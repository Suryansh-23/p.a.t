import { existsSync } from "node:fs";
import {
  RoflClient,
  KeyKind,
  ROFL_SOCKET_PATH,
} from "@oasisprotocol/rofl-client";

/**
 * Single ROFL client instance (defaults to UDS: /run/rofl-appd.sock).
 */
const client = new RoflClient();

/**
 * getAppId
 * Returns the bech32 ROFL App ID. Only available inside a ROFL machine.
 */
export async function getAppId(): Promise<string> {
  return client.getAppId();
}

/**
 * getEvmSecretKey
 * Generates (or deterministically re-derives) a secp256k1 key inside ROFL and
 * returns it as a 0x-prefixed hex string suitable for ethers.js Wallet.
 *
 * Local development ONLY (outside ROFL): If the appd socket is missing and
 * you set ALLOW_LOCAL_DEV=true and provide LOCAL_DEV_SK=0x<64-hex>, that value
 * will be returned instead. DO NOT USE THIS IN PRODUCTION.
 */
export async function getEvmSecretKey(keyId: string): Promise<string> {
  // Prefer ROFL keygen when the UNIX socket is present.
  if (existsSync(ROFL_SOCKET_PATH)) {
    const hex = await client.generateKey(keyId, KeyKind.SECP256K1);
    return hex.startsWith("0x") ? hex : `0x${hex}`;
  }

  // Explicit local-only fallback.
  const allowLocal = process.env.ALLOW_LOCAL_DEV === "true";
  const fallback = process.env.LOCAL_DEV_SK;
  if (allowLocal && fallback && /^0x[0-9a-fA-F]{64}$/.test(fallback)) {
    return fallback;
  }

  throw new Error(
    "rofl-appd socket not found at /run/rofl-appd.sock and no LOCAL_DEV_SK " +
      "provided. This function only works inside ROFL unless local fallback " +
      "is explicitly enabled."
  );
}
