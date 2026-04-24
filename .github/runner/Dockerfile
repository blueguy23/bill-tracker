FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# ── System packages ───────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    ca-certificates curl git jq gnupg gosu lsof \
    # Chromium/Playwright system deps (pnpm exec playwright install chromium)
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
  && rm -rf /var/lib/apt/lists/*

# ── Docker CLI (no daemon — uses socket from host) ────────────────────────────
RUN install -m 0755 -d /usr/share/keyrings \
  && curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
     | gpg --dearmor -o /usr/share/keyrings/docker.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] \
     https://download.docker.com/linux/ubuntu jammy stable" \
     > /etc/apt/sources.list.d/docker.list \
  && apt-get update && apt-get install -y docker-ce-cli \
  && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 + pnpm ────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm

# ── MongoDB 7 (E2E tests connect to localhost:27017) ─────────────────────────
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
      | gpg --dearmor -o /usr/share/keyrings/mongodb.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/mongodb.gpg] \
     https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
     > /etc/apt/sources.list.d/mongodb-org-7.0.list \
  && apt-get update && apt-get install -y mongodb-org \
  && rm -rf /var/lib/apt/lists/*

# ── Runner user — name must be 'garci' to match CI hardcoded paths ───────────
# (ci.yml checks /home/garci/.cache/ms-playwright for Playwright browser cache)
RUN useradd -m -u 1000 -s /bin/bash garci

# ── GitHub Actions runner binary ──────────────────────────────────────────────
# Tarball is pre-downloaded to the build context (actions-runner.tar.gz) to avoid
# flaky network downloads inside the BuildKit container on WSL2.
# To upgrade: download the new tarball, rename it actions-runner.tar.gz, rebuild.
COPY actions-runner.tar.gz /tmp/actions-runner.tar.gz
RUN mkdir -p /home/garci/actions-runner \
  && tar -xz -C /home/garci/actions-runner -f /tmp/actions-runner.tar.gz \
  && /home/garci/actions-runner/bin/installdependencies.sh \
  && chown -R garci:garci /home/garci \
  && rm /tmp/actions-runner.tar.gz

# ── MongoDB data dir ─────────────────────────────────────────────────────────
RUN mkdir -p /data/db

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Container starts as root so the entrypoint can chown named volumes, then drops
# to garci via gosu. HOME is explicit so tool caches (pnpm, Playwright) land at
# the paths hardcoded in ci.yml (/home/garci/.cache/ms-playwright etc.).
ENV HOME=/home/garci
WORKDIR /home/garci/actions-runner
ENTRYPOINT ["/entrypoint.sh"]
