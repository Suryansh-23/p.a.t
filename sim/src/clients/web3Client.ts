/**
 * Web3 client for blockchain interactions
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

// Unichain Sepolia chain definition
export const unichainSepolia = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  network: "unichain-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.unichain.org"],
    },
    public: {
      http: ["https://sepolia.unichain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://sepolia.uniscan.xyz",
    },
  },
  testnet: true,
});

export interface Web3ClientConfig {
  rpcUrl: string;
  chainId: number;
  privateKey?: string;
}

export class Web3Client {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private account?: ReturnType<typeof privateKeyToAccount>;

  constructor(config: Web3ClientConfig) {
    this.publicClient = createPublicClient({
      chain: unichainSepolia,
      transport: http(config.rpcUrl),
    });

    if (config.privateKey) {
      try {
        this.account = privateKeyToAccount(config.privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: unichainSepolia,
          transport: http(config.rpcUrl),
        });
      } catch (error) {
        // Private key invalid or not provided - wallet client will be undefined
      }
    }
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  getWalletClient(): WalletClient | undefined {
    return this.walletClient;
  }

  getAccount() {
    return this.account;
  }

  hasWallet(): boolean {
    return !!this.walletClient && !!this.account;
  }

  async getBalance(address: `0x${string}`): Promise<bigint> {
    return this.publicClient.getBalance({ address });
  }

  async estimateGas(params: {
    account: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }): Promise<bigint> {
    return this.publicClient.estimateGas(params);
  }
}
