#!/bin/bash
set -euo pipefail

REPO_URL="https://github.com/blueguy23/bill-tracker"
RUNNER_NAME="${RUNNER_NAME:-ci-docker}"

# ── MongoDB ───────────────────────────────────────────────────────────────────
mkdir -p /data/db
mongod \
  --dbpath /data/db \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath /tmp/mongod.log \
  --quiet
echo "MongoDB started"

# ── Registration token ────────────────────────────────────────────────────────
cd /home/garci/actions-runner

REG_TOKEN=$(curl -fsSL -X POST \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/blueguy23/bill-tracker/actions/runners/registration-token" \
  | jq -r '.token')

if [[ "$REG_TOKEN" == "null" || -z "$REG_TOKEN" ]]; then
  echo "ERROR: Failed to get runner registration token."
  echo "       Check that GITHUB_PAT is set and has 'repo' scope."
  exit 1
fi

# ── Configure runner (--replace removes stale registration with same name) ───
./config.sh \
  --url     "$REPO_URL" \
  --token   "$REG_TOKEN" \
  --name    "$RUNNER_NAME" \
  --labels  "self-hosted,Linux,X64" \
  --work    _work \
  --unattended \
  --replace

# ── Graceful deregister on SIGTERM / container stop ───────────────────────────
_cleanup() {
  echo "Deregistering runner..."
  REMOVE_TOKEN=$(curl -fsSL -X POST \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/blueguy23/bill-tracker/actions/runners/remove-token" \
    | jq -r '.token')
  ./config.sh remove --token "$REMOVE_TOKEN" 2>/dev/null || true
}
trap _cleanup EXIT TERM INT

./run.sh
