"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowDownUp, Settings, Info } from "lucide-react"
import type { AMMPool } from "@/lib/mock-data"

interface SwapInterfaceProps {
  pool: AMMPool
}

export function SwapInterface({ pool }: SwapInterfaceProps) {
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [isReversed, setIsReversed] = useState(false)

  const currentFromToken = isReversed ? pool.tokenB : pool.tokenA
  const currentToToken = isReversed ? pool.tokenA : pool.tokenB

  const handleSwapTokens = () => {
    setIsReversed(!isReversed)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    if (value && !isNaN(Number.parseFloat(value))) {
      // Simple mock calculation - in reality this would use AMM formula
      const mockRate = 1850.5
      const calculated = (Number.parseFloat(value) * mockRate).toFixed(2)
      setToAmount(calculated)
    } else {
      setToAmount("")
    }
  }

  const handleSwap = () => {
    console.log("[v0] Executing swap:", {
      from: currentFromToken.symbol,
      to: currentToToken.symbol,
      amount: fromAmount,
      expected: toAmount,
    })
    alert(`Swap successful! ${fromAmount} ${currentFromToken.symbol} → ${toAmount} ${currentToToken.symbol}`)
    setFromAmount("")
    setToAmount("")
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Swap</h2>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* From Token */}
      <div className="mb-2 space-y-2">
        <Label className="text-muted-foreground">From</Label>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src={currentFromToken.logo || "/placeholder.svg"}
                alt={currentFromToken.symbol}
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-lg font-semibold">{currentFromToken.symbol}</span>
            </div>
            <div className="text-sm text-muted-foreground">Balance: 0.00</div>
          </div>
          <Input
            type="number"
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => handleFromAmountChange(e.target.value)}
            className="border-0 bg-transparent p-0 text-2xl font-semibold focus-visible:ring-0"
          />
          <div className="mt-2 text-sm text-muted-foreground">~$0.00</div>
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="relative my-4 flex justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={handleSwapTokens}
          className="relative z-10 h-10 w-10 rounded-full border-4 border-background bg-transparent"
        >
          <ArrowDownUp className="h-4 w-4" />
        </Button>
      </div>

      {/* To Token */}
      <div className="mb-6 space-y-2">
        <Label className="text-muted-foreground">To</Label>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src={currentToToken.logo || "/placeholder.svg"}
                alt={currentToToken.symbol}
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-lg font-semibold">{currentToToken.symbol}</span>
            </div>
            <div className="text-sm text-muted-foreground">Balance: 0.00</div>
          </div>
          <Input
            type="number"
            placeholder="0.0"
            value={toAmount}
            readOnly
            className="border-0 bg-transparent p-0 text-2xl font-semibold focus-visible:ring-0"
          />
          <div className="mt-2 text-sm text-muted-foreground">~$0.00</div>
        </div>
      </div>

      {/* Swap Details */}
      {fromAmount && toAmount && (
        <div className="mb-6 space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium">
              1 {currentFromToken.symbol} = {(Number.parseFloat(toAmount) / Number.parseFloat(fromAmount)).toFixed(2)}{" "}
              {currentToToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fee</span>
            <span className="font-medium">{pool.fees}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Price Impact</span>
            <span className="font-medium text-accent">{"<"}0.01%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Minimum Received</span>
            <span className="font-medium">
              {(Number.parseFloat(toAmount) * 0.995).toFixed(2)} {currentToToken.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <Button onClick={handleSwap} disabled={!fromAmount || !toAmount} size="lg" className="w-full">
        {!fromAmount || !toAmount ? "Enter an amount" : "Swap"}
      </Button>

      {/* Info */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>Output is estimated. You will receive at least the minimum amount or the transaction will revert.</span>
      </div>
    </Card>
  )
}
