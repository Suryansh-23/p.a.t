import Denque from "denque";
import type { SwapOrder } from "../types.js";

const swapQueue = new Denque<SwapOrder>();

export function enqueueSwap(order: SwapOrder): void {
  swapQueue.push(order);
}

export function dequeueBatch(limit: number): SwapOrder[] {
  const drained: SwapOrder[] = [];
  for (let i = 0; i < limit; i += 1) {
    const next = swapQueue.shift();
    if (next === undefined) {
      break;
    }
    drained.push(next!);
  }
  return drained;
}

export function requeueFront(orders: SwapOrder[]): void {
  for (let i = orders.length - 1; i >= 0; i -= 1) {
    const order = orders[i];
    if (!order) continue;
    swapQueue.unshift(order);
  }
}

export function queueSize(): number {
  return swapQueue.size();
}

export function isQueueEmpty(): boolean {
  return swapQueue.isEmpty();
}

export function peekQueue(): readonly SwapOrder[] {
  return swapQueue.toArray();
}
