import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  webSocket,
} from "viem";
import type {
  Account,
  Chain,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
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

let cachedPublicClient: PublicClient | undefined;

export function getPublicClient(): PublicClient {
  if (cachedPublicClient) return cachedPublicClient;

  const transport: Transport =
    config.rpcWsUrl && config.rpcWsUrl !== config.rpcHttpUrl
      ? fallback([webSocket(config.rpcWsUrl), http(config.rpcHttpUrl)], {
          rank: true,
        })
      : http(config.rpcHttpUrl);

  cachedPublicClient = createPublicClient({
    chain: customChain,
    transport,
    pollingInterval: 4_000,
  });
  return cachedPublicClient;
}

export function createChainWalletClient(account: Account): WalletClient {
  return createWalletClient({
    account,
    chain: customChain,
    transport: http(config.rpcHttpUrl),
  });
}
