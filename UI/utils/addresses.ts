export const PropAMMContracts = {
  1301: '0x2C9Be74729176439D8Bf99EFaE048ccB62a9FDEd',
} as {
  [key: number]: `0x${string}`
}

// PropHook address for swap routing
export const PROP_HOOK_ADDRESS = (process.env.NEXT_PUBLIC_PROP_HOOK_ADDRESS || '0x6a97647586C26013C048b7EE63c47D96Fd47Ca88') as `0x${string}`

// Swap Router address - SwapReactor contract (also used as Pool Manager)
export const SWAP_ROUTER_ADDRESS = '0x4f4F2FaA1eCB3B2d667FEb021D3d7E7B32De88eD' as `0x${string}`
export const POOL_MANAGER_ADDRESS = SWAP_ROUTER_ADDRESS
