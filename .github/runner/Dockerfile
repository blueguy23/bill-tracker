FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# ── Bootstrap tools + register all external apt repos ────────────────────────
# Done in one layer so subsequent installs share a single apt-get update.
# NodeSource's setup script runs apt-get update internally — unavoidable,
# but it only happens once here rather than once per tool block.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg \
  && rm -rf /var/lib/apt/lists/* \
  && install -m 0755 -d /usr/share/keyrings \
  && curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
     | gpg --dearmor -o /usr/share/keyrings/docker.gpg \
  && printf 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu jammy stable\n' \
     > /etc/apt/sources.list.d/docker.list \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
     | gpg --dearmor -o /usr/share/keyrings/mongodb.gpg \
  && printf 'deb [arch=amd64 signed-by=/usr/share/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse\n' \
     > /etc/apt/sources.list.d/mongodb-org-7.0.list

# ── Install everything in one layer ──────────────────────────────────────────
# --no-install-recommends drops ~300MB of suggested packages (docs, debug tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git jq gosu lsof tini chrony ntpdate cron \
    docker-ce-cli \
    nodejs \
    mongodb-org \
    libicu70 \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@9

# ── Runner user, binary, dirs, cron ──────────────────────────────────────────
# User must be 'garci' — ci.yml references /home/garci/.cache/ms-playwright
RUN useradd -m -u 1000 -s /bin/bash garci

COPY actions-runner.tar.gz /tmp/actions-runner.tar.gz
RUN mkdir -p /home/garci/actions-runner \
  && tar -xz -C /home/garci/actions-runner -f /tmp/actions-runner.tar.gz \
  && /home/garci/actions-runner/bin/installdependencies.sh \
  && chown -R garci:garci /home/garci \
  && rm /tmp/actions-runner.tar.gz \
  && mkdir -p /data/db \
  && echo "0 */6 * * * docker system prune -f --filter 'until=24h' >> /home/garci/docker-prune.log 2>&1" \
     | crontab -u garci -

# ── Config files + entrypoint ─────────────────────────────────────────────────
COPY chrony.conf /etc/chrony/chrony.conf
COPY entrypoint.sh /entrypoint.sh
COPY deep-healthcheck.sh /deep-healthcheck.sh
RUN chmod +x /entrypoint.sh /deep-healthcheck.sh

# Readiness check — queries GitHub API to confirm the runner is actually online,
# not just that the process exists. autoheal restarts on unhealthy, so this
# catches disconnections that pgrep would miss.
HEALTHCHECK --interval=60s \
            --timeout=15s \
            --start-period=90s \
            --retries=2 \
  CMD ["/deep-healthcheck.sh"]

# HOME is explicit so pnpm/Playwright caches land at paths hardcoded in ci.yml
ENV HOME=/home/garci
WORKDIR /home/garci/actions-runner
ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
