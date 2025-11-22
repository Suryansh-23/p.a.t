"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"

const STEPS = [
  { id: 1, title: "Token Pair", description: "Select your trading pair" },
  { id: 2, title: "Initial Liquidity", description: "Set starting liquidity" },
  { id: 3, title: "Fee Structure", description: "Configure fees" },
  { id: 4, title: "Review & Deploy", description: "Confirm and launch" },
]

export default function DeployPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    tokenA: "",
    tokenB: "",
    tokenAAmount: "",
    tokenBAmount: "",
    swapFee: "0.3",
    lpFee: "0.25",
  })

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
    console.log("[v0] Deploying AMM with data:", formData)
    alert("AMM deployed successfully!")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">Deploy New AMM</h1>
            <p className="text-lg text-muted-foreground">
              Create your own automated market maker pool in a few simple steps
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        currentStep > step.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : currentStep === step.id
                            ? "border-primary bg-background text-primary"
                            : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </div>
                    <div className="mt-2 hidden text-center md:block">
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-muted-foreground">{step.description}</div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        currentStep > step.id ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <Card className="p-8">
            {/* Step 1: Token Pair */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Select Token Pair</h2>
                  <p className="text-muted-foreground">Choose the two tokens for your AMM pool</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenA">Token A Address</Label>
                    <Input
                      id="tokenA"
                      placeholder="0x..."
                      value={formData.tokenA}
                      onChange={(e) => handleInputChange("tokenA", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Enter the contract address of the first token</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tokenB">Token B Address</Label>
                    <Input
                      id="tokenB"
                      placeholder="0x..."
                      value={formData.tokenB}
                      onChange={(e) => handleInputChange("tokenB", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Enter the contract address of the second token</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Initial Liquidity */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Set Initial Liquidity</h2>
                  <p className="text-muted-foreground">Define the starting liquidity for your pool</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenAAmount">Token A Amount</Label>
                    <Input
                      id="tokenAAmount"
                      type="number"
                      placeholder="0.0"
                      value={formData.tokenAAmount}
                      onChange={(e) => handleInputChange("tokenAAmount", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Amount of Token A to deposit</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tokenBAmount">Token B Amount</Label>
                    <Input
                      id="tokenBAmount"
                      type="number"
                      placeholder="0.0"
                      value={formData.tokenBAmount}
                      onChange={(e) => handleInputChange("tokenBAmount", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Amount of Token B to deposit</p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="mb-2 text-sm font-medium">Initial Price Ratio</div>
                    <div className="text-2xl font-bold text-primary">
                      {formData.tokenAAmount && formData.tokenBAmount
                        ? (Number.parseFloat(formData.tokenBAmount) / Number.parseFloat(formData.tokenAAmount)).toFixed(
                            6,
                          )
                        : "0.000000"}
                    </div>
                    <div className="text-xs text-muted-foreground">Token B per Token A</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Fee Structure */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Configure Fees</h2>
                  <p className="text-muted-foreground">Set the fee structure for your AMM pool</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="swapFee">Swap Fee (%)</Label>
                    <Input
                      id="swapFee"
                      type="number"
                      step="0.01"
                      placeholder="0.3"
                      value={formData.swapFee}
                      onChange={(e) => handleInputChange("swapFee", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Fee charged on each swap (recommended: 0.3%)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lpFee">LP Provider Fee (%)</Label>
                    <Input
                      id="lpFee"
                      type="number"
                      step="0.01"
                      placeholder="0.25"
                      value={formData.lpFee}
                      onChange={(e) => handleInputChange("lpFee", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of swap fees distributed to liquidity providers
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Swap Fee</div>
                        <div className="text-lg font-semibold">{formData.swapFee}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">LP Fee</div>
                        <div className="text-lg font-semibold">{formData.lpFee}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Protocol Fee</div>
                        <div className="text-lg font-semibold">
                          {(Number.parseFloat(formData.swapFee) - Number.parseFloat(formData.lpFee)).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total Fee</div>
                        <div className="text-lg font-semibold text-primary">{formData.swapFee}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Deploy */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Review & Deploy</h2>
                  <p className="text-muted-foreground">Review your AMM configuration before deploying</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 font-semibold">Token Pair</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token A:</span>
                        <span className="font-mono">{formData.tokenA || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token B:</span>
                        <span className="font-mono">{formData.tokenB || "Not set"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 font-semibold">Initial Liquidity</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token A Amount:</span>
                        <span className="font-semibold">{formData.tokenAAmount || "0.0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token B Amount:</span>
                        <span className="font-semibold">{formData.tokenBAmount || "0.0"}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-muted-foreground">Price Ratio:</span>
                        <span className="font-semibold text-primary">
                          {formData.tokenAAmount && formData.tokenBAmount
                            ? (
                                Number.parseFloat(formData.tokenBAmount) / Number.parseFloat(formData.tokenAAmount)
                              ).toFixed(6)
                            : "0.000000"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 font-semibold">Fee Structure</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Swap Fee:</span>
                        <span className="font-semibold">{formData.swapFee}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LP Provider Fee:</span>
                        <span className="font-semibold">{formData.lpFee}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protocol Fee:</span>
                        <span className="font-semibold">
                          {(Number.parseFloat(formData.swapFee) - Number.parseFloat(formData.lpFee)).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-accent bg-accent/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <span className="text-xs">!</span>
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="font-semibold">Important</div>
                        <div className="text-muted-foreground">
                          Once deployed, the token pair and initial ratio cannot be changed. Make sure all details are
                          correct before proceeding.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="gap-2 bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </div>

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext} className="gap-2">
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

          {/* Info Section */}
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Deployment Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-medium">Estimated Gas Fee</div>
                <div className="text-2xl font-bold text-primary">~0.05 ETH</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">Deployment Time</div>
                <div className="text-2xl font-bold text-primary">~2 minutes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
