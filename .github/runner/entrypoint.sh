#!/bin/bash
set -euo pipefail

# ── Privilege drop ────────────────────────────────────────────────────────────
if [ "$(id -u)" = "0" ]; then
  /preflight-check.sh || exit $?

  # Clock sync must run as root with SYS_TIME capability (set in docker-compose.yml).
  # Start chronyd as a daemon so chronyc can be used for periodic re-sync.
  # WSL2 desyncs after host sleep — fix before gosu so TLS ops don't fail.
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Syncing clock..."
  chronyd 2>/dev/null || \
    ntpdate -u pool.ntp.org 2>/dev/null || \
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] WARNING: Could not sync clock — TLS errors may follow"
  chronyc makestep 1.0 3 >/dev/null 2>&1 || true
  chronyc tracking 2>/dev/null | grep "System time" | \
    awk '{print "[CLOCK] startup offset: " $4 " " $5}'

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
REPO_OWNER="${REPO_OWNER:-blueguy23}"
REPO_NAME="${REPO_NAME:-bill-tracker}"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"
RUNNER_NAME="${RUNNER_NAME:-ci-docker}"
SESSION_CONFLICT_WAIT="${SESSION_CONFLICT_WAIT:-30}"
GITHUB_API="https://api.github.com"
CURL_CMD="${CURL_CMD:-curl}"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

# ── Registration functions (testable via CURL_CMD override) ──────────────────

_get_registration_token() {
  if [ -z "${GITHUB_PAT:-}" ]; then
    log "ERROR: GITHUB_PAT is not set"
    return 1
  fi

  local RESPONSE TOKEN
  RESPONSE=$($CURL_CMD -fsSL -X POST \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runners/registration-token" 2>/dev/null) || {
    log "ERROR: Failed to get registration token (HTTP error or network failure)"
    return 1
  }

  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    log "ERROR: Failed to get runner registration token. Check GITHUB_PAT has 'repo' scope."
    return 1
  fi

  echo "$TOKEN"
}

_get_remove_token() {
  if [ -z "${GITHUB_PAT:-}" ]; then
    log "ERROR: GITHUB_PAT is not set"
    return 1
  fi

  local RESPONSE TOKEN
  RESPONSE=$($CURL_CMD -fsSL -X POST \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runners/remove-token" 2>/dev/null) || {
    log "ERROR: Failed to get remove token (HTTP error or network failure)"
    return 1
  }

  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    log "ERROR: Failed to get runner remove token. Check GITHUB_PAT has 'repo' scope."
    return 1
  fi

  echo "$TOKEN"
}

_register_runner() {
  local REG_TOKEN="${1:?_register_runner requires a registration token as \$1}"

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

_deregister_runner() {
  local RUNNER_ID
  RUNNER_ID=$($CURL_CMD -sf --max-time 10 \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runners" \
    | jq -r --arg name "$RUNNER_NAME" '.runners[] | select(.name == $name) | .id') || true

  if [ -n "$RUNNER_ID" ] && [ "$RUNNER_ID" != "null" ]; then
    log "Deregistering runner (id=${RUNNER_ID}) from GitHub..."
    local HTTP_CODE
    HTTP_CODE=$($CURL_CMD -s -o /dev/null -w '%{http_code}' --max-time 10 -X DELETE \
      -H "Authorization: token ${GITHUB_PAT}" \
      -H "Accept: application/vnd.github+json" \
      "${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runners/${RUNNER_ID}")

    if [ "$HTTP_CODE" = "204" ]; then
      log "Runner deregistered."
    elif [ "$HTTP_CODE" = "403" ]; then
      log "ERROR: Deregistration returned 403 — GITHUB_PAT may lack 'repo' or 'manage_runners:org' scope"
    else
      log "WARNING: Deregistration returned HTTP ${HTTP_CODE} (GitHub will clean up eventually)"
    fi
  fi
}

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

# ── 3. Clock re-sync loop (compensates for WSL2 drift mid-job) ───────────────
CLOCK_SYNC_PID=""
TOKEN_WATCH_PID=""

_clock_sync_loop() {
  while true; do
    sleep 60
    if ! chronyc makestep 1.0 3 >/dev/null 2>&1; then
      echo "[CLOCK] WARNING: chronyc makestep failed — drift may be accumulating"
    else
      OFFSET=$(chronyc tracking 2>/dev/null | grep "System time" | awk '{print $4}')
      if [ -n "$OFFSET" ]; then
        OFFSET_ABS=$(echo "$OFFSET" | tr -d '-')
        if awk "BEGIN {exit !($OFFSET_ABS > 2.0)}"; then
          echo "[CLOCK] WARNING: large drift detected — ${OFFSET}s offset after sync"
        else
          echo "[CLOCK] sync OK — offset ${OFFSET}s"
        fi
      fi
    fi
  done
}

_clock_sync_loop &
CLOCK_SYNC_PID=$!

# ── 3b. PAT re-validation loop (detects token expiry while runner is live) ───
_token_watch_loop() {
  while true; do
    sleep 21600  # 6 hours
    HTTP_STATUS=$(${CURL_CMD:-curl} -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $GITHUB_PAT" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/user)
    if [ "$HTTP_STATUS" = "200" ]; then
      echo "[TOKEN] re-validation OK — PAT still valid"
      rm -f /tmp/token-invalid
    elif [ "$HTTP_STATUS" = "000" ]; then
      echo "[TOKEN] WARNING: GitHub API unreachable (HTTP 000) — skipping sentinel"
    else
      echo "[TOKEN] WARNING: PAT re-validation failed — HTTP ${HTTP_STATUS}"
      echo "[TOKEN] Runner will continue but registration renewal may fail"
      touch /tmp/token-invalid
    fi
  done
}

_token_watch_loop &
TOKEN_WATCH_PID=$!

# ── 4. Graceful shutdown ─────────────────────────────────────────────────────
STOP=0

_cleanup() {
  log "Caught signal — stopping runner loop..."
  STOP=1
  [ -n "${TOKEN_WATCH_PID:-}" ] && kill "$TOKEN_WATCH_PID" 2>/dev/null
  [ -n "${CLOCK_SYNC_PID:-}" ] && kill "$CLOCK_SYNC_PID" 2>/dev/null
  kill "$RUNNER_PID" 2>/dev/null || true
  kill "$WATCHDOG_PID" 2>/dev/null || true
  kill "$TAIL_PID" 2>/dev/null || true
  _deregister_runner
  rm -f .runner .credentials
  log "Runner stopped."
}
trap _cleanup TERM INT

# ── 5. Ephemeral runner loop ─────────────────────────────────────────────────
# Each iteration: get a fresh token → register as ephemeral → run one job → repeat.
# Ephemeral runners auto-deregister after each job, so no stale cleanup needed.
RUNNER_LOG=/tmp/runner-output.log

register() {
  _deregister_runner

  local REG_TOKEN
  REG_TOKEN=$(_get_registration_token) || return 1

  _register_runner "$REG_TOKEN"
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
        if tail -5 "$RUNNER_LOG" 2>/dev/null | grep -q "Listening for Jobs"; then
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

  if grep -q "A session for this runner already exists" "$RUNNER_LOG" 2>/dev/null; then
    log "Runner exited with session conflict — waiting ${SESSION_CONFLICT_WAIT}s for GitHub to clear stale session..."
    sleep "$SESSION_CONFLICT_WAIT"
  else
    log "Runner exited with code ${EXIT_CODE} — re-registering..."
    sleep 2
  fi
done
