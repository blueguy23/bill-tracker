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

  # DNS fallback — WSL2 DNS breaks silently after network changes or VPN cycles.
  grep -q '8.8.8.8' /etc/resolv.conf || echo 'nameserver 8.8.8.8' >> /etc/resolv.conf

  # gosu uses initgroups() which only reads /etc/group — Docker's group_add is
  # applied at the container process level but gosu drops it when switching user.
  # Register the socket GID in /etc/group so Runner.Listener inherits it.
  SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
  getent group "$SOCK_GID" >/dev/null 2>&1 || groupadd -g "$SOCK_GID" docker-sock
  usermod -aG "$SOCK_GID" garci

  mkdir -p /home/garci/actions-runner/_work /data/db
  chown -R garci:garci /home/garci /data/db
  exec gosu garci "$0" "$@"
fi

# ── From here: running as garci ───────────────────────────────────────────────
REPO_URL="https://github.com/blueguy23/bill-tracker"
RUNNER_NAME="${RUNNER_NAME:-ci-docker}"
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

# ── 3. Graceful shutdown ─────────────────────────────────────────────────────
STOP=0
_cleanup() {
  log "Caught signal — stopping runner loop..."
  STOP=1
  kill "$RUNNER_PID" 2>/dev/null || true
  kill "$WATCHDOG_PID" 2>/dev/null || true
  kill "$TAIL_PID" 2>/dev/null || true
  rm -f .runner .credentials
  log "Runner stopped."
}
trap _cleanup TERM INT

# ── 4. Ephemeral runner loop ─────────────────────────────────────────────────
# Each iteration: get a fresh token → register as ephemeral → run one job → repeat.
# Ephemeral runners auto-deregister after each job, so no stale cleanup needed.
RUNNER_LOG=/tmp/runner-output.log

remove_stale_runner() {
  local RUNNER_ID
  RUNNER_ID=$(curl -fsSL \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${GITHUB_API}/repos/blueguy23/bill-tracker/actions/runners" \
    | jq -r ".runners[] | select(.name==\"${RUNNER_NAME}\") | .id" 2>/dev/null)

  if [[ -n "$RUNNER_ID" ]]; then
    log "Removing stale runner registration (id=${RUNNER_ID})..."
    curl -fsSL -X DELETE \
      -H "Authorization: token ${GITHUB_PAT}" \
      -H "Accept: application/vnd.github+json" \
      "${GITHUB_API}/repos/blueguy23/bill-tracker/actions/runners/${RUNNER_ID}" || true
    sleep 2
  fi
}

register() {
  remove_stale_runner

  local REG_TOKEN
  REG_TOKEN=$(curl -fsSL -X POST \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${GITHUB_API}/repos/blueguy23/bill-tracker/actions/runners/registration-token" \
    | jq -r '.token')

  if [[ "$REG_TOKEN" == "null" || -z "$REG_TOKEN" ]]; then
    log "ERROR: Failed to get runner registration token. Check GITHUB_PAT has 'repo' scope."
    return 1
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
    --ephemeral \
    --disableupdate
}

while [ "$STOP" -eq 0 ]; do
  log "Registering ephemeral runner..."
  if ! register; then
    log "Registration failed — retrying in 10s..."
    sleep 10
    continue
  fi
  log "Runner registered. Waiting for a job..."

  : > "$RUNNER_LOG"
  ./run.sh >> "$RUNNER_LOG" 2>&1 &
  RUNNER_PID=$!
  tail -F "$RUNNER_LOG" &
  TAIL_PID=$!

  # Watchdog: WSL2 silently drops long-poll connections. The runner enters a
  # "Retrying until reconnected" loop that never recovers on its own.
  # Detect it early and kill the process so the loop re-registers fresh.
  (
    sleep 120
    while kill -0 "$RUNNER_PID" 2>/dev/null; do
      sleep 30
      if tail -3 "$RUNNER_LOG" 2>/dev/null | grep -q "Retrying until reconnected"; then
        log "Watchdog: runner stuck in retry loop — waiting 30s before forcing exit"
        sleep 30
        if tail -5 "$RUNNER_LOG" 2>/dev/null | grep -qE "reconnected\.|Listening for Jobs"; then
          log "Watchdog: runner recovered — standing down"
          continue
        fi
        log "Watchdog: still stuck — killing runner to re-register"
        kill "$RUNNER_PID" 2>/dev/null || true
        break
      fi
    done
  ) &
  WATCHDOG_PID=$!

  wait "${RUNNER_PID}" 2>/dev/null
  EXIT_CODE=$?
  kill "$TAIL_PID" 2>/dev/null || true
  kill "$WATCHDOG_PID" 2>/dev/null || true

  log "Runner exited with code ${EXIT_CODE} — re-registering..."
  sleep 2
done
