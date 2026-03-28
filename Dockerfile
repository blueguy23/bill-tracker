# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for Next.js public env vars (baked at build time)
ARG NEXT_PUBLIC_RYBBIT_SITE_ID
ARG NEXT_PUBLIC_RYBBIT_URL
ENV NEXT_PUBLIC_RYBBIT_SITE_ID=$NEXT_PUBLIC_RYBBIT_SITE_ID
ENV NEXT_PUBLIC_RYBBIT_URL=$NEXT_PUBLIC_RYBBIT_URL

RUN pnpm build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
