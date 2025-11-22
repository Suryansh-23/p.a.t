# AGENTS

_All commands and paths mentioned below are relative to `/sequencer`._

This document captures the blueprint for the ROFL-powered pool-parameter batcher. The service lives inside a ROFL TEE (with an opt-in local dev escape hatch) and keeps three moving parts online: contract indexers, an in-memory queue, and a REST surface that triggers deterministic batch submissions.

## Mission & Scope

- Continuously index **two contracts on the same chain**:
  1. **Pool launch source** emitting:

     ```solidity
     struct LaunchConfig {
         address token0;
         address token1;
         uint256 token0SeedAmt;
         uint256 token1SeedAmt;
         uint24 fee;
         address strategyAdapter;
         address thresholdAdapter;
         address curator;
         CuratorInfo curatorInfo;
     }

     struct CuratorInfo {
         string name;
         string website;
     }

     event PoolLaunched(PoolId indexed poolId, LaunchConfig launchConfig);
     ```

     We only need the emitted `poolId` and basic metadata for logging. Every observed `poolId` is stored in-memory.

  2. **Uniswap v4 PoolManager** emitting swap orders:

     ```solidity
     event Swap(
         bytes32 indexed id,
         address indexed sender,
         int128 amount0,
         int128 amount1,
         uint160 sqrtPriceX96,
         uint128 liquidity,
         int24 tick,
         uint24 fee
     );
     ```

     We decode logs, map `id` to our `poolId`, and enqueue only swaps for known pools.

- Keep an HTTP server up (Express) that exposes:
  - `GET /` – health/readiness+metrics snapshot.
  - `POST /update` – `{ poolId, parameters }` payload that drains `BATCH_SIZE` swaps and submits them to a contract.
- No persistence; pool set and queue vanish on restart (acceptable for hackathon). No retry workers outside of simple backoff for RPC reconnects.

## Runtime & Tooling

- **Language**: TypeScript on Node.js ≥ 20.
- **Key libraries**:
  - [`viem`](https://viem.sh/) – RPC client, event indexing, transaction submission.
  - [`express`](https://expressjs.com/) – lightweight REST layer.
  - [`pino`](https://github.com/pinojs/pino) + [`pino-http`](https://github.com/pinojs/pino-http) – structured logging for both core and HTTP.
  - [`zod`](https://github.com/colinhacks/zod) – request validation + config safety (since Express has no built-in schemas).
  - [`@oasisprotocol/rofl-client`](https://github.com/oasisprotocol/rofl) – enclave key management.
  - [`dotenv`](https://www.npmjs.com/package/dotenv)` (dev only) – local env hydration.
  - [`denque`](https://github.com/invertase/denque)` – fast FIFO queue implementation.
- **Process orchestration**: ROFL supervisor inside enclave; `tsx src/index.ts` for local dev.
- **Testing**: intentionally skipped (manual smoke tests only).

## High-Level Architecture

```
┌───────────────────────────┐
│ Express HTTP Server       │
│ GET /   POST /update      ◄────────────────────────────┐
└────────┬──────────────────┘                            │
         │                                               │ HTTP
┌────────▼───────────────┐        ┌──────────────────────▼───────────────────┐
│ Pool Launch Indexer    │        │ Swap Order Indexer                       │
│ watches PoolLaunched   │        │ watches PoolManager Swap events          │
└────────┬───────────────┘        └──────────────────────┬───────────────────┘
         │ poolId Set                                 decoded SwapOrder
┌────────▼────────────────────────────────────────────────▼──────────┐
│ Shared In-Memory State (Set + Queue + current parameters snapshot) │
└────────┬────────────────────────────────────────────────┬──────────┘
         │                                                │
         │ batch of SwapOrders                            │ pool parameters
┌────────▼────────────────────────────────────────────────▼──────────┐
│ Contract Submitter / Batcher                                       │
│ - pops BATCH_SIZE orders                                           │
│ - validates poolId membership                                      │
│ - signs via ROFL key + viem wallet client                          │
└────────────────────────────────────────────────────────────────────┘
```

### Agent Responsibilities

| Agent | Description | Key Inputs | Key Outputs |
| --- | --- | --- | --- |
| Pool Launch Indexer | Watches the PoolLaunched event via viem `watchContractEvent`, backfills historical logs once, and stores every emitted `poolId`. | RPC WS/HTTP URLs, pool launch contract ABI/address, start block. | `Set<PoolId>` of allowed pools + metadata for `/` response. |
| Swap Order Indexer | Streams PoolManager `Swap` events, filters to known `poolId` (by comparing `bytes32 id`), and queues decoded swaps with metadata. | RPC WS/HTTP, PoolManager ABI/address, start block, pool set. | FIFO queue of `SwapOrder`. |
| REST API (Express) | Hosts `GET /` and `POST /update`. `/update` drains at most `BATCH_SIZE` swaps and hands them to the submitter. | Queue reference, pool set, batcher, BATCH_SIZE env. | HTTP responses + trigger to submitter. |
| Contract Submitter | Stateless helper invoked by `/update`. Validates pool, pops queue items, builds calldata, and submits the transaction using ROFL-managed key. | Queue, poolId, parameters, signer, batch target ABI/address. | Transaction hash + batch telemetry. |

## Data Structures

```ts
type PoolId = `0x${string}`; // 32-byte keccak or canonical pool identifier

interface LaunchMetadata {
  poolId: PoolId;
  launchedAt: number; // epoch ms
  launchConfig: Partial<LaunchConfig>; // token addresses, fee, curator, etc.
}

interface SwapOrder {
  poolId: PoolId;          // derived from Swap.id
  swapId: `0x${string}`;   // raw Swap.id for deduping
  sender: `0x${string}`;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  fee: number;
  metadata: {
    blockNumber: bigint;
    logIndex: number;
    txHash: `0x${string}`;
    observedAt: number;
  };
}

interface BatchRequest {
  poolId: PoolId;
  parameters: string; // forwarded JSON blob (validated length only)
}
```

- `const poolIds = new Set<PoolId>();`
- `const poolMetadata = new Map<PoolId, LaunchMetadata>();`
- `const swapQueue = new Denque<SwapOrder>();`
- `const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 10);`
- Optional `let isPostingBatch = false;` guard to prevent concurrent `/update` submissions.

## Event Indexing Details

### Pool Launch Indexer

- Env knobs:
  - `POOL_LAUNCH_ADDRESS`
  - `POOL_LAUNCH_ABI_PATH` (or inline ABI JSON)
  - `POOL_LAUNCH_START_BLOCK`
- Flow:
  1. Instantiate a viem public client with WebSocket transport (falls back to HTTP polling if WS unavailable).
  2. Use a dedicated HTTP client for backfills; call `getLogs` in <=10 block chunks (to comply with the Alchemy free-tier limit) for `[POOL_LAUNCH_START_BLOCK, latest]`. If `POOL_LAUNCH_START_BLOCK=-1`, skip backfill entirely.
  3. Start `watchContractEvent` for `PoolLaunched` with `fromBlock = latest+1` when backfilling, or `fromBlock = latest` when skipping history.
  4. For every log, extract `poolId`, store in `poolIds`, and optionally keep `LaunchConfig` fields (tokens, fee) in `poolMetadata` for observability.
  5. Track latest block height processed for the `/` health response.

### Swap Order Indexer

- Env knobs:
  - `POOL_MANAGER_ADDRESS`
  - `POOL_MANAGER_ABI_PATH`
  - `POOL_MANAGER_START_BLOCK`
- Flow:
  1. Prefer the WebSocket client for streaming swaps while relying on HTTP for backfills.
  2. Backfill `Swap` events from `POOL_MANAGER_START_BLOCK` via chunked `getLogs` requests that never exceed 10 blocks per call (skip when the start block is `-1`).
  3. Start a live watcher via `watchContractEvent` for `Swap` using `fromBlock = latest+1` (or the latest block when skipping history).
  4. Each log ➜ decode ➜ determine `poolId` (`PoolId` == `bytes32 id` by default; adapt if mapping is required) ➜ only enqueue when `poolIds.has(poolId)`.
  5. Push to `swapQueue` along with metadata. If the queue is empty for long periods, we still keep watchers alive.
  6. Maintain counters (queue length, last block) for `GET /` output.

## REST API Surface (Express)

### `GET /`

Returns a JSON snapshot:

```json
{
  "ok": true,
  "appId": "rofl1...",
  "chainId": 84532,
  "poolCount": 4,
  "queuedOrders": 27,
  "lastIndexedBlock": {
    "poolLaunch": "0xabc",
    "swaps": "0xdef"
  },
  "startedAt": "2024-09-19T12:34:56.000Z",
  "gitCommit": "abc1234"
}
```

- Use Express with a simple handler. Return 503 until both indexers finish their initial backfill.
- Include `launchMetadata` excerpt when helpful (`tokens`, `fee`).

### `POST /update`

- Validate body with `zod` before hitting business logic:

```ts
const UpdateSchema = z.object({
  poolId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  parameters: z.string().min(1).max(8192)
});
```

- Handler steps:
  1. Parse body; reject invalid payloads with 400.
  2. Make sure `poolIds.has(poolId)`; otherwise respond `404` since swaps are only supported for known pools.
  3. If `swapQueue.isEmpty()`, return `202` with `{ message: "No swap orders queued" }`.
  4. Acquire the submission lock. If `isPostingBatch` is already true, reply `409` to signal the caller to retry.
  5. Pop up to `BATCH_SIZE` swaps (`swapQueue.shift()`), record them for possible rollback on failure.
  6. Call the contract submitter with `(poolId, parameters, orders)`.
  7. On success: release lock, respond `200 { txHash, ordersSent }`.
  8. On failure: push the orders back to the front in reverse order, release lock, respond `502/500`.
- Use `express.json({ limit: '2mb' })` and `compression` if needed.

### `GET /api/pools`

- Returns a dictionary of `poolId -> launchConfig` so operators can inspect all pools the service is tracking.
- Includes `total` count, responds `503` while indexers are still loading, and mirrors the current launch config (tokens, fee, curator info, adapters).

### `GET /api/pools/:poolId`

- Validates `poolId` format, returns `404` for unknown ids.
- Response contains `{ ok, poolId, launchConfig, launchedAt, blockNumber, txHash }`.
- Useful for frontends/ops tooling that want metadata for a single pool without fetching the whole set.

## Contract Submission

- Configured via `BATCH_TARGET_ADDRESS` + ABI (or interface string) + method name (e.g., `submitBatch`).
- Build a viem wallet client with `account: privateKeyToAccount(process.env.BATCHER_PRIVATE_KEY)`.
- Use HTTP RPC transport for writes; keep WS for event streams.
- Gas strategy: `walletClient.estimateGas` + `estimateFeesPerGas`, fallback to static `gasPrice` for testnets.
- Emit structured logs: batch size, poolId, tx hash, latency.

## Environment Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `NODE_ENV` | Sets runtime mode (`production` inside Docker). | `production` |
| `LOG_LEVEL` | Verbosity for pino logger. | `info` |
| `CHAIN_ID` | Numeric chain id. | `84532` |
| `CHAIN_RPC_HTTP` | HTTP endpoint for backfills + tx submission. | `https://base-sepolia...` |
| `CHAIN_RPC_WS` | WebSocket endpoint for live indexing (falls back to HTTP when absent). | `wss://base-sepolia...` |
| `POOL_LAUNCH_ADDRESS` | Contract emitting `PoolLaunched`. | `0xabc...` |
| `POOL_LAUNCH_START_BLOCK` | Backfill lower bound (`-1` = skip history, start watchers at latest). | `1234567` |
| `POOL_MANAGER_ADDRESS` | Uniswap v4 PoolManager address. | `0xdef...` |
| `POOL_MANAGER_START_BLOCK` | Swap backfill lower bound (`-1` = skip history, start watchers at latest). | `1235000` |
| `BATCH_TARGET_ADDRESS` | Contract to receive batches. | `0x123...` |
| `BATCH_SIZE` | Max swaps to send per `/update`. | `10` |
| `BATCHER_PRIVATE_KEY` | 32-byte hex key used by the submitter (set via Compose/env). | `0xabc...` |
| `EXPRESS_PORT` | HTTP port. | `8080` |
| `EXPRESS_HOST` | Bind host (`127.0.0.1` dev, `0.0.0.0` in ROFL). | `0.0.0.0` |

## Operational Notes

- **Boot order**:
  1. Load env (dotenv in dev) + configure logger.
  2. Instantiate shared state (set, metadata map, queue).
  3. Spin up pool launch indexer (backfill + live watcher).
  4. Once poolId set has baseline data, start swap indexer backfill + watcher.
  5. Create viem wallet client + contract submitter helpers.
  6. Start Express server only after both initial backfills resolve.
- **Graceful shutdown**: on `SIGINT/SIGTERM`, stop express, unsubscribe watchers, and flush metrics to logs.
- **Observability**: log queue length, pool count, last block numbers, number of batches served, cumulative swaps processed.
- **Security**:
  - Validate `parameters` length (no inline parsing yet, but keep size in check).
  - Bind Express to localhost by default; rely on ROFL network policy for exposure.
  - Because all state is in-memory, restarts drop queue/pools—document this for operators.

## Execution Plan (Pre-Implementation)

1. **Project & Config Scaffolding**
   - Ensure `/sequencer` package metadata reflects the new agents (add Express, zod, denque, pino, viem wiring).
   - Create an `src` structure with clear separation: `config/`, `agents/`, `http/`, `clients/`.
   - Implement config loader that reads env vars once, validates with zod, and exports typed constants (including BATCH_SIZE, RPC URLs, addresses).

2. **Shared State, Logging, and Utilities**
   - Implement singleton modules for: logger (pino), metrics snapshot, queue (`Denque<SwapOrder>`), and pool stores (Set + Map).
   - Provide helper utilities: hex validation, `nowMs()`, queue wrappers (batch pop/rollback), structured error classes.

3. **POA: Pool Launch Indexer Agent**
   - Build a viem public client factory (both WS + HTTP fallback).
   - Implement `startPoolLaunchIndexer()` that backfills from `POOL_LAUNCH_START_BLOCK`, populates `poolIds` + metadata, keeps `lastIndexedBlock.poolLaunch` updated, and exposes a shutdown handle.
   - Include reconnection/backoff logging.

4. **Swap Order Indexer Agent**
   - Reuse the client factory to instantiate watchers for PoolManager.
   - Implement backfill limited to a configurable number of logs (or `BATCH_SIZE * 10`) to avoid unbounded queue growth on boot.
   - Enqueue only swaps where `poolIds.has(poolId)`, update swap metrics, and expose shutdown handle.

5. **Contract Submitter**
   - Wire ROFL key retrieval and viem wallet client creation (HTTP transport).
   - Implement `submitBatch({ poolId, parameters, orders })` that encodes calldata (placeholder ABI), sends tx, and returns `{ txHash, ordersSent, elapsedMs }`.
   - Handle failures by throwing typed errors so the HTTP layer can requeue drained swaps.

6. **Express HTTP Server**
   - Build `createServer({ queue, pools, submitBatch })` that mounts:
     - `GET /` returning health snapshot (pool count, queue length, block heights, start time, git commit, ROFL app id once available).
     - `POST /update` with zod validation, concurrency lock, queue drain/requeue logic, and integration with `submitBatch`.
   - Add middlewares: JSON body parser (2 MB limit), pino-http logger, error handler that normalizes responses.

7. **Bootstrap & Lifecycle**
   - Implement `src/index.ts` that: loads config, instantiates dependencies, starts indexers, waits for backfills, bootstraps HTTP server, hooks graceful shutdown.
   - Emit startup logs summarizing current pools and queue length; expose readiness state for `/`.

8. **Manual Verification Checklist**
   - Document basic manual tests (env sample, `pnpm dev`, hitting `/` and `/update` with mock data, verifying queue drain logs).
   - Prepare instructions for running inside ROFL vs. local (env flags, how to supply `BATCHER_PRIVATE_KEY` securely).

This plan must be approved before implementation starts; once approved, we will follow the steps sequentially, validating after each major piece is wired together.

### Manual Verification Checklist

- Copy `.env.example` (or create `.env`) with the required chain URLs, addresses, start blocks, batch size, HTTP host/port, and `BATCHER_PRIVATE_KEY` (use a dev key locally, inject via secrets in ROFL/prod).
- Install deps once via `pnpm install` (workspace root).
- Start the service locally: `pnpm dev` (inside `/sequencer`). Ensure logs show both indexers online before hitting the API.
- Smoke-test HTTP endpoints:
  - `curl localhost:8080/` should return `{ ok: true/false, ... }` depending on readiness.
  - `curl localhost:8080/api/pools` and `curl localhost:8080/api/pools/0x...` once launches are indexed.
  - `curl -X POST localhost:8080/update -H 'Content-Type: application/json' -d '{"poolId":"0x...","parameters":"{\"foo\":1}"}'`.
- Watch logs for queue growth + batch submission events; confirm drained swaps are re-queued when submission fails (e.g., disconnect RPC).
- For ROFL/prod deployments, provide `BATCHER_PRIVATE_KEY` via Compose/secret management (never bake into the image) and ensure `EXPRESS_HOST` is set to the intended interface.
- Build the production image via `docker build -t sequencer:local .` and run `docker compose up` (Compose consumes `.env` and uses `ROFL_APP_IMAGE` when provided by Oasis).

## Future Enhancements

- Persist poolIds + queue in an embedded DB (RocksDB/SQLite) for crash resilience.
- Add `/metrics` (Prometheus) and `/readyz` endpoints.
- Implement authenticated `/update` calls (HMAC header or ROFL attestation token).
- Introduce retry/back-off pipeline for failed contract submissions with durable storage.
- Expand to multi-chain indexing by scoping each agent to a chain + pool set.
- Add automated tests once the MVP stabilizes.

This version of the AGENTS brief reflects the Express-based workflow, the explicit PoolLaunched/Swap event signatures, and the tightened scope around indexing only the pools found in the launch feed.
