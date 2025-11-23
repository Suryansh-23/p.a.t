"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { SwapInterface } from "@/components/swap-interface"
import { Loader2, ExternalLink, Globe } from "lucide-react"

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
  pool: PoolMetadata
}

const SEQUENCER_API_URL = process.env.NEXT_PUBLIC_SEQUENCER_API_URL || "http://localhost:3001"

export default function PoolDetailPage() {
  const params = useParams()
  const poolId = params?.id as string
  const [pool, setPool] = useState<PoolMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPool = async () => {
      if (!poolId) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${SEQUENCER_API_URL}/api/pools/${poolId}`, {
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

        if (!data.ok) {
          throw new Error("API returned error")
        }

        setPool(data.pool)
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
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">{pool.launchConfig.poolName}</h1>
          <div className="flex items-center gap-2 text-white/60">
            <span className="text-sm">Pool ID:</span>
            <span className="font-mono text-sm text-white">{poolId}</span>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="mb-8">
          <Card className="border-white/10 bg-[#050818]/90 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Swap Interface</h2>
            <p className="text-white/60">Swap interface coming soon...</p>
          </Card>
        </div>

        {/* Pool Information Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Curator Information */}
          <Card className="border-white/10 bg-[#050818]/90 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Curator Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-white/60 mb-1">Name</div>
                <div className="text-white">{pool.launchConfig.curatorInfo.name}</div>
              </div>
              <div>
                <div className="text-sm text-white/60 mb-1">Address</div>
                <a
                  href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.curatorInfo.curator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {pool.launchConfig.curatorInfo.curator}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
              {pool.launchConfig.curatorInfo.website && (
                <div>
                  <div className="text-sm text-white/60 mb-1">Website</div>
                  <a
                    href={pool.launchConfig.curatorInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-4 w-4" />
                    {pool.launchConfig.curatorInfo.website}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Token Information */}
          <Card className="border-white/10 bg-[#050818]/90 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Token Information</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-white/60 mb-1">Token 0</div>
                <a
                  href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.token0}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {pool.launchConfig.token0}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <div className="mt-1 text-sm text-white/60">
                  Seed Amount: <span className="text-white">{pool.launchConfig.token0SeedAmt}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-white/60 mb-1">Token 1</div>
                <a
                  href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.token1}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {pool.launchConfig.token1}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <div className="mt-1 text-sm text-white/60">
                  Seed Amount: <span className="text-white">{pool.launchConfig.token1SeedAmt}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Adapters */}
          <Card className="border-white/10 bg-[#050818]/90 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Strategy Adapter</h2>
            <a
              href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.strategyAdapter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline flex items-center gap-1 break-all"
            >
              {pool.launchConfig.strategyAdapter}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </Card>

          <Card className="border-white/10 bg-[#050818]/90 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Threshold Adapter</h2>
            <a
              href={`https://sepolia.uniscan.xyz/address/${pool.launchConfig.thresholdAdapter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline flex items-center gap-1 break-all"
            >
              {pool.launchConfig.thresholdAdapter}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </Card>

          {/* Launch Details */}
          {pool.launchedAt && (
            <Card className="border-white/10 bg-[#050818]/90 p-6 md:col-span-2">
              <h2 className="mb-4 text-xl font-bold text-white">Launch Details</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-white/60 mb-1">Launched At</div>
                  <div className="text-white">{new Date(pool.launchedAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Block Number</div>
                  <div className="text-white">{pool.blockNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Transaction Hash</div>
                  <a
                    href={`https://sepolia.uniscan.xyz/tx/${pool.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline flex items-center gap-1 break-all"
                  >
                    {pool.txHash}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
