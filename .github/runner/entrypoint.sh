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

# ── MongoDB ───────────────────────────────────────────────────────────────────
mongod \
  --dbpath /data/db \
  --bind_ip 127.0.0.1 \
  --fork \
  --logpath /tmp/mongod.log \
  --quiet
echo "MongoDB started"

cd /home/garci/actions-runner

# ── Remove any stale runner with the same name ────────────────────────────────
STALE_ID=$(curl -s \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "${API}" \
  | jq -r ".runners[] | select(.name == \"${RUNNER_NAME}\") | .id // empty")

if [ -n "$STALE_ID" ]; then
  echo "Removing stale runner (id: ${STALE_ID})..."
  curl -s -X DELETE \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github+json" \
    "${API}/${STALE_ID}" || true
  sleep 3
fi

# ── Register ──────────────────────────────────────────────────────────────────
REG_TOKEN=$(curl -fsSL -X POST \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/blueguy23/bill-tracker/actions/runners/registration-token" \
  | jq -r '.token')

if [[ "$REG_TOKEN" == "null" || -z "$REG_TOKEN" ]]; then
  echo "ERROR: Failed to get runner registration token. Check GITHUB_PAT has 'repo' scope."
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

# ── Graceful deregister on container stop ─────────────────────────────────────
_cleanup() {
  echo "Deregistering runner..."
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
}
trap _cleanup EXIT TERM INT

./run.sh
