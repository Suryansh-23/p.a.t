export interface AMMPool {
  id: string
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
    tokenA: {
      symbol: "ETH",
      address: "0x1234...5678",
      logo: "/ethereum-abstract.png",
    },
    tokenB: {
      symbol: "USDC",
      address: "0x8765...4321",
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
  {
    id: "2",
    tokenA: {
      symbol: "WBTC",
      address: "0xabcd...efgh",
      logo: "/bitcoin-concept.png",
    },
    tokenB: {
      symbol: "ETH",
      address: "0x1234...5678",
      logo: "/ethereum-abstract.png",
    },
    tvl: "$32.1M",
    volume24h: "$8.4M",
    apy: "18.3%",
    fees: "0.3%",
    liquidity: {
      tokenA: "890",
      tokenB: "15,200",
    },
  },
  {
    id: "3",
    tokenA: {
      symbol: "USDT",
      address: "0xijkl...mnop",
      logo: "/tethered-balloons.png",
    },
    tokenB: {
      symbol: "USDC",
      address: "0x8765...4321",
      logo: "/usdc-coins.png",
    },
    tvl: "$28.7M",
    volume24h: "$15.2M",
    apy: "12.1%",
    fees: "0.05%",
    liquidity: {
      tokenA: "14,350,000",
      tokenB: "14,340,000",
    },
  },
  {
    id: "4",
    tokenA: {
      symbol: "DAI",
      address: "0xqrst...uvwx",
      logo: "/abstract-ink-flow.png",
    },
    tokenB: {
      symbol: "USDC",
      address: "0x8765...4321",
      logo: "/usdc-coins.png",
    },
    tvl: "$21.5M",
    volume24h: "$6.7M",
    apy: "9.8%",
    fees: "0.05%",
    liquidity: {
      tokenA: "10,750,000",
      tokenB: "10,740,000",
    },
  },
  {
    id: "5",
    tokenA: {
      symbol: "LINK",
      address: "0xyzab...cdef",
      logo: "/chainlink-abstract.png",
    },
    tokenB: {
      symbol: "ETH",
      address: "0x1234...5678",
      logo: "/ethereum-abstract.png",
    },
    tvl: "$18.9M",
    volume24h: "$4.2M",
    apy: "32.4%",
    fees: "0.3%",
    liquidity: {
      tokenA: "1,250,000",
      tokenB: "8,900",
    },
  },
  {
    id: "6",
    tokenA: {
      symbol: "UNI",
      address: "0xghij...klmn",
      logo: "/uniswap-concept.png",
    },
    tokenB: {
      symbol: "ETH",
      address: "0x1234...5678",
      logo: "/ethereum-abstract.png",
    },
    tvl: "$15.3M",
    volume24h: "$3.8M",
    apy: "28.7%",
    fees: "0.3%",
    liquidity: {
      tokenA: "2,100,000",
      tokenB: "6,750",
    },
  },
  {
    id: "7",
    tokenA: {
      symbol: "AAVE",
      address: "0xopqr...stuv",
      logo: "/aave-logo.png",
    },
    tokenB: {
      symbol: "USDC",
      address: "0x8765...4321",
      logo: "/usdc-coins.png",
    },
    tvl: "$12.8M",
    volume24h: "$2.9M",
    apy: "35.2%",
    fees: "0.3%",
    liquidity: {
      tokenA: "145,000",
      tokenB: "12,800,000",
    },
  },
  {
    id: "8",
    tokenA: {
      symbol: "MATIC",
      address: "0xwxyz...abcd",
      logo: "/abstract-polygon.png",
    },
    tokenB: {
      symbol: "ETH",
      address: "0x1234...5678",
      logo: "/ethereum-abstract.png",
    },
    tvl: "$9.4M",
    volume24h: "$1.8M",
    apy: "42.1%",
    fees: "0.3%",
    liquidity: {
      tokenA: "15,600,000",
      tokenB: "4,200",
    },
  },
]
