import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
} from "viem";
import type { Account, Chain, PublicClient, WalletClient } from "viem";
import { config } from "../config/index.js";

export const customChain: Chain = {
  id: config.chainId,
  name: "CustomChain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [config.rpcHttpUrl],
      webSocket: config.rpcWsUrl ? [config.rpcWsUrl] : undefined,
    },
    public: {
      http: [config.rpcHttpUrl],
      webSocket: config.rpcWsUrl ? [config.rpcWsUrl] : undefined,
    },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://example.invalid",
    },
  },
  testnet: true,
};

let cachedHttpClient: PublicClient | undefined;
let cachedWebSocketClient: PublicClient | undefined;

export function getHttpClient(): PublicClient {
  if (cachedHttpClient) return cachedHttpClient;
  cachedHttpClient = createPublicClient({
    chain: customChain,
    transport: http(config.rpcHttpUrl),
    pollingInterval: 4_000,
  });
  return cachedHttpClient;
}

export function getWebSocketClient(): PublicClient {
  if (!config.rpcWsUrl) {
    return getHttpClient();
  }
  if (cachedWebSocketClient) return cachedWebSocketClient;
  cachedWebSocketClient = createPublicClient({
    chain: customChain,
    transport: webSocket(config.rpcWsUrl),
    pollingInterval: 4_000,
  });
  return cachedWebSocketClient;
}

export function createChainWalletClient(account: Account): WalletClient {
  return createWalletClient({
    account,
    chain: customChain,
    transport: http(config.rpcHttpUrl),
  });
}
