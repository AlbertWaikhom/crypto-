# Stage 1: Build workspace packages & NestJS Backend
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY backend ./backend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @navrix/database db:generate
RUN pnpm --filter @navrix/backend... build

# Stage 2: Minimal production runtime
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

ENV NODE_ENV=production
ENV API_PORT=4000

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/backend ./backend

RUN mkdir -p /app/private-storage && chown -R node:node /app
USER node

EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @navrix/database exec prisma migrate deploy && node backend/dist/main.js"]
