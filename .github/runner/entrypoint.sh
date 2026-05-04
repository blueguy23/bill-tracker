#!/bin/bash
set -euo pipefail

# ── Privilege drop ────────────────────────────────────────────────────────────
if [ "$(id -u)" = "0" ]; then
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

# ── 1. Fix WSL clock drift immediately on start ───────────────────────────────
# WSL2 desyncs after host sleep — breaks TLS handshakes and package cache checks
log "Syncing clock..."
hwclock --hctosys 2>/dev/null || \
  ntpdate -u pool.ntp.org 2>/dev/null || \
  chronyc makestep 2>/dev/null || \
  log "WARNING: Could not sync clock — TLS errors may follow"

# ── 2. Docker Hub auth (optional — prevents anonymous pull rate limits) ───────
if [ -n "${DOCKERHUB_USERNAME:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  log "Authenticating with Docker Hub..."
  echo "${DOCKERHUB_TOKEN}" | docker login --username "${DOCKERHUB_USERNAME}" --password-stdin
  log "Docker Hub auth: OK"
else
  log "No Docker Hub credentials — anonymous pulls limited to 100/6hr"
fi

# ── 3. MongoDB ────────────────────────────────────────────────────────────────
mongod \
  --dbpath /data/db \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath /tmp/mongod.log \
  --quiet
log "MongoDB started"

cd /home/garci/actions-runner

# ── 4. Remove any stale runner with the same name ────────────────────────────
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

# ── 5. Register ───────────────────────────────────────────────────────────────
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

# ── 6. Token renewal loop ─────────────────────────────────────────────────────
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

# ── 7. Graceful deregister on container stop ──────────────────────────────────
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

# ── 8. Start background services and runner ───────────────────────────────────
renew_token_loop &
cron &

log "Starting runner..."
./run.sh &
RUNNER_PID=$!

wait "${RUNNER_PID}"
EXIT_CODE=$?
log "Runner process exited with code ${EXIT_CODE}"
exit "${EXIT_CODE}"
