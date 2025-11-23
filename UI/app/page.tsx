import { Navigation } from "@/components/navigation"
import FaultyTerminal from "@/components/FaultyTerminal"

const reasons = [
  {
    title: "Private execution",
    body: "Strategies run inside attested TEEs so alpha never leaves the enclave.",
  },
  {
    title: "Deterministic settlement",
    body: "Proof-backed receipts finalize on-chain, keeping capital composable.",
  },
  {
    title: "Operator control",
    body: "You decide which metrics surface to counterparties and when.",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050611] text-foreground">
      <Navigation />

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Background Terminal Effect */}
        <div className="absolute inset-0 z-0" style={{ opacity: 0.3 }}>
          <FaultyTerminal
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={1}
            pause={false}
            scanlineIntensity={1}
            glitchAmount={1}
            flickerAmount={1}
            noiseAmp={1}
            chromaticAberration={0}
            dither={0}
            curvature={0}
            tint="#5572B4"
            mouseReact={true}
            mouseStrength={0.5}
            pageLoadAnimation={false}
            brightness={1}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Prop AMMs</p>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold sm:text-5xl">
            Proprietary Automated Market Makers using TEEs
          </h1>
        </div>
      </section>

      {/* Why PAT */}
      <section id="why" className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-4xl space-y-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Why PAT?</p>
            <h2 className="mt-4 text-3xl font-semibold">The essentials</h2>
          </div>
          <div className="space-y-6 sm:space-y-0 sm:divide-x sm:divide-white/10 sm:border sm:border-white/10 sm:grid sm:grid-cols-3">
            {reasons.map((reason) => (
              <div key={reason.title} className="space-y-2 px-0 py-0 sm:px-6 sm:py-4">
                <h3 className="text-lg font-semibold">{reason.title}</h3>
                <p className="text-sm text-muted-foreground">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
