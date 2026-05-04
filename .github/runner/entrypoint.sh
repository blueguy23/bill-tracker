#!/bin/bash
set -euo pipefail

# ── Privilege drop ────────────────────────────────────────────────────────────
if [ "$(id -u)" = "0" ]; then
  # Clock sync must run as root with SYS_TIME capability (set in docker-compose.yml).
  # chronyd -q = one-shot sync, no daemon needed. Falls back to ntpdate.
  # WSL2 desyncs after host sleep — fix before gosu so TLS ops don't fail.
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Syncing clock..."
  chronyd -q 'pool pool.ntp.org iburst maxsamples 1' 2>/dev/null || \
    ntpdate -u pool.ntp.org 2>/dev/null || \
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] WARNING: Could not sync clock — TLS errors may follow"

  # Start cron as root before dropping privileges — needs /var/run/crond.pid
  cron

  # TCP keepalive — WSL2 default is 7200s; dead connections go undetected for 2h.
  # 60/10/6 = detect dead connection within ~60s + 6 probes × 10s = ~2 min max.
  # Requires NET_ADMIN cap in docker-compose.yml.
  sysctl -w net.ipv4.tcp_keepalive_time=60  2>/dev/null || echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] WARNING: tcp_keepalive_time not settable"
  sysctl -w net.ipv4.tcp_keepalive_intvl=10 2>/dev/null || echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] WARNING: tcp_keepalive_intvl not settable"
  sysctl -w net.ipv4.tcp_keepalive_probes=6 2>/dev/null || echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] WARNING: tcp_keepalive_probes not settable"

  # DNS fallback — WSL2 DNS breaks silently after network changes or VPN cycles.
  grep -q '8.8.8.8' /etc/resolv.conf || echo 'nameserver 8.8.8.8' >> /etc/resolv.conf

  mkdir -p /home/garci/actions-runner/_work /data/db
  chown -R garci:garci /home/garci /data/db
  exec gosu garci "$0" "$@"
fi

# ── From here: running as garci ───────────────────────────────────────────────
REPO_URL="https://github.com/blueguy23/bill-tracker"
RUNNER_NAME="${RUNNER_NAME:-ci-docker}"
API="https://api.github.com/repos/blueguy23/bill-tracker/actions/runners"
GITHUB_API="https://api.github.com"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

# ── 1. Docker Hub auth (optional — prevents anonymous pull rate limits) ───────
if [ -n "${DOCKERHUB_USERNAME:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  log "Authenticating with Docker Hub..."
  echo "${DOCKERHUB_TOKEN}" | docker login --username "${DOCKERHUB_USERNAME}" --password-stdin
  log "Docker Hub auth: OK"
else
  log "No Docker Hub credentials — anonymous pulls limited to 100/6hr"
fi

# ── 2. MongoDB ────────────────────────────────────────────────────────────────
mongod \
  --dbpath /data/db \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath /tmp/mongod.log \
  --quiet
log "MongoDB started — waiting for readiness..."
for i in $(seq 1 30); do
  mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null && break
  sleep 1
  [ "$i" = "30" ] && { log "ERROR: MongoDB not ready after 30s"; exit 1; }
done
log "MongoDB ready"

cd /home/garci/actions-runner

# ── 3. Remove any stale runner with the same name ────────────────────────────
STALE_ID=$(curl -s \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "${API}" \
  | jq -r ".runners[] | select(.name == \"${RUNNER_NAME}\") | .id // empty")

if [ -n "$STALE_ID" ]; then
  log "Removing stale runner (id: ${STALE_ID})..."
  curl -s -X DELETE \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${API}/${STALE_ID}" || true
  sleep 3
fi

# ── 4. Register ───────────────────────────────────────────────────────────────
REG_TOKEN=$(curl -fsSL -X POST \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "${GITHUB_API}/repos/blueguy23/bill-tracker/actions/runners/registration-token" \
  | jq -r '.token')

if [[ "$REG_TOKEN" == "null" || -z "$REG_TOKEN" ]]; then
  log "ERROR: Failed to get runner registration token. Check GITHUB_PAT has 'repo' scope."
  exit 1
fi

rm -f .runner .credentials

./config.sh \
  --url           "$REPO_URL" \
  --token         "$REG_TOKEN" \
  --name          "$RUNNER_NAME" \
  --labels        "self-hosted,Linux,X64" \
  --work          _work \
  --unattended \
  --replace \
  --disableupdate

log "Runner configured."

# ── 5. Token renewal loop ─────────────────────────────────────────────────────
# Renews every 25 days — before the 30-day expiry window.
# Runs in background; curl errors are caught within the loop so set -e doesn't
# kill the subshell silently and leave the runner with an unrenewed token.
renew_token_loop() {
  local INTERVAL=$((25 * 24 * 3600))
  while true; do
    sleep "${INTERVAL}"
    log "Renewing runner token (25-day cycle)..."
    NEW_TOKEN=$(curl -sf -X POST \
      -H "Authorization: token ${GITHUB_PAT}" \
      -H "Accept: application/vnd.github+json" \
      "${GITHUB_API}/repos/blueguy23/bill-tracker/actions/runners/registration-token" \
      | jq -r '.token') || {
        log "WARNING: Token renewal curl failed — retrying in 1 hour"
        sleep 3600
        continue
      }
    if [ -n "${NEW_TOKEN}" ] && [ "${NEW_TOKEN}" != "null" ]; then
      log "Token renewal: OK"
      ./config.sh \
        --url     "$REPO_URL" \
        --token   "${NEW_TOKEN}" \
        --name    "${RUNNER_NAME}" \
        --labels  "self-hosted,Linux,X64" \
        --work    _work \
        --unattended \
        --replace \
        --disableupdate \
        || log "WARNING: config.sh re-registration failed — runner continues with current token"
    else
      log "WARNING: Token renewal returned null — retrying in 1 hour"
      sleep 3600
    fi
  done
}

# ── 6. Graceful deregister on container stop ──────────────────────────────────
_cleanup() {
  log "Caught signal — deregistering runner..."
  STALE_ID=$(curl -s \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${API}" \
    | jq -r ".runners[] | select(.name == \"${RUNNER_NAME}\") | .id // empty")
  if [ -n "$STALE_ID" ]; then
    curl -s -X DELETE \
      -H "Authorization: token ${GITHUB_PAT}" \
      -H "Accept: application/vnd.github+json" \
      "${API}/${STALE_ID}" || true
  fi
  rm -f .runner .credentials
  log "Runner deregistered."
}
trap _cleanup TERM INT

# ── 7. Start background services and runner ───────────────────────────────────
renew_token_loop &

log "Starting runner..."
RUNNER_LOG=/tmp/runner-output.log
: > "$RUNNER_LOG"

# Capture runner output to file; stream it to Docker logs in parallel.
# We need RUNNER_PID from run.sh directly — can't use a pipeline (gives tee's PID).
./run.sh >> "$RUNNER_LOG" 2>&1 &
RUNNER_PID=$!
tail -F "$RUNNER_LOG" &
TAIL_PID=$!

# Watchdog: WSL2 silently drops long-poll connections. The runner enters a
# "Retrying until reconnected" loop that never recovers on its own.
# Detect it early and kill the process — Docker restarts the container cleanly.
(
  sleep 120  # grace period for initial startup
  while kill -0 "$RUNNER_PID" 2>/dev/null; do
    sleep 30
    if tail -3 "$RUNNER_LOG" 2>/dev/null | grep -q "Retrying until reconnected"; then
      log "Watchdog: runner stuck in retry loop — waiting 30s before forcing exit"
      sleep 30
      # Stand down if it recovered while we were waiting
      if tail -5 "$RUNNER_LOG" 2>/dev/null | grep -qE "reconnected\.|Listening for Jobs"; then
        log "Watchdog: runner recovered — standing down"
        continue
      fi
      log "Watchdog: still stuck — exiting to trigger container restart"
      kill "$RUNNER_PID" 2>/dev/null || true
      break
    fi
  done
) &
WATCHDOG_PID=$!

wait "${RUNNER_PID}"
EXIT_CODE=$?

kill "$TAIL_PID" 2>/dev/null || true
kill "$WATCHDOG_PID" 2>/dev/null || true
log "Runner process exited with code ${EXIT_CODE}"
exit "${EXIT_CODE}"
