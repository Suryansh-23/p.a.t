export interface CompilationResult {
  success: boolean
  bytecode?: string
  abi?: any[]
  errors?: string[]
  warnings?: string[]
}

/**
 * Compile Solidity source code using the server-side API
 * @param sourceCode - The Solidity source code to compile
 * @param contractName - The name of the contract to extract (optional, auto-detects if not provided)
 */
export async function compileSolidityContract(
  sourceCode: string,
  contractName?: string
): Promise<CompilationResult> {
  try {
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceCode,
        contractName,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        errors: error.errors || ['Failed to compile contract'],
      }
    }

    const result: CompilationResult = await response.json()
    return result
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message || 'Failed to connect to compilation service'],
    }
  }
}

/**
 * Extract contract name from Solidity source code
 */
export function extractContractName(sourceCode: string): string | null {
  // Match: contract ContractName {
  const match = sourceCode.match(/contract\s+(\w+)\s*(?:is\s+[\w,\s]+)?\s*{/)
  return match ? match[1] : null
}

/**
 * Validate that source code contains required functions for Strategy Adapter
 */
export function validateStrategyAdapter(sourceCode: string): { valid: boolean; error?: string } {
  // Check for required functions: update and price
  const hasUpdate = /function\s+update\s*\([^)]*\)/.test(sourceCode)
  const hasPrice = /function\s+price\s*\([^)]*\)/.test(sourceCode)

  if (!hasUpdate) {
    return { valid: false, error: 'Strategy adapter must have an "update" function' }
  }
  if (!hasPrice) {
    return { valid: false, error: 'Strategy adapter must have a "price" function' }
  }

  return { valid: true }
}

/**
 * Validate that source code contains required functions for Threshold Adapter
 */
export function validateThresholdAdapter(sourceCode: string): { valid: boolean; error?: string } {
  // Check for required function: theresholdReached
  const hasThreshold = /function\s+theresholdReached\s*\([^)]*\)/.test(sourceCode)

  if (!hasThreshold) {
    return { valid: false, error: 'Threshold adapter must have a "theresholdReached" function' }
  }

  return { valid: true }
}


