#!/bin/bash
set -euo pipefail

# ── Privilege drop ────────────────────────────────────────────────────────────
# Container starts as root so we can chown the named volumes Docker creates as
# root. Once permissions are fixed we re-exec as garci via gosu.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /home/garci/actions-runner/_work /data/db
  chown -R garci:garci /home/garci /data/db
  exec gosu garci "$0" "$@"
fi

# ── From here: running as garci ───────────────────────────────────────────────
REPO_URL="https://github.com/blueguy23/bill-tracker"
RUNNER_NAME="${RUNNER_NAME:-ci-docker}"

# ── MongoDB ───────────────────────────────────────────────────────────────────
mongod \
  --dbpath /data/db \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath /tmp/mongod.log \
  --quiet
echo "MongoDB started"

# ── Configure runner (only on first start — skip if already registered) ───────
cd /home/garci/actions-runner

if [ ! -f .runner ]; then
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

  ./config.sh \
    --url           "$REPO_URL" \
    --token         "$REG_TOKEN" \
    --name          "$RUNNER_NAME" \
    --labels        "self-hosted,Linux,X64" \
    --work          _work \
    --unattended \
    --replace \
    --disableupdate
fi

# ── Graceful deregister on container stop ─────────────────────────────────────
_cleanup() {
  echo "Deregistering runner..."
  REMOVE_TOKEN=$(curl -fsSL -X POST \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/blueguy23/bill-tracker/actions/runners/remove-token" \
    | jq -r '.token')
  ./config.sh remove --token "$REMOVE_TOKEN" 2>/dev/null || true
  # Remove config files so the next startup re-registers cleanly
  rm -f .runner .credentials .env
}
trap _cleanup EXIT TERM INT

./run.sh
