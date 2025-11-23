"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Globe, Loader2 } from "lucide-react"

type SortOption = "tvl" | "volume" | "apy"

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

type PoolsResponse = {
  ok: boolean
  pools: Record<string, LaunchConfig>
  total: number
}

const SEQUENCER_API_URL = process.env.NEXT_PUBLIC_SEQUENCER_API_URL || "http://localhost:3001"

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [pools, setPools] = useState<PoolMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPools = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log("Fetching pools from:", `${SEQUENCER_API_URL}/api/pools`)
        
        const response = await fetch(`${SEQUENCER_API_URL}/api/pools`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json',
          },
        })
        
        console.log("Response status:", response.status)
        console.log("Response ok:", response.ok)
        console.log("Response headers:", Object.fromEntries(response.headers.entries()))
        
        // Get response as text first to debug
        const responseText = await response.text()
        console.log("Response text (first 500 chars):", responseText.substring(0, 500))
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pools: ${response.status} - ${responseText.substring(0, 100)}`)
        }
        
        // Try to parse as JSON
        let data: PoolsResponse
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("JSON parse error:", parseError)
          console.error("Response was:", responseText)
          throw new Error("API returned invalid JSON")
        }
        
        console.log("API Response:", data)
        
        if (!data.ok) {
          throw new Error("API returned error")
        }
        
        // Convert the pools object to an array
        const poolsArray: PoolMetadata[] = Object.entries(data.pools || {}).map(([poolId, launchConfig]) => ({
          poolId,
          launchConfig,
          launchedAt: "",
          blockNumber: "0",
          txHash: "",
        }))
        
        console.log("Processed pools array:", poolsArray)
        console.log("Total pools found:", poolsArray.length)
        
        setPools(poolsArray)
      } catch (err) {
        console.error("Error fetching pools:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch pools")
      } finally {
        setLoading(false)
      }
    }

    fetchPools()
  }, [])

  const filteredPools = pools.filter((pool) => {
    const query = searchQuery.toLowerCase()
    return (
      pool.launchConfig.poolName.toLowerCase().includes(query) ||
      pool.launchConfig.token0.toLowerCase().includes(query) ||
      pool.launchConfig.token1.toLowerCase().includes(query) ||
      pool.launchConfig.curatorInfo.curator.toLowerCase().includes(query) ||
      pool.launchConfig.curatorInfo.name.toLowerCase().includes(query)
    )
  })

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03030f] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050611] via-[#030617] to-[#010109]" />
        <div className="absolute left-1/3 top-10 h-72 w-72 rounded-full bg-[#0500e1]/20 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-64 w-64 translate-x-1/4 rounded-full bg-[#02c2ff]/15 blur-[150px]" />
      </div>

      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">P.A.T Pool Explorer</h1>
          <p className="text-lg text-muted-foreground">Browse and explore all available Prop AMM pools</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pools (e.g., ETH, USDC, ETH/USDC)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-white/10 bg-[#050611]/60 pl-10"
            />
          </div>
        </div>

        {/* Pool Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        ) : filteredPools.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPools.map((pool) => (
              <Link href={`/pool/${pool.poolId}`} key={pool.poolId}>
                <Card className="flex h-full flex-col border-white/10 bg-[#050818]/90 p-5 transition hover:border-primary/40">
                  {/* Pool Name */}
                  <div className="mb-2">
                    <h3 className="text-xl font-bold text-white">{pool.launchConfig.poolName}</h3>
                  </div>

                  {/* Curator Info */}
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <span className="text-white/60">Curator:</span>
                    <span className="font-mono text-white">{pool.launchConfig.curatorInfo.name}</span>
                    {pool.launchConfig.curatorInfo.website && (
                      <>
                        <span className="text-white/40">•</span>
                        <a
                          href={pool.launchConfig.curatorInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-4 w-4 text-white" />
                        </a>
                      </>
                    )}
                  </div>

                  {/* Token Addresses */}
                  <div className="mb-4 space-y-2">
                    <div className="text-sm">
                      <span className="text-white/60">Token 0: </span>
                      <a
                        href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.token0}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pool.launchConfig.token0}
                      </a>
                    </div>
                    <div className="text-sm">
                      <span className="text-white/60">Token 1: </span>
                      <a
                        href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.token1}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pool.launchConfig.token1}
                      </a>
                    </div>
                  </div>

                  <div className="mt-auto pt-2">
                    <Button
                      size="sm"
                      className="w-full justify-center border border-white/20 bg-transparent text-white hover:bg-primary/10 hover:text-white"
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-white/10 bg-[#060b20]/80 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              {pools.length === 0 ? "No pools available yet" : "No pools found"}
            </h3>
            <p className="text-white/60">
              {pools.length === 0 
                ? "Pools will appear here once they are launched"
                : "Try adjusting your search query or browse all available pools"}
            </p>
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                variant="outline"
                className="mt-4 border-white/20 bg-transparent text-white"
              >
                Clear Search
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}