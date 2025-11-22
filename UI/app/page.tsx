import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { ArrowRight, Zap, Shield, TrendingUp, Users, Rocket, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            Protocol v1.0 Now Live
          </div>

          <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Next-Generation{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Automated Market Makers
            </span>
          </h1>

          <p className="mb-10 text-pretty text-lg text-muted-foreground sm:text-xl">
            Deploy, manage, and trade on decentralized AMM pools with minimal fees and maximum efficiency. Built for the
            future of DeFi.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/deploy">
                Launch AMM
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
              <Link href="/explorer">Explore Pools</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">$127M+</div>
              <div className="text-sm text-muted-foreground">Total Value Locked</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">2,547</div>
              <div className="text-sm text-muted-foreground">Active AMM Pools</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">98.7%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">15K+</div>
              <div className="text-sm text-muted-foreground">Active Traders</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight">Why Choose Prop AMMs?</h2>
          <p className="text-pretty text-lg text-muted-foreground">
            Built with security, efficiency, and user experience in mind
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Execute trades in milliseconds with our optimized smart contracts and low-latency infrastructure.
            </p>
          </Card>

          <Card className="group p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Secure & Audited</h3>
            <p className="text-muted-foreground">
              Battle-tested smart contracts audited by leading security firms to protect your assets.
            </p>
          </Card>

          <Card className="group p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Low Fees</h3>
            <p className="text-muted-foreground">
              Keep more of your profits with industry-leading low fees and gas optimization.
            </p>
          </Card>

          <Card className="group p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Community Driven</h3>
            <p className="text-muted-foreground">
              Governed by the community with transparent on-chain voting and decentralized decision making.
            </p>
          </Card>

          <Card className="group p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Rocket className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Easy Deployment</h3>
            <p className="text-muted-foreground">
              Deploy your own AMM pool in minutes with our intuitive interface and guided setup process.
            </p>
          </Card>

          <Card className="group p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Advanced Analytics</h3>
            <p className="text-muted-foreground">
              Track performance with real-time analytics, historical data, and comprehensive reporting.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight">Ready to Get Started?</h2>
            <p className="mb-8 text-pretty text-lg text-muted-foreground">
              Join thousands of traders and liquidity providers building the future of decentralized finance.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/deploy">
                  Deploy Your AMM
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/explorer">View All Pools</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-primary-foreground"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                </div>
                <span className="text-lg font-semibold">Prop AMMs</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Building the future of decentralized automated market makers.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Protocol</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/deploy" className="hover:text-foreground">
                    Deploy
                  </Link>
                </li>
                <li>
                  <Link href="/explorer" className="hover:text-foreground">
                    Explorer
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Discord
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Governance
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Prop AMMs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
