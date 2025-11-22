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
          <h1 className="mb-4 text-4xl font-bold tracking-tight">AMM Pool Explorer</h1>
          <p className="text-lg text-muted-foreground">Browse and explore all available automated market maker pools</p>
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
        {sortedPools.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sortedPools.map((pool) => (
              <Card
                key={pool.id}
                className="flex h-full flex-col border-white/10 bg-[#050818]/90 p-5 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {pool.tokenA.symbol} · {pool.tokenB.symbol}
                    </p>
                    <h3 className="text-lg font-semibold">{pool.tokenA.symbol + "/" + pool.tokenB.symbol}</h3>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p>TVL</p>
                    <p className="text-base font-semibold text-foreground">{pool.tvl}</p>
                  </div>
                  <div>
                    <p>ETH Vol</p>
                    <p className="text-base font-semibold text-foreground">{pool.volume24h}</p>
                  </div>
                  <div>
                    <p>ETH Vol</p>
                    <p className="text-base font-semibold text-foreground">{pool.volume24h}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Button
                    asChild
                    size="sm"
                    className="w-full justify-center border border-white/20 bg-transparent text-white hover:bg-primary/10 hover:text-white"
                    variant="outline"
                  >
                    <Link href={`/pool/${pool.id}`}>View Details</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-white/10 bg-[#060b20]/80 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No pools found</h3>
            <p className="text-muted-foreground">Try adjusting your search query or browse all available pools</p>
            <Button
              onClick={() => setSearchQuery("")}
              variant="outline"
              className="mt-4 border-white/20 bg-transparent text-foreground"
            >
              Clear Search
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
