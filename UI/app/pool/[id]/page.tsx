"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ExternalLink, Globe, ArrowDownUp, Sparkles, Copy } from "lucide-react"
import { useAccount, useReadContract, usePublicClient } from "wagmi"
import { formatUnits } from "viem"
import { erc20Abi } from "@/utils/abi/erc20"

type LaunchConfig = {
  token0: string
  token1: string
  token0SeedAmt: string
  token1SeedAmt: string
  strategyAdapter: string
  thresholdAdapter: string
  poolName: string
  curatorInfo: {
    curator: string
    name: string
    website: string
  }
}

type PoolMetadata = {
  poolId: string
  launchConfig: LaunchConfig
  launchedAt: string
  blockNumber: string
  txHash: string
}

type PoolResponse = {
  ok: boolean
  poolId: string
  launchConfig: LaunchConfig
  launchedAt: number
  blockNumber: string
  txHash: string
}

const SEQUENCER_API_URL = process.env.NEXT_PUBLIC_SEQUENCER_API_URL || "http://localhost:3001"

export default function PoolDetailPage() {
  const params = useParams()
  const poolId = params?.id as string
  const [pool, setPool] = useState<PoolMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()
  
  // Swap state
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [isSwapReversed, setIsSwapReversed] = useState(false)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  // Token info for token0
  const { data: token0Symbol } = useReadContract({
    address: pool?.launchConfig.token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
  })

  const { data: token0Decimals } = useReadContract({
    address: pool?.launchConfig.token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
  })

  const { data: token0Balance } = useReadContract({
    address: pool?.launchConfig.token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })

  // Token info for token1
  const { data: token1Symbol } = useReadContract({
    address: pool?.launchConfig.token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
  })

  const { data: token1Decimals } = useReadContract({
    address: pool?.launchConfig.token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
  })

  const { data: token1Balance } = useReadContract({
    address: pool?.launchConfig.token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })

  // Debug logging
  useEffect(() => {
    if (pool) {
      console.log("Pool loaded:", pool)
      console.log("Token0:", pool.launchConfig.token0)
      console.log("Token1:", pool.launchConfig.token1)
      console.log("Token0 Symbol:", token0Symbol)
      console.log("Token1 Symbol:", token1Symbol)
    }
  }, [pool, token0Symbol, token1Symbol])

  // Format balances
  const formatBalance = (balance: bigint | undefined, decimals: number | undefined) => {
    if (!balance || decimals === undefined) return "0.00"
    try {
      return Number(formatUnits(balance, decimals)).toFixed(4)
    } catch {
      return "0.00"
    }
  }

  const token0BalanceFormatted = formatBalance(token0Balance, token0Decimals)
  const token1BalanceFormatted = formatBalance(token1Balance, token1Decimals)

  // Helper functions
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedValue(text)
      setTimeout(() => setCopiedValue(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  useEffect(() => {
    const fetchPool = async () => {
      if (!poolId) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/pools/${poolId}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json',
          },
        })
        
        console.log("Pool detail response status:", response.status)
        
        if (!response.ok) {
          const responseText = await response.text()
          throw new Error(`Failed to fetch pool: ${response.status} - ${responseText.substring(0, 100)}`)
        }

        const data: PoolResponse = await response.json()

        console.log("Pool data received:", data)

        if (!data.ok) {
          throw new Error("API returned error")
        }

        // Convert the response to PoolMetadata format
        const poolData: PoolMetadata = {
          poolId: data.poolId,
          launchConfig: data.launchConfig,
          launchedAt: new Date(data.launchedAt).toISOString(),
          blockNumber: data.blockNumber,
          txHash: data.txHash,
        }

        setPool(poolData)
      } catch (err) {
        console.error("Error fetching pool:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch pool")
      } finally {
        setLoading(false)
      }
    }

    fetchPool()
  }, [poolId])

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#03030f]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050611] via-[#030617] to-[#010109]" />
        </div>
        <Navigation />
        <div className="container mx-auto px-4 pt-32">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !pool) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#03030f]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050611] via-[#030617] to-[#010109]" />
        </div>
        <Navigation />
        <div className="container mx-auto px-4 pt-32">
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error || "Pool not found"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03030f]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050611] via-[#030617] to-[#010109]" />
        <div className="absolute left-1/3 top-10 h-72 w-72 rounded-full bg-[#0500e1]/20 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-64 w-64 translate-x-1/4 rounded-full bg-[#02c2ff]/15 blur-[150px]" />
      </div>

      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">{pool.launchConfig.poolName}</h1>
          <div className="flex items-center justify-center gap-2 text-white/60">
            <span className="text-sm">Pool ID:</span>
            <span className="font-mono text-sm text-white">{poolId}</span>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="mb-8 max-w-xl mx-auto">
          <Card className="backdrop-blur-md bg-[#050818]/90 border-white/10 shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-semibold flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-primary" />
                Swap Tokens
              </CardTitle>
              <p className="text-sm text-white/60">Trade tokens in this liquidity pool</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From Token */}
              <div className="space-y-3 border border-white/10 bg-white/5 p-4 rounded-lg">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/70">
                  <span>From</span>
                  <span className="font-mono text-xs text-white/80">
                    Balance: {isSwapReversed ? token1BalanceFormatted : token0BalanceFormatted}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-12 sm:h-14 w-full sm:w-48 sm:flex-none bg-white/5 rounded-md px-4 flex items-center border border-white/10">
                    <span className="text-white font-semibold text-base">
                      {isSwapReversed ? (token1Symbol || "Loading...") : (token0Symbol || "Loading...")}
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="w-full sm:flex-1 text-xl sm:text-2xl font-semibold h-12 sm:h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto h-12 sm:h-14 border-white/20 hover:bg-white/10 text-white"
                    onClick={() => {
                      const balance = isSwapReversed ? token1BalanceFormatted : token0BalanceFormatted
                      setFromAmount(balance)
                    }}
                  >
                    Max
                  </Button>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center -my-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-full"
                  onClick={() => {
                    setIsSwapReversed(!isSwapReversed)
                    setFromAmount(toAmount)
                    setToAmount(fromAmount)
                  }}
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-3 border border-white/10 bg-white/5 p-4 mt-5 rounded-lg">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/70">
                  <span>To</span>
                  <span className="font-mono text-xs text-white/80">
                    Balance: {isSwapReversed ? token0BalanceFormatted : token1BalanceFormatted}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-12 sm:h-14 w-full sm:w-48 sm:flex-none bg-white/5 rounded-md px-4 flex items-center border border-white/10">
                    <span className="text-white font-semibold text-base">
                      {isSwapReversed ? (token0Symbol || "Loading...") : (token1Symbol || "Loading...")}
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={toAmount}
                    readOnly
                    className="w-full sm:flex-1 text-xl sm:text-2xl font-semibold h-12 sm:h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Swap Button */}
              <Button
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-semibold text-lg rounded-lg"
                disabled={!fromAmount || Number(fromAmount) <= 0}
              >
                {!fromAmount || Number(fromAmount) <= 0 ? "Enter an amount" : "Swap"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pool Information */}
        <div className="max-w-4xl mx-auto mt-16 sm:mt-24">
          <Card className="bg-[#050818]/90 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-white">Pool Parameters</CardTitle>
              <p className="text-sm text-white/60">
                Live configuration and details for this liquidity pool.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Curator Information Section */}
              <section className="rounded-xl border border-white/20 bg-white/5 px-5 py-6 backdrop-blur-sm">
                <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                  <h3 className="text-sm font-semibold tracking-wide text-white">Curator Information</h3>
                  <p className="text-xs text-white/60">Pool curator details and contact information</p>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Name</dt>
                    <dd className="mt-1 text-sm text-white">{pool.launchConfig.curatorInfo.name}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Website</dt>
                    <dd className="mt-1 text-sm text-white">
                      {pool.launchConfig.curatorInfo.website ? (
                        <a
                          href={pool.launchConfig.curatorInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {pool.launchConfig.curatorInfo.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Curator Address</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => handleCopy(pool.launchConfig.curatorInfo.curator)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy curator address</span>
                      </Button>
                      <div className="flex flex-col">
                        <a
                          href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.curatorInfo.curator}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs sm:text-sm text-white hover:underline"
                        >
                          {shortenAddress(pool.launchConfig.curatorInfo.curator)}
                        </a>
                        {copiedValue === pool.launchConfig.curatorInfo.curator && (
                          <span className="text-[10px] uppercase tracking-wide text-white/60">Copied</span>
                        )}
                      </div>
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Token Information Section */}
              <section className="rounded-xl border border-white/20 bg-white/5 px-5 py-6 backdrop-blur-sm">
                <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                  <h3 className="text-sm font-semibold tracking-wide text-white">Token Information</h3>
                  <p className="text-xs text-white/60">Token pair and initial seed amounts</p>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Token 0 Symbol</dt>
                    <dd className="mt-1 text-sm text-white">{token0Symbol || "Loading..."}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Token 0 Seed Amount</dt>
                    <dd className="mt-1 text-sm text-white">{pool.launchConfig.token0SeedAmt}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Token 0 Address</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => handleCopy(pool.launchConfig.token0)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy token 0 address</span>
                      </Button>
                      <div className="flex flex-col">
                        <a
                          href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.token0}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs sm:text-sm text-white hover:underline"
                        >
                          {shortenAddress(pool.launchConfig.token0)}
                        </a>
                        {copiedValue === pool.launchConfig.token0 && (
                          <span className="text-[10px] uppercase tracking-wide text-white/60">Copied</span>
                        )}
                      </div>
                    </dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Token 1 Symbol</dt>
                    <dd className="mt-1 text-sm text-white">{token1Symbol || "Loading..."}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Token 1 Seed Amount</dt>
                    <dd className="mt-1 text-sm text-white">{pool.launchConfig.token1SeedAmt}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Token 1 Address</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => handleCopy(pool.launchConfig.token1)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy token 1 address</span>
                      </Button>
                      <div className="flex flex-col">
                        <a
                          href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.token1}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs sm:text-sm text-white hover:underline"
                        >
                          {shortenAddress(pool.launchConfig.token1)}
                        </a>
                        {copiedValue === pool.launchConfig.token1 && (
                          <span className="text-[10px] uppercase tracking-wide text-white/60">Copied</span>
                        )}
                      </div>
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Adapters Section */}
              <section className="rounded-xl border border-white/20 bg-white/5 px-5 py-6 backdrop-blur-sm">
                <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                  <h3 className="text-sm font-semibold tracking-wide text-white">Adapters</h3>
                  <p className="text-xs text-white/60">Strategy and threshold adapter contracts</p>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Strategy Adapter</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => handleCopy(pool.launchConfig.strategyAdapter)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy strategy adapter</span>
                      </Button>
                      <div className="flex flex-col">
                        <a
                          href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.strategyAdapter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs sm:text-sm text-white hover:underline"
                        >
                          {shortenAddress(pool.launchConfig.strategyAdapter)}
                        </a>
                        {copiedValue === pool.launchConfig.strategyAdapter && (
                          <span className="text-[10px] uppercase tracking-wide text-white/60">Copied</span>
                        )}
                      </div>
                    </dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-white/60">Threshold Adapter</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => handleCopy(pool.launchConfig.thresholdAdapter)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy threshold adapter</span>
                      </Button>
                      <div className="flex flex-col">
                        <a
                          href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.thresholdAdapter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs sm:text-sm text-white hover:underline"
                        >
                          {shortenAddress(pool.launchConfig.thresholdAdapter)}
                        </a>
                        {copiedValue === pool.launchConfig.thresholdAdapter && (
                          <span className="text-[10px] uppercase tracking-wide text-white/60">Copied</span>
                        )}
                      </div>
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Launch Details Section */}
              {pool.launchedAt && (
                <section className="rounded-xl border border-white/20 bg-white/5 px-5 py-6 backdrop-blur-sm">
                  <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                    <h3 className="text-sm font-semibold tracking-wide text-white">Launch Details</h3>
                    <p className="text-xs text-white/60">Pool deployment information</p>
                  </div>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                      <dt className="text-xs uppercase tracking-wide text-white/60">Launched At</dt>
                      <dd className="mt-1 text-sm text-white">
                        {new Date(pool.launchedAt).toLocaleString()}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                      <dt className="text-xs uppercase tracking-wide text-white/60">Block Number</dt>
                      <dd className="mt-1 text-sm text-white">{pool.blockNumber}</dd>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                      <dt className="text-xs uppercase tracking-wide text-white/60">Transaction Hash</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => handleCopy(pool.txHash)}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copy transaction hash</span>
                        </Button>
                        <div className="flex flex-col">
                          <a
                            href={`https://sepolia.uniscan.xyz/tx/${pool.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs sm:text-sm text-white hover:underline"
                          >
                            {shortenAddress(pool.txHash)}
                          </a>
                          {copiedValue === pool.txHash && (
                            <span className="text-[10px] uppercase tracking-wide text-white/60">Copied</span>
                          )}
                        </div>
                      </dd>
                    </div>
                  </dl>
                </section>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
