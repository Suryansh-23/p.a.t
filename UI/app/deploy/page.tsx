"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { useChainId, useWriteContract, useAccount, usePublicClient, useWalletClient } from "wagmi"
import { parseUnits } from "viem"
import { PropAMMContracts } from "@/utils/addresses"
import { PropAMMLaunchPadAbi } from "@/utils/abi/PropAMMLaunchPad"
import { uniChainSepolia } from "@/components/UniChainSepolia"
import { erc20Abi } from "@/utils/abi/erc20"
import {
  deployContract,
  getStrategyBytecode,
  getThresholdBytecode,
  encodeStrategyConstructorArgs,
  encodeThresholdConstructorArgs,
} from "@/utils/contractDeployer"
import {
  compileSolidityContract,
  extractContractName,
  validateStrategyAdapter,
  validateThresholdAdapter,
} from "@/utils/solidityCompiler"

const STEPS = [
  { id: 1, title: "Curator Details", description: "Who is managing this pool" },
  { id: 2, title: "Assets & Funding", description: "Seed capital & pool name" },
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
}

const STRATEGIES = [
  { id: "presetA", title: "Volume Weighted Adapter" },
  { id: "custom", title: "Bring your own adapter" },
]

const THRESHOLD_SNIPPETS: Record<string, string> = {
  thresholdA: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VolatilityThreshold {
    function check(uint256 volatility) external pure returns (bool) {
        return volatility < 80;
    }
}`,
}

const THRESHOLD_STRATEGIES = [
  { id: "thresholdA", title: "Volatility Threshold" },
  { id: "thresholdCustom", title: "Custom Threshold Module" },
]

export default function DeployPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedStrategy, setSelectedStrategy] = useState("presetA")
  const [selectedThreshold, setSelectedThreshold] = useState("thresholdA")
  const [formData, setFormData] = useState({
    curator: "",
    curatorName: "",
    curatorWebsite: "",
    poolName: "",
    token0: "",
    token1: "",
    token0Amount: "",
    token1Amount: "",
    customStrategyCode: "",
    customThresholdCode: "",
    strategyAdapter: "",
    thresholdAdapter: "",
  })
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const chainId = useChainId()
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: uniChainSepolia.id })
  const { data: walletClient } = useWalletClient({ chainId: uniChainSepolia.id })
  const { writeContractAsync, isPending: isLaunchPending } = useWriteContract()
  const [approvalsComplete, setApprovalsComplete] = useState(false)
  const [isApprovingTokens, setIsApprovingTokens] = useState(false)
  const [isDeployingStrategy, setIsDeployingStrategy] = useState(false)
  const [isDeployingThreshold, setIsDeployingThreshold] = useState(false)

  const generateMockAddress = () =>
    `0x${Array.from({ length: 40 })
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("")}`

  const handleStrategyDeploy = async () => {
    // Validation
    if (!address) {
      alert("Please connect your wallet before deploying.")
      return
    }
    if (chainId && chainId !== uniChainSepolia.id) {
      alert("Please switch to UniChain Sepolia to deploy the adapter.")
      return
    }
    if (!walletClient || !publicClient) {
      alert("Wallet client not available. Please refresh the page.")
      return
    }

    setIsDeployingStrategy(true)
    try {
      let bytecode: string
      let constructorArgs: `0x${string}`

      // Handle custom code
      if (selectedStrategy === "custom") {
        const customCode = formData.customStrategyCode.trim()
        if (!customCode) {
          alert("Please provide your custom adapter contract code before deploying.")
          return
        }

        // Validate the contract has required functions (just a warning, not blocking)
        const validation = validateStrategyAdapter(customCode)
        if (!validation.valid) {
          console.warn(`Strategy adapter validation warning: ${validation.error}`)
          // Show warning but don't block deployment
          if (!confirm(`Warning: ${validation.error}\n\nDo you want to proceed with deployment anyway?`)) {
            return
          }
        }

        // Compile the custom contract
        alert("Compiling your contract... This may take a few seconds.")
        const contractName = extractContractName(customCode)
        const result = await compileSolidityContract(customCode, contractName || undefined)

        if (!result.success) {
          const errorMsg = result.errors?.join('\n\n') || 'Unknown compilation error'
          alert(`Compilation failed:\n\n${errorMsg}`)
          return
        }

        if (result.warnings && result.warnings.length > 0) {
          console.warn("Compilation warnings:", result.warnings)
        }

        bytecode = result.bytecode!
        constructorArgs = '0x'
      } else {
        // Get bytecode for preset strategy
        bytecode = getStrategyBytecode(selectedStrategy) || ''
        if (!bytecode) {
          alert("Strategy bytecode not found. Please select a valid preset.")
          return
        }
        constructorArgs = encodeStrategyConstructorArgs()
      }

      // Deploy the contract
      const deployedAddress = await deployContract({
        bytecode,
        constructorArgs,
        walletClient,
        publicClient,
      })

      setFormData((prev) => ({ ...prev, strategyAdapter: deployedAddress }))
      alert(`Strategy adapter deployed successfully at ${deployedAddress}`)
    } catch (error) {
      console.error("Strategy deployment error:", error)
      alert((error as Error).message || "Failed to deploy strategy adapter.")
    } finally {
      setIsDeployingStrategy(false)
    }
  }

  const handleThresholdDeploy = async () => {
    // Validation
    if (!address) {
      alert("Please connect your wallet before deploying.")
      return
    }
    if (chainId && chainId !== uniChainSepolia.id) {
      alert("Please switch to UniChain Sepolia to deploy the adapter.")
      return
    }
    if (!walletClient || !publicClient) {
      alert("Wallet client not available. Please refresh the page.")
      return
    }

    setIsDeployingThreshold(true)
    try {
      let bytecode: string
      let constructorArgs: `0x${string}`

      // Handle custom code
      if (selectedThreshold === "thresholdCustom") {
        const customCode = formData.customThresholdCode.trim()
        if (!customCode) {
          alert("Please provide your custom threshold module code before deploying.")
          return
        }

        // Validate the contract has required functions (just a warning, not blocking)
        const validation = validateThresholdAdapter(customCode)
        if (!validation.valid) {
          console.warn(`Threshold adapter validation warning: ${validation.error}`)
          // Show warning but don't block deployment
          if (!confirm(`Warning: ${validation.error}\n\nDo you want to proceed with deployment anyway?`)) {
            return
          }
        }

        // Compile the custom contract
        alert("Compiling your contract... This may take a few seconds.")
        const contractName = extractContractName(customCode)
        const result = await compileSolidityContract(customCode, contractName || undefined)

        if (!result.success) {
          const errorMsg = result.errors?.join('\n\n') || 'Unknown compilation error'
          alert(`Compilation failed:\n\n${errorMsg}`)
          return
        }

        if (result.warnings && result.warnings.length > 0) {
          console.warn("Compilation warnings:", result.warnings)
        }

        bytecode = result.bytecode!
        constructorArgs = '0x'
      } else {
        // Get bytecode for preset threshold
        bytecode = getThresholdBytecode(selectedThreshold) || ''
        if (!bytecode) {
          alert("Threshold bytecode not found. Please select a valid preset.")
          return
        }
        constructorArgs = encodeThresholdConstructorArgs()
      }

      // Deploy the contract
      const deployedAddress = await deployContract({
        bytecode,
        constructorArgs,
        walletClient,
        publicClient,
      })

      setFormData((prev) => ({ ...prev, thresholdAdapter: deployedAddress }))
      alert(`Threshold adapter deployed successfully at ${deployedAddress}`)
    } catch (error) {
      console.error("Threshold deployment error:", error)
      alert((error as Error).message || "Failed to deploy threshold adapter.")
    } finally {
      setIsDeployingThreshold(false)
    }
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

  const ADDRESS_FIELDS = new Set([
    "curator",
    "token0",
    "token1",
    "strategyAdapter",
    "thresholdAdapter",
  ])

  const handleInputChange = (field: string, value: string) => {
    const nextValue = ADDRESS_FIELDS.has(field) ? value.toLowerCase() : value
    setFormData((prev) => ({ ...prev, [field]: nextValue }))
    if (field === "token0" || field === "token0Amount" || field === "token1" || field === "token1Amount") {
      setApprovalsComplete(false)
    }
  }

  const parseAmount = (value: string, decimals = 18) => {
    try {
      return parseUnits(value || "0", decimals)
    } catch {
      return BigInt(0)
    }
  }

  const getTokenAmount = async (token: `0x${string}`, value: string) => {
    if (!publicClient) throw new Error("Public client unavailable")
    let decimals = 18
    try {
      const result = await publicClient.readContract({
        abi: erc20Abi,
        address: token,
        functionName: "decimals",
      })
      decimals = Number(result)
    } catch {
      decimals = 18
    }
    return parseAmount(value, decimals)
  }

  const approveTokens = async () => {
    // Validation
    if (!formData.token0 || !formData.token1) {
      alert("Please provide both token addresses.")
      return false
    }
    if (!formData.token0Amount || !formData.token1Amount) {
      alert("Please provide seed amounts for both tokens.")
      return false
    }
    if (!address) {
      alert("Connect your wallet to continue.")
      return false
    }
    if (chainId && chainId !== uniChainSepolia.id) {
      alert("Switch to UniChain Sepolia to approve tokens.")
      return false
    }
    const launchpadAddress = PropAMMContracts[uniChainSepolia.id]
    if (!launchpadAddress) {
      alert("Launchpad address missing for UniChain Sepolia.")
      return false
    }
    if (!publicClient) {
      alert("Public client unavailable. Please refresh the page.")
      return false
    }

    setIsApprovingTokens(true)
    try {
      const [amount0, amount1] = await Promise.all([
        getTokenAmount(formData.token0 as `0x${string}`, formData.token0Amount),
        getTokenAmount(formData.token1 as `0x${string}`, formData.token1Amount),
      ])

      if (amount0 === BigInt(0) || amount1 === BigInt(0)) {
        alert("Seed amounts must be greater than zero.")
        return false
      }

      // Check and approve token0
      const allowance0 = await publicClient.readContract({
        abi: erc20Abi,
        address: formData.token0 as `0x${string}`,
        functionName: "allowance",
        args: [address, launchpadAddress],
      })

      if (allowance0 < amount0) {
        const approveHash0 = await writeContractAsync({
          abi: erc20Abi,
          address: formData.token0 as `0x${string}`,
          functionName: "approve",
          args: [launchpadAddress, amount0],
          chainId: uniChainSepolia.id,
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash0 })
      }

      // Check and approve token1
      const allowance1 = await publicClient.readContract({
        abi: erc20Abi,
        address: formData.token1 as `0x${string}`,
        functionName: "allowance",
        args: [address, launchpadAddress],
      })

      if (allowance1 < amount1) {
        const approveHash1 = await writeContractAsync({
          abi: erc20Abi,
          address: formData.token1 as `0x${string}`,
          functionName: "approve",
          args: [launchpadAddress, amount1],
          chainId: uniChainSepolia.id,
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash1 })
      }

      setApprovalsComplete(true)
      alert("Both tokens approved successfully! The contract will pull the assets when you launch.")
      return true
    } catch (error) {
      console.error(error)
      alert((error as Error).message || "Failed to approve tokens.")
      return false
    } finally {
      setIsApprovingTokens(false)
    }
  }

  const handleDeploy = async () => {
    if (!formData.poolName || !formData.token0 || !formData.token1) {
      alert("Please complete pool details before deploying.")
      return
    }
    if (!formData.strategyAdapter || !formData.thresholdAdapter) {
      alert("Deploy both adapters before launching.")
      return
    }
    if (!formData.curator) {
      alert("Please provide a curator address.")
      return
    }
    if (!address) {
      alert("Connect your wallet to continue.")
      return
    }
    if (chainId && chainId !== uniChainSepolia.id) {
      alert("Please switch your wallet to UniChain Sepolia.")
      return
    }
    const launchpadAddress = PropAMMContracts[uniChainSepolia.id]
    if (!launchpadAddress) {
      alert("Launchpad address for UniChain Sepolia is not configured.")
      return
    }

    try {
      // Sort tokens alphabetically (lowercase comparison)
      const token0Lower = formData.token0.toLowerCase()
      const token1Lower = formData.token1.toLowerCase()
      const shouldSwap = token0Lower > token1Lower

      const sortedToken0 = shouldSwap ? token1Lower : token0Lower
      const sortedToken1 = shouldSwap ? token0Lower : token1Lower
      const sortedToken0Amount = shouldSwap ? formData.token1Amount : formData.token0Amount
      const sortedToken1Amount = shouldSwap ? formData.token0Amount : formData.token1Amount

      const [token0SeedAmt, token1SeedAmt] = await Promise.all([
        getTokenAmount(sortedToken0 as `0x${string}`, sortedToken0Amount),
        getTokenAmount(sortedToken1 as `0x${string}`, sortedToken1Amount),
      ])

      // Ensure all addresses are valid checksummed addresses
      const launchConfig = {
        token0: sortedToken0 as `0x${string}`,
        token1: sortedToken1 as `0x${string}`,
        token0SeedAmt,
        token1SeedAmt,
        strategyAdapter: formData.strategyAdapter.toLowerCase() as `0x${string}`,
        thresholdAdapter: formData.thresholdAdapter.toLowerCase() as `0x${string}`,
        poolName: formData.poolName,
        curatorInfo: {
          curator: formData.curator.toLowerCase() as `0x${string}`,
          name: formData.curatorName || "",
          website: formData.curatorWebsite || "",
        },
      }

      console.log("Launching pool with config:", launchConfig)

      const hash = await writeContractAsync({
        abi: PropAMMLaunchPadAbi,
        address: launchpadAddress as `0x${string}`,
        functionName: "launch",
        args: [launchConfig],
        chainId: uniChainSepolia.id,
      })
      
      setTxHash(hash)
      alert(`Deployment transaction sent! Hash: ${hash}`)
      
      // Wait for transaction confirmation if publicClient is available
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log("Transaction confirmed:", receipt)
        alert("Pool launched successfully!")
      }
    } catch (error) {
      console.error("Deployment error:", error)
      alert((error as Error).message || "Failed to deploy AMM.")
    }
  }

  const strategySnippet =
    selectedStrategy === "custom"
      ? formData.customStrategyCode || "// Paste your adapter contract here..."
      : STRATEGY_SNIPPETS[selectedStrategy as keyof typeof STRATEGY_SNIPPETS] || CONTRACT_SNIPPET

  const thresholdSnippet =
    selectedThreshold === "thresholdCustom"
      ? formData.customThresholdCode || "// Paste your threshold module here..."
      : THRESHOLD_SNIPPETS[selectedThreshold as keyof typeof THRESHOLD_SNIPPETS] || THRESHOLD_SNIPPETS.thresholdA

  const isNextDisabled = isApprovingTokens || isDeployingStrategy || isDeployingThreshold

  const canDeploy = 
    formData.poolName &&
    formData.token0 &&
    formData.token1 &&
    formData.token0Amount &&
    formData.token1Amount &&
    formData.curator &&
    formData.strategyAdapter &&
    formData.thresholdAdapter &&
    approvalsComplete

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03030f] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050611] via-[#030617] to-[#010109]" />
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#0500e1]/25 blur-[160px]" />
        <div className="absolute right-0 top-20 h-72 w-72 translate-x-1/3 rounded-full bg-[#5c60ff]/20 blur-[160px]" />
      </div>

      <Navigation />

      <div className="container mx-auto px-6 pt-32 pb-20" style={{ maxWidth: currentStep === 3 || currentStep === 4 ? '100%' : '72rem' }}>
        <div className="mx-auto" style={{ maxWidth: currentStep === 3 || currentStep === 4 ? '100%' : '48rem' }}>
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">Deploy New Prop AMM</h1>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curatorName">Curator Name</Label>
                    <Input
                      id="curatorName"
                      placeholder="Prop Labs"
                      value={formData.curatorName}
                      onChange={(e) => handleInputChange("curatorName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="curatorWebsite">Website</Label>
                    <Input
                      id="curatorWebsite"
                      placeholder="https://prop.example"
                      value={formData.curatorWebsite}
                      onChange={(e) => handleInputChange("curatorWebsite", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Assets & Funding */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Assets & Funding</h2>
                  <p className="text-muted-foreground">Provide the token addresses, seed amounts, and pool name</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="poolName">Pool Name</Label>
                    <Input
                      id="poolName"
                      placeholder="Curated Liquidity Pool"
                      value={formData.poolName}
                      onChange={(e) => handleInputChange("poolName", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Displayed to LPs and traders.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="token0">Token 0 Address</Label>
                      <Input
                        id="token0"
                        placeholder="0x..."
                        value={formData.token0}
                        onChange={(e) => handleInputChange("token0", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token1">Token 1 Address</Label>
                      <Input
                        id="token1"
                        placeholder="0x..."
                        value={formData.token1}
                        onChange={(e) => handleInputChange("token1", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="token0Amount">Token 0 Seed Amount</Label>
                      <Input
                        id="token0Amount"
                        type="number"
                        placeholder="0.0"
                        value={formData.token0Amount}
                        onChange={(e) => handleInputChange("token0Amount", e.target.value)}
                      />
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
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Approve Tokens</h3>
                      <p className="text-xs text-muted-foreground">
                        Approve both tokens so the contract can pull the assets when you launch the pool.
                      </p>
                    </div>
                    
                    <div className="space-y-3 rounded-xl border border-white/10 bg-[#050611]/60 p-4">
                      <div className="grid gap-4 sm:grid-cols-2 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Token 0</p>
                          <p className="font-mono text-xs break-all">{formData.token0 || "Not set"}</p>
                          <p className="text-xs text-muted-foreground">Amount: {formData.token0Amount || "0"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Token 1</p>
                          <p className="font-mono text-xs break-all">{formData.token1 || "Not set"}</p>
                          <p className="text-xs text-muted-foreground">Amount: {formData.token1Amount || "0"}</p>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={approveTokens}
                        disabled={
                          isApprovingTokens ||
                          approvalsComplete ||
                          !formData.token0 ||
                          !formData.token1 ||
                          !formData.token0Amount ||
                          !formData.token1Amount
                        }
                      >
                        {isApprovingTokens
                          ? "Approving tokens..."
                          : approvalsComplete
                            ? "✓ Both tokens approved"
                            : "Approve Both Tokens"}
                      </Button>
                      
                      {approvalsComplete && (
                        <p className="flex items-center gap-2 text-xs text-white">
                          <Check className="h-3 w-3 text-primary" /> Approvals complete! Contract will pull assets on launch.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Strategy Adapter */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:w-2/5">
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
                  <div className="rounded-2xl border border-primary/30 bg-white/5 p-6 lg:w-3/5">
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
                      <Button 
                        onClick={handleStrategyDeploy} 
                        className="w-full"
                        disabled={isDeployingStrategy || !!formData.strategyAdapter}
                      >
                        {isDeployingStrategy
                          ? "Deploying Strategy Adapter..."
                          : formData.strategyAdapter
                            ? "Strategy Adapter Deployed"
                            : "Deploy Strategy Adapter"}
                      </Button>
                      {formData.strategyAdapter && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                          <p className="text-white/60">Adapter deployed at:</p>
                          <p className="font-mono text-white break-all">{formData.strategyAdapter}</p>
                          <p className="flex items-center gap-2 text-xs text-white mt-2">
                            <Check className="h-3 w-3 text-primary" /> Ready for next step
                          </p>
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:w-2/5">
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
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 lg:w-3/5">
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
                      <Button 
                        onClick={handleThresholdDeploy} 
                        className="w-full" 
                        variant="outline"
                        disabled={isDeployingThreshold || !!formData.thresholdAdapter}
                      >
                        {isDeployingThreshold
                          ? "Deploying Threshold Adapter..."
                          : formData.thresholdAdapter
                            ? "Threshold Adapter Deployed"
                            : "Deploy Threshold Adapter"}
                      </Button>
                      {formData.thresholdAdapter && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                          <p className="text-white/60">Threshold adapter deployed at:</p>
                          <p className="font-mono text-white break-all">{formData.thresholdAdapter}</p>
                          <p className="flex items-center gap-2 text-xs text-white mt-2">
                            <Check className="h-3 w-3 text-primary" /> Ready for launch
                          </p>
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
                  <h2 className="mb-2 text-2xl font-semibold text-white">Review & Deploy</h2>
                  <p className="text-white/60">Review your launch configuration before deploying</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold text-white">Curator</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Address:</span>
                        <p className="font-mono text-xs break-all mt-1 text-white">{formData.curator || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Name:</span>
                        <p className="font-semibold mt-1 text-white">{formData.curatorName || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Website:</span>
                        <p className="font-semibold break-all mt-1 text-white">{formData.curatorWebsite || "Not set"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold text-white">Pool Configuration</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/60">Pool Name:</span>
                        <p className="font-semibold mt-1 text-white">{formData.poolName || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Token 0 Address:</span>
                        <p className="font-mono text-xs break-all mt-1 text-white">{formData.token0 || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Token 0 Amount:</span>
                        <p className="font-semibold mt-1 text-white">{formData.token0Amount || "0"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Token 1 Address:</span>
                        <p className="font-mono text-xs break-all mt-1 text-white">{formData.token1 || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Token 1 Amount:</span>
                        <p className="font-semibold mt-1 text-white">{formData.token1Amount || "0"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold text-white">Adapters</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-white/60">Strategy Option:</span>
                        <p className="font-semibold mt-1 text-white">{selectedStrategy}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Strategy Address:</span>
                        <p className="font-mono text-xs break-all mt-1 text-white">{formData.strategyAdapter || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Threshold Option:</span>
                        <p className="font-semibold mt-1 text-white">{selectedThreshold}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Threshold Address:</span>
                        <p className="font-mono text-xs break-all mt-1 text-white">{formData.thresholdAdapter || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Approvals:</span>
                        <p className="mt-1 flex items-center gap-2">
                          {approvalsComplete ? (
                            <>
                              <Check className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-white">Complete</span>
                            </>
                          ) : (
                            <span className="text-white">Pending</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 font-semibold text-white">Important</h3>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#7731EA]/20 text-white">
                        <span className="text-xs">!</span>
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="text-white/60">
                          Once deployed, token selections and adapters cannot be changed. Review the configuration
                          carefully before signing the transaction.
                        </div>
                      </div>
                    </div>
                    {!canDeploy && (
                      <div className="mt-4 rounded-lg border border-[#7731EA]/20 bg-[#7731EA]/10 p-3">
                        <p className="text-xs text-white">
                          ⚠️ Please complete all required fields and approve tokens before deploying.
                        </p>
                      </div>
                    )}
                  </div>

                  {txHash && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs">
                      <p className="text-muted-foreground">Last deployment transaction</p>
                      <p className="font-mono text-primary break-all">{txHash}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="gap-2 border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10"
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
                <Button onClick={handleDeploy} className="gap-2" disabled={isLaunchPending || !canDeploy}>
                  {isLaunchPending ? (
                    "Deploying..."
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Deploy Prop AMM
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
