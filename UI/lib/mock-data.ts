export interface AMMPool {
  id: string
  name: string
  owner: string
  ownerWebsite: string
  tokenA: {
    symbol: string
    address: string
    logo: string
  }
  tokenB: {
    symbol: string
    address: string
    logo: string
  }
  tvl: string
  volume24h: string
  apy: string
  fees: string
  liquidity: {
    tokenA: string
    tokenB: string
  }
}

export const mockAMMPools: AMMPool[] = [
  {
    id: "1",
    name: "Curated Liquidity Pool",
    owner: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    ownerWebsite: "https://app.uniswap.org/explore",
    tokenA: {
      symbol: "Asset 1",
      address: "0x9aa272a104d413e3702d6a28901f3998c16c802f",
      logo: "/ethereum-abstract.png",
    },
    tokenB: {
      symbol: "Asset 2",
      address: "0xb35a9eb04ea059cdc1fdc9d9b425eb8cfc27491c",
      logo: "/usdc-coins.png",
    },
    tvl: "$45.2M",
    volume24h: "$12.8M",
    apy: "24.5%",
    fees: "0.3%",
    liquidity: {
      tokenA: "12,450",
      tokenB: "28,500,000",
    },
  },
]

