/**
 * Swap Router ABI - swapExactInput function
 */

import { parseAbi } from "viem";

export const swapRouterAbi = parseAbi([
  "function swapExactInput(PoolKey calldata poolKey, address tokenIn, address tokenOut, uint256 amountIn) external payable",
  "struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }",
]);
