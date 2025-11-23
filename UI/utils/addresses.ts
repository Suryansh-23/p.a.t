export const PropAMMContracts = {
  1301: '0x10607B85de10799f62a941Cb42D60a37a1bFCFDb',
} as {
  [key: number]: `0x${string}`
}

// PropHook address for swap routing
export const PROP_HOOK_ADDRESS = (process.env.NEXT_PUBLIC_PROP_HOOK_ADDRESS || '0x3F492ceEcF289CD507E0Ad74e972775087fb0A88') as `0x${string}`

// Swap Router address - SwapReactor contract (also used as Pool Manager)
export const SWAP_ROUTER_ADDRESS = '0x97BfC94361f1C38025F8Ed1eaEEE982bDd12403C' as `0x${string}`
export const POOL_MANAGER_ADDRESS = SWAP_ROUTER_ADDRESS
