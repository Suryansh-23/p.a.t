import { NextRequest, NextResponse } from 'next/server'
import solc from 'solc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CompileRequest {
  sourceCode: string
  contractName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CompileRequest = await request.json()
    const { sourceCode, contractName } = body

    if (!sourceCode || typeof sourceCode !== 'string') {
      return NextResponse.json(
        { success: false, errors: ['Source code is required'] },
        { status: 400 }
      )
    }

    // Prepare compiler input
    const input = {
      language: 'Solidity',
      sources: {
        'Contract.sol': {
          content: sourceCode,
        },
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
          },
        },
      },
    }

    // Compile
    const output = JSON.parse(solc.compile(JSON.stringify(input)))

    // Check for errors
    const errors: string[] = []
    const warnings: string[] = []

    if (output.errors) {
      for (const error of output.errors) {
        if (error.severity === 'error') {
          errors.push(error.formattedMessage || error.message)
        } else {
          warnings.push(error.formattedMessage || error.message)
        }
      }
    }

    // If there are compilation errors, return them
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors,
        warnings,
      })
    }

    // Extract contract data
    const contracts = output.contracts['Contract.sol']
    if (!contracts || Object.keys(contracts).length === 0) {
      return NextResponse.json({
        success: false,
        errors: ['No contracts found in source code'],
      })
    }

    // Auto-detect contract name if not provided
    let targetContract = contractName
    if (!targetContract) {
      // Use the first contract found
      targetContract = Object.keys(contracts)[0]
    }

    const contract = contracts[targetContract]
    if (!contract) {
      return NextResponse.json({
        success: false,
        errors: [
          `Contract "${contractName}" not found. Available contracts: ${Object.keys(contracts).join(', ')}`,
        ],
      })
    }

    // Extract bytecode and ABI
    const bytecode = contract.evm?.bytecode?.object
    const abi = contract.abi

    if (!bytecode) {
      return NextResponse.json({
        success: false,
        errors: ['Failed to extract bytecode from compiled contract'],
      })
    }

    return NextResponse.json({
      success: true,
      bytecode: '0x' + bytecode,
      abi,
      warnings,
    })
  } catch (error) {
    console.error('Compilation error:', error)
    return NextResponse.json(
      {
        success: false,
        errors: [(error as Error).message || 'Unknown compilation error'],
      },
      { status: 500 }
    )
  }
}

