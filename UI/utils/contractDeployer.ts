import { type PublicClient, type WalletClient } from 'viem'
import { MINIMAL_STRATEGY_BYTECODE, MINIMAL_THRESHOLD_BYTECODE } from './compiledBytecode'

interface DeployContractParams {
  bytecode: string
  constructorArgs?: `0x${string}`
  walletClient: WalletClient
  publicClient: PublicClient
}

/**
 * Deploy a contract to the blockchain
 */
export async function deployContract({
  bytecode,
  constructorArgs = '0x',
  walletClient,
  publicClient,
}: DeployContractParams): Promise<`0x${string}`> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected')
  }

  // Validate bytecode
  if (!bytecode || !bytecode.startsWith('0x')) {
    throw new Error('Invalid bytecode format')
  }

  // Combine bytecode with constructor args
  const deployData = (bytecode + constructorArgs.slice(2)) as `0x${string}`

  console.log('Deploying contract with bytecode length:', bytecode.length)
  console.log('Constructor args:', constructorArgs)

  // Send deployment transaction
  const hash = await walletClient.sendTransaction({
    account: walletClient.account,
    to: null, // null for contract creation
    data: deployData,
    chain: walletClient.chain,
  })

  console.log('Deployment transaction sent:', hash)

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  console.log('Transaction receipt:', receipt)

  // Check if transaction was successful
  if (receipt.status === 'reverted') {
    throw new Error(`Contract deployment transaction reverted. Hash: ${hash}`)
  }

  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no address returned in receipt')
  }

  console.log('Contract deployed at:', receipt.contractAddress)

  return receipt.contractAddress
}

/**
 * Get bytecode for preset strategy adapters
 * All presets use the same minimal strategy adapter
 */
export function getStrategyBytecode(strategyId: string): string | null {
  switch (strategyId) {
    case 'presetA':
    case 'presetB':
      return MINIMAL_STRATEGY_BYTECODE
    default:
      return null
  }
}

/**
 * Get bytecode for preset threshold adapters
 * All presets use the same minimal threshold adapter
 */
export function getThresholdBytecode(thresholdId: string): string | null {
  switch (thresholdId) {
    case 'thresholdA':
    case 'thresholdB':
      return MINIMAL_THRESHOLD_BYTECODE
    default:
      return null
  }
}

/**
 * Encode constructor arguments for strategy adapters
 * MinimalStrategyAdapter has no constructor arguments
 */
export function encodeStrategyConstructorArgs(): `0x${string}` {
  // No constructor args needed
  return '0x'
}

/**
 * Encode constructor arguments for threshold adapters
 * MinimalThresholdAdapter has no constructor arguments
 */
export function encodeThresholdConstructorArgs(): `0x${string}` {
  // No constructor args needed
  return '0x'
}

