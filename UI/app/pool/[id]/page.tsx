import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SwapInterface } from "@/components/swap-interface"
import { mockAMMPools } from "@/lib/mock-data"
import { ArrowLeft, ExternalLink, TrendingUp, Users, Droplet, BarChart3 } from "lucide-react"

export function generateStaticParams() {
  return mockAMMPools.map((pool) => ({
    id: pool.id,
  }))
}

export default function PoolDetailPage({ params }: { params: { id: string } }) {
  const pool = mockAMMPools.find((p) => p.id === params.id)

  if (!pool) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/explorer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explorer
          </Link>
        </Button>

        {/* Pool Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <Image
                src={pool.tokenA.logo || "/placeholder.svg"}
                alt={pool.tokenA.symbol}
                width={56}
                height={56}
                className="rounded-full border-2 border-background"
              />
              <Image
                src={pool.tokenB.logo || "/placeholder.svg"}
                alt={pool.tokenB.symbol}
                width={56}
                height={56}
                className="absolute -right-4 top-0 rounded-full border-2 border-background"
              />
            </div>
            <div className="ml-4">
              <h1 className="text-4xl font-bold tracking-tight">
                {pool.tokenA.symbol}/{pool.tokenB.symbol}
              </h1>
              <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Fee: {pool.fees}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Pool ID: {pool.id}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Droplet className="h-4 w-4" />
              <span className="text-sm">Total Value Locked</span>
            </div>
            <div className="text-2xl font-bold">{pool.tvl}</div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">24h Volume</span>
            </div>
            <div className="text-2xl font-bold">{pool.volume24h}</div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">APY</span>
            </div>
            <div className="text-2xl font-bold text-accent">{pool.apy}</div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Liquidity Providers</span>
            </div>
            <div className="text-2xl font-bold">1,247</div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Swap Interface */}
          <div className="lg:col-span-1">
            <SwapInterface pool={pool} />
          </div>

          {/* Right Column - Pool Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Pool Liquidity */}
            <Card className="p-6">
              <h3 className="mb-4 text-xl font-semibold">Pool Liquidity</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={pool.tokenA.logo || "/placeholder.svg"}
                      alt={pool.tokenA.symbol}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <div className="font-semibold">{pool.tokenA.symbol}</div>
                      <div className="text-sm text-muted-foreground">{pool.tokenA.address}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{pool.liquidity.tokenA}</div>
                    <div className="text-sm text-muted-foreground">
                      ~${(Number.parseFloat(pool.liquidity.tokenA.replace(/,/g, "")) * 2289).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={pool.tokenB.logo || "/placeholder.svg"}
                      alt={pool.tokenB.symbol}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <div className="font-semibold">{pool.tokenB.symbol}</div>
                      <div className="text-sm text-muted-foreground">{pool.tokenB.address}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{pool.liquidity.tokenB}</div>
                    <div className="text-sm text-muted-foreground">
                      ~${Number.parseFloat(pool.liquidity.tokenB.replace(/,/g, "")).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pool Stats */}
            <Card className="p-6">
              <h3 className="mb-4 text-xl font-semibold">Pool Statistics</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Total Fees (24h)</div>
                  <div className="text-2xl font-bold">$38,400</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Your Share</div>
                  <div className="text-2xl font-bold">0.00%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Volume (7d)</div>
                  <div className="text-2xl font-bold">$89.6M</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Transactions (24h)</div>
                  <div className="text-2xl font-bold">3,842</div>
                </div>
              </div>
            </Card>

            {/* Pool Actions */}
            <Card className="p-6">
              <h3 className="mb-4 text-xl font-semibold">Liquidity Provider Actions</h3>
              <p className="mb-4 text-muted-foreground">Add liquidity to earn trading fees and incentive rewards</p>
              <div className="flex gap-3">
                <Button size="lg" className="flex-1">
                  Add Liquidity
                </Button>
                <Button variant="outline" size="lg" className="flex-1 bg-transparent">
                  Remove Liquidity
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
