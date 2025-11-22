import type { Chain } from "wagmi"

export const uniChainSepolia: Chain = {
  id: 1301,
  name: "UniChain Sepolia",
  network: "unichain-sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
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
      name: "UniChain Explorer",
      url: "https://sepolia.unichain.org",
    },
  },
  testnet: true,
}
