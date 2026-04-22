# =============================================================================
# Stage 1 — builder: install all deps and build
# =============================================================================
FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

# Install deps first (separate layer — cached until package files change)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .

# NEXT_PUBLIC_* vars are baked in at build time — pass via docker-compose build args
ARG NEXT_PUBLIC_RYBBIT_SITE_ID
ARG NEXT_PUBLIC_RYBBIT_URL
ENV NEXT_PUBLIC_RYBBIT_SITE_ID=$NEXT_PUBLIC_RYBBIT_SITE_ID
ENV NEXT_PUBLIC_RYBBIT_URL=$NEXT_PUBLIC_RYBBIT_URL

RUN pnpm build

# =============================================================================
# Stage 2 — runner: slim production image with standalone output only
# =============================================================================
# node:22-slim (Debian, glibc) — NOT alpine (musl).
# strictdb and mongodb use native addons that fail on musl/alpine.
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The `node` user (uid 1001) is pre-created in every official node image.
RUN chown node:node /app
USER node

# Standalone output is self-contained: Next.js bundles required node_modules into
# .next/standalone/node_modules — no separate install needed in this stage.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

# All secrets (MONGODB_URI, AUTH_SECRET, AUTH_PASSWORD, etc.) are runtime env vars.
# NEVER bake secrets into this image — pass them via docker-compose env_file or -e flags.
CMD ["node", "server.js"]
