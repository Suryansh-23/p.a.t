FROM node:20-alpine
WORKDIR /app

# Install dependencies (dev deps included so we can compile contracts)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy sources and build (TS + contracts)
COPY tsconfig.json ./
COPY src ./src
COPY contracts ./contracts
COPY hardhat.config.cjs ./
RUN npm run build && npm run compile:contracts && npm prune --omit=dev

ENV NODE_ENV=production

# Run a self-contained smoke test once, then keep the container alive so
# you can read logs via `oasis rofl machine logs`.
CMD ["sh", "-c", "node dist/scripts/smoke-test.js || true; tail -f /dev/null"]
