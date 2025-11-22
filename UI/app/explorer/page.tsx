"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { mockAMMPools } from "@/lib/mock-data"
import { Search, TrendingUp } from "lucide-react"

type SortOption = "tvl" | "volume" | "apy"

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("tvl")

  const filteredPools = mockAMMPools.filter((pool) => {
    const query = searchQuery.toLowerCase()
    return (
      pool.tokenA.symbol.toLowerCase().includes(query) ||
      pool.tokenB.symbol.toLowerCase().includes(query) ||
      `${pool.tokenA.symbol}/${pool.tokenB.symbol}`.toLowerCase().includes(query)
    )
  })

  const sortedPools = [...filteredPools].sort((a, b) => {
    if (sortBy === "tvl") {
      return Number.parseFloat(b.tvl.replace(/[$M,]/g, "")) - Number.parseFloat(a.tvl.replace(/[$M,]/g, ""))
    }
    if (sortBy === "volume") {
      return Number.parseFloat(b.volume24h.replace(/[$M,]/g, "")) - Number.parseFloat(a.volume24h.replace(/[$M,]/g, ""))
    }
    if (sortBy === "apy") {
      return Number.parseFloat(b.apy.replace("%", "")) - Number.parseFloat(a.apy.replace("%", ""))
    }
    return 0
  })

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">AMM Pool Explorer</h1>
          <p className="text-lg text-muted-foreground">Browse and explore all available automated market maker pools</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Pools</div>
            <div className="text-2xl font-bold text-primary">{mockAMMPools.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total TVL</div>
            <div className="text-2xl font-bold text-primary">$183.9M</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">24h Volume</div>
            <div className="text-2xl font-bold text-primary">$55.8M</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Avg APY</div>
            <div className="text-2xl font-bold text-primary">25.4%</div>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pools (e.g., ETH, USDC, ETH/USDC)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Button variant={sortBy === "tvl" ? "default" : "outline"} size="sm" onClick={() => setSortBy("tvl")}>
              TVL
            </Button>
            <Button variant={sortBy === "volume" ? "default" : "outline"} size="sm" onClick={() => setSortBy("volume")}>
              Volume
            </Button>
            <Button variant={sortBy === "apy" ? "default" : "outline"} size="sm" onClick={() => setSortBy("apy")}>
              APY
            </Button>
          </div>
        </div>

        {/* Pool Grid */}
        {sortedPools.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedPools.map((pool) => (
              <Link key={pool.id} href={`/pool/${pool.id}`}>
                <Card className="group h-full p-6 transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50">
                  {/* Token Pair Header */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Image
                          src={pool.tokenA.logo || "/placeholder.svg"}
                          alt={pool.tokenA.symbol}
                          width={40}
                          height={40}
                          className="rounded-full border-2 border-background"
                        />
                        <Image
                          src={pool.tokenB.logo || "/placeholder.svg"}
                          alt={pool.tokenB.symbol}
                          width={40}
                          height={40}
                          className="absolute -right-3 top-0 rounded-full border-2 border-background"
                        />
                      </div>
                      <div className="ml-3">
                        <div className="text-lg font-semibold">
                          {pool.tokenA.symbol}/{pool.tokenB.symbol}
                        </div>
                        <div className="text-xs text-muted-foreground">Fee: {pool.fees}</div>
                      </div>
                    </div>
                  </div>

                  {/* Pool Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">TVL</span>
                      <span className="font-semibold">{pool.tvl}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">24h Volume</span>
                      <span className="font-semibold">{pool.volume24h}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">APY</span>
                      <span className="flex items-center gap-1 font-semibold text-accent">
                        <TrendingUp className="h-3 w-3" />
                        {pool.apy}
                      </span>
                    </div>
                  </div>

                  {/* Liquidity Info */}
                  <div className="mt-6 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="mb-1 text-xs text-muted-foreground">Pool Liquidity</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{pool.tokenA.symbol}:</span>
                        <span className="font-medium">{pool.liquidity.tokenA}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{pool.tokenB.symbol}:</span>
                        <span className="font-medium">{pool.liquidity.tokenB}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Action */}
                  <div className="mt-4 text-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    View Pool Details →
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No pools found</h3>
            <p className="text-muted-foreground">Try adjusting your search query or browse all available pools</p>
            <Button onClick={() => setSearchQuery("")} variant="outline" className="mt-4">
              Clear Search
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
