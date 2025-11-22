FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY src ./src
RUN pnpm build
RUN pnpm prune --prod

CMD ["node", "dist/index.js"]
