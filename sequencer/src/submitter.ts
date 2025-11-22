import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { batcherAbi } from "./abi/index.js";
import { config } from "./config/index.js";
import { createChainWalletClient, customChain } from "./clients/viem.js";
import { logger } from "./logger.js";
import type { PoolId, SwapOrder } from "./types.js";

export interface SubmitBatchResult {
  txHash: Hex;
  ordersSent: number;
  elapsedMs: number;
}

export type SubmitBatchFn = (input: {
  poolId: PoolId;
  parameters: string;
  orders: SwapOrder[];
}) => Promise<SubmitBatchResult>;

let submitterFn: SubmitBatchFn | null = null;

export async function initBatchSubmitter(): Promise<SubmitBatchFn> {
  if (submitterFn) return submitterFn;

  const secretKey = config.batcherPrivateKey as Hex;
  const account = privateKeyToAccount(secretKey);
  const walletClient = createChainWalletClient(account);

  submitterFn = async ({ poolId, parameters, orders }) => {
    if (!orders.length) {
      throw new Error("submitBatch called with empty orders");
    }
    const start = Date.now();
    try {
      const txHash = await walletClient.writeContract({
        abi: batcherAbi,
        address: config.batchTargetAddress as Hex,
        functionName: "submitBatch",
        account,
        chain: customChain,
        args: [
          poolId,
          parameters,
          orders.map((order) => ({
            swapId: order.swapId,
            sender: order.sender,
            amount0: order.amount0,
            amount1: order.amount1,
            sqrtPriceX96: order.sqrtPriceX96,
            liquidity: order.liquidity,
            tick: order.tick,
            fee: order.fee,
            txHash: order.metadata.txHash,
            blockNumber: order.metadata.blockNumber,
            logIndex: order.metadata.logIndex,
          })),
        ],
      });
      const elapsedMs = Date.now() - start;
      logger.info(
        { txHash, poolId, orders: orders.length, elapsedMs },
        "Batch submitted"
      );
      return { txHash, ordersSent: orders.length, elapsedMs };
    } catch (err) {
      logger.error({ err, poolId, orderCount: orders.length }, "Batch failed");
      throw err;
    }
  };

  logger.info(
    { address: config.batchTargetAddress, signer: account.address },
    "Batch submitter ready"
  );
  return submitterFn;
}
