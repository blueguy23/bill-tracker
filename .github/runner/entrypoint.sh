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

# ── 5. Graceful deregister on container stop ──────────────────────────────────
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

# ── 6. Run one job, then exit ─────────────────────────────────────────────────
# --once makes the runner exit after completing a single job. Docker's
# restart: unless-stopped brings the container back up with a fresh
# connection and re-registration — eliminates stale long-poll issues
# and ensures clean state between jobs.
log "Starting runner (--once mode)..."
exec ./run.sh --once
