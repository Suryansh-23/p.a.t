"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"

const STEPS = [
  { id: 1, title: "Curator Details", description: "Who is managing this pool" },
  { id: 2, title: "Assets & Funding", description: "Seed capital & fee" },
  { id: 3, title: "Strategy Adapter", description: "Select or write strategy" },
  { id: 4, title: "Threshold Adapter", description: "Guardrails & monitoring" },
  { id: 5, title: "Review & Launch", description: "Confirm configuration" },
]

const CONTRACT_SNIPPET = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address initialReceiver
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(initialReceiver != address(0), "Receiver is zero");
        _mint(initialReceiver, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}`;

const STRATEGY_SNIPPETS: Record<string, string> = {
  presetA: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VolumeWeightedAdapter {
    function execute(bytes memory data) external {
        // Example: rebalance liquidity proportional to pool volume
    }
}`,
  presetB: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MarketNeutralAdapter {
    function execute(bytes memory data) external {
        // Example: hedge inventory and keep delta neutral
    }
}`,
}

const STRATEGIES = [
  { id: "presetA", title: "Volume Weighted Adapter", description: "Reference strategy optimized for TVL growth." },
  { id: "presetB", title: "Market Neutral Adapter", description: "Dampens volatility with hedged curves." },
  { id: "custom", title: "Bring your own adapter", description: "Paste your adapter contract to deploy with the pool." },
]

const THRESHOLD_SNIPPETS: Record<string, string> = {
  thresholdA: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VolatilityThreshold {
    function check(uint256 volatility) external pure returns (bool) {
        return volatility < 80;
    }
}`,
  thresholdB: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LiquidityGuard {
    function check(uint256 depth) external pure returns (bool) {
        return depth > 1_000 ether;
    }
}`,
}

const THRESHOLD_STRATEGIES = [
  { id: "thresholdA", title: "Volatility Threshold", description: "Throttle swaps when volatility spikes." },
  { id: "thresholdB", title: "Liquidity Guard", description: "Require minimum depth before routing trades." },
  { id: "thresholdCustom", title: "Custom Threshold Module", description: "Paste your own enforcement logic." },
]

export default function DeployPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedStrategy, setSelectedStrategy] = useState("presetA")
  const [selectedThreshold, setSelectedThreshold] = useState("thresholdA")
  const [formData, setFormData] = useState({
    curator: "",
    curatorName: "",
    curatorWebsite: "",
    token0: "",
    token1: "",
    token0Amount: "",
    token1Amount: "",
    fee: "0.3",
    customStrategyCode: "",
    customThresholdCode: "",
    strategyAdapter: "",
    thresholdAdapter: "",
  })

  const generateMockAddress = () =>
    `0x${Array.from({ length: 40 })
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("")}`

  const handleStrategyDeploy = () => {
    const code = selectedStrategy === "custom" ? formData.customStrategyCode.trim() : STRATEGY_SNIPPETS[selectedStrategy]
    if (!code) {
      alert("Please provide adapter code before deploying.")
      return
    }
    const address = generateMockAddress()
    setFormData((prev) => ({ ...prev, strategyAdapter: address }))
    alert(`Strategy adapter deployed at ${address}`)
  }

  const handleThresholdDeploy = () => {
    const code =
      selectedThreshold === "thresholdCustom"
        ? formData.customThresholdCode.trim()
        : THRESHOLD_SNIPPETS[selectedThreshold as keyof typeof THRESHOLD_SNIPPETS]
    if (!code) {
      alert("Please provide threshold code before deploying.")
      return
    }
    const address = generateMockAddress()
    setFormData((prev) => ({ ...prev, thresholdAdapter: address }))
    alert(`Threshold adapter deployed at ${address}`)
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleDeploy = () => {
    const strategyCode =
      selectedStrategy === "custom"
        ? formData.customStrategyCode
        : STRATEGY_SNIPPETS[selectedStrategy as keyof typeof STRATEGY_SNIPPETS] || CONTRACT_SNIPPET
    const thresholdCode =
      selectedThreshold === "thresholdCustom"
        ? formData.customThresholdCode
        : THRESHOLD_SNIPPETS[selectedThreshold as keyof typeof THRESHOLD_SNIPPETS]
    console.log("[v0] Deploying AMM with data:", {
      ...formData,
      selectedStrategy,
      selectedThreshold,
      strategyCode,
      thresholdCode,
    })
    alert("AMM deployed successfully!")
  }

  const strategySnippet =
    selectedStrategy === "custom"
      ? formData.customStrategyCode || "// Paste your adapter contract here..."
      : STRATEGY_SNIPPETS[selectedStrategy as keyof typeof STRATEGY_SNIPPETS] || CONTRACT_SNIPPET

  const thresholdSnippet =
    selectedThreshold === "thresholdCustom"
      ? formData.customThresholdCode || "// Paste your threshold module here..."
      : THRESHOLD_SNIPPETS[selectedThreshold as keyof typeof THRESHOLD_SNIPPETS] || THRESHOLD_SNIPPETS.thresholdA

  const isNextDisabled =
    (currentStep === 3 && !formData.strategyAdapter) || (currentStep === 4 && !formData.thresholdAdapter)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03030f] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050611] via-[#030617] to-[#010109]" />
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#0500e1]/25 blur-[160px]" />
        <div className="absolute right-0 top-20 h-72 w-72 translate-x-1/3 rounded-full bg-[#5c60ff]/20 blur-[160px]" />
      </div>

      <Navigation />

      <div className="container mx-auto max-w-6xl px-6 pt-32 pb-20">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">Deploy New AMM</h1>
            <p className="text-lg text-muted-foreground">
              Create your own automated market maker pool in a few simple steps
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12 grid grid-cols-5 items-center gap-0">
            {STEPS.map((step, index) => {
              const state =
                currentStep > step.id ? "completed" : currentStep === step.id ? "current" : "upcoming"
              const background = state === "completed" ? "bg-[#7731EA]" : "bg-transparent"
              const border =
                state === "completed"
                  ? "border-[#7731EA]"
                  : state === "current"
                    ? "border-white/80"
                    : "border-white/20"
              const text = state === "completed" ? "text-white" : state === "current" ? "text-white" : "text-muted-foreground"

              return (
                <div key={step.id} className="flex flex-col items-center gap-1 relative px-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${background} ${border} ${text} text-sm font-semibold transition-all`}
                  >
                    {step.id}
                  </div>
                  <span className="text-xs font-medium tracking-wide text-white text-center">{step.title}</span>
                  {index < STEPS.length - 1 && (
                    <div className="absolute right-0 top-1/2 hidden h-px w-1/2 translate-x-1/2 items-center justify-end sm:flex">
                      <div className="h-0.5 w-full bg-white/20" />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="ml-2 h-5 w-5 text-white/60"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Form Card */}
          <Card className="border-white/10 bg-[#050611]/70 p-8 backdrop-blur">
            {/* Step 1: Curator Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Curator Details</h2>
                  <p className="text-muted-foreground">Tell us who is responsible for this pool</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="curator">Curator Address</Label>
                    <Input
                      id="curator"
                      placeholder="0x..."
                      value={formData.curator}
                      onChange={(e) => handleInputChange("curator", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Primary wallet managing the pool.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curatorName">Curator Name</Label>
                    <Input
                      id="curatorName"
                      placeholder="Prop Labs"
                      value={formData.curatorName}
                      onChange={(e) => handleInputChange("curatorName", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Public name surfaced to LPs.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curatorWebsite">Website</Label>
                    <Input
                      id="curatorWebsite"
                      placeholder="https://prop.example"
                      value={formData.curatorWebsite}
                      onChange={(e) => handleInputChange("curatorWebsite", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Optional disclosures or documentation.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Assets & Funding */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Assets & Funding</h2>
                  <p className="text-muted-foreground">Provide the token addresses, seed amounts, and fee</p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="token0">Token 0 Address</Label>
                      <Input
                        id="token0"
                        placeholder="0x..."
                        value={formData.token0}
                        onChange={(e) => handleInputChange("token0", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Address of the first asset.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token1">Token 1 Address</Label>
                      <Input
                        id="token1"
                        placeholder="0x..."
                        value={formData.token1}
                        onChange={(e) => handleInputChange("token1", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Address of the second asset.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="token0Amount">Token 0 Seed Amount</Label>
                      <Input
                        id="token0Amount"
                        type="number"
                        placeholder="0.0"
                        value={formData.token0Amount}
                        onChange={(e) => handleInputChange("token0Amount", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Amount of token0 to deposit.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token1Amount">Token 1 Seed Amount</Label>
                      <Input
                        id="token1Amount"
                        type="number"
                        placeholder="0.0"
                        value={formData.token1Amount}
                        onChange={(e) => handleInputChange("token1Amount", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Amount of token1 to deposit.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fee">Pool Fee (%)</Label>
                      <Input
                        id="fee"
                        type="number"
                        step="0.01"
                        placeholder="0.3"
                        value={formData.fee}
                        onChange={(e) => handleInputChange("fee", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Fee tier applied to swaps.</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 text-sm font-medium">Initial Price Ratio</div>
                    <div className="text-2xl font-bold text-primary">
                      {formData.token0Amount && formData.token1Amount
                        ? (Number.parseFloat(formData.token1Amount) / Number.parseFloat(formData.token0Amount)).toFixed(
                            6,
                          )
                        : "0.000000"}
                    </div>
                    <div className="text-xs text-muted-foreground">Token1 per Token0</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Strategy Adapter */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:w-1/2 xl:w-5/12 max-w-5xl">
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold">Strategy Adapter</h2>
                      <p className="text-sm text-muted-foreground">
                        Choose a strategy module to orchestrate liquidity movements.
                      </p>
                      <div className="space-y-3">
                        {STRATEGIES.map((strategy) => (
                          <Card
                            key={strategy.id}
                            className={`cursor-pointer border ${selectedStrategy === strategy.id ? "border-primary" : "border-white/10"} bg-transparent p-5 transition`}
                            onClick={() => setSelectedStrategy(strategy.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">{strategy.title}</h3>
                                <p className="text-sm text-muted-foreground">{strategy.description}</p>
                              </div>
                              <div
                                className={`h-4 w-4 rounded-full border ${selectedStrategy === strategy.id ? "border-primary bg-primary" : "border-white/30"}`}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 lg:flex-1 lg:min-w-0">
                    <h3 className="font-semibold">Adapter Preview</h3>
                    <p className="text-xs text-muted-foreground">Deployed before proceeding to threshold guardrails.</p>
                    {selectedStrategy === "custom" ? (
                      <textarea
                        id="customStrategyCode"
                        className="mt-4 h-48 w-full rounded-lg border border-white/10 bg-[#050611]/60 p-3 text-xs"
                        placeholder="Paste your adapter contract here..."
                        value={formData.customStrategyCode}
                        onChange={(e) => handleInputChange("customStrategyCode", e.target.value)}
                      />
                    ) : (
                      <div className="mt-4 rounded-lg border border-white/10 bg-[#050611]/60 p-4 text-xs text-muted-foreground">
                        <pre className="overflow-x-auto whitespace-pre-wrap">{strategySnippet}</pre>
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-3">
                      <Button onClick={handleStrategyDeploy} className="w-full">
                        Deploy Strategy Adapter
                      </Button>
                      {formData.strategyAdapter && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                          <p className="text-muted-foreground">Adapter deployed at:</p>
                          <p className="font-mono text-primary">{formData.strategyAdapter}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Threshold Adapter */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:w-1/2 xl:w-5/12">
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold">Threshold Adapter</h2>
                      <p className="text-sm text-muted-foreground">
                        Configure guardrails to pause or throttle activity based on custom logic.
                      </p>
                      <div className="space-y-3">
                        {THRESHOLD_STRATEGIES.map((strategy) => (
                          <Card
                            key={strategy.id}
                            className={`cursor-pointer border ${selectedThreshold === strategy.id ? "border-primary" : "border-white/10"} bg-transparent p-5`}
                            onClick={() => setSelectedThreshold(strategy.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">{strategy.title}</h3>
                                <p className="text-sm text-muted-foreground">{strategy.description}</p>
                              </div>
                              <div
                                className={`h-4 w-4 rounded-full border ${selectedThreshold === strategy.id ? "border-primary bg-primary" : "border-white/30"}`}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 lg:flex-1 lg:min-w-0">
                    <h3 className="font-semibold">Threshold Module</h3>
                    <p className="text-xs text-muted-foreground">Ensure safe execution before final launch.</p>
                    {selectedThreshold === "thresholdCustom" ? (
                      <textarea
                        id="customThresholdCode"
                        className="mt-4 h-48 w-full rounded-lg border border-white/10 bg-[#050611]/60 p-3 text-xs"
                        placeholder="Paste your threshold adapter..."
                        value={formData.customThresholdCode}
                        onChange={(e) => handleInputChange("customThresholdCode", e.target.value)}
                      />
                    ) : (
                      <div className="mt-4 rounded-lg border border-white/10 bg-[#050611]/60 p-4 text-xs text-muted-foreground">
                        <pre className="overflow-x-auto whitespace-pre-wrap">{thresholdSnippet}</pre>
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-3">
                      <Button onClick={handleThresholdDeploy} className="w-full" variant="outline">
                        Deploy Threshold Adapter
                      </Button>
                      {formData.thresholdAdapter && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                          <p className="text-muted-foreground">Threshold adapter deployed at:</p>
                          <p className="font-mono text-primary">{formData.thresholdAdapter}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review & Deploy */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Review & Deploy</h2>
                  <p className="text-muted-foreground">Review your launch configuration before deploying</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold">Curator</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-mono">{formData.curator || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-semibold">{formData.curatorName || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Website:</span>
                        <span className="font-semibold">{formData.curatorWebsite || "Not set"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold">Launch Config</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token0 / Token1:</span>
                        <span className="font-mono text-xs">
                          {formData.token0 || "Not set"} / {formData.token1 || "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seed Amounts:</span>
                        <span className="font-semibold">
                          {formData.token0Amount || "0"} / {formData.token1Amount || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee:</span>
                        <span className="font-semibold">{formData.fee || "0"}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Strategy:</span>
                        <span className="font-semibold">{selectedStrategy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold">Adapters</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Strategy Option:</span>
                        <span className="font-semibold">{selectedStrategy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Threshold Option:</span>
                        <span className="font-semibold">{selectedThreshold}</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="strategyAdapter">Strategy Adapter Address</Label>
                        <Input
                          id="strategyAdapter"
                          placeholder="0x..."
                          value={formData.strategyAdapter}
                          onChange={(e) => handleInputChange("strategyAdapter", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="thresholdAdapter">Threshold Adapter Address</Label>
                        <Input
                          id="thresholdAdapter"
                          placeholder="0x..."
                          value={formData.thresholdAdapter}
                          onChange={(e) => handleInputChange("thresholdAdapter", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold text-primary">Important</h3>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <span className="text-xs">!</span>
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="text-muted-foreground">
                          Once deployed, token selections and adapters cannot be changed. Review the LaunchConfig
                          carefully before signing the transaction.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="gap-2 border-white/20 bg-transparent text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext} className="gap-2" disabled={isNextDisabled}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleDeploy} className="gap-2">
                  <Check className="h-4 w-4" />
                  Deploy AMM
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
