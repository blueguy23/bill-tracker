#!/bin/bash
# Readiness check — two layers:
#   1. Local: fail immediately if the runner is stuck retrying (WSL2 long-poll drop)
#   2. Remote: fail if GitHub API no longer reports this runner as online
# Used as Docker HEALTHCHECK CMD so autoheal restarts on real connectivity loss.

LOG="/home/garci/actions-runner/_diag/Runner_*.log"

# shellcheck disable=SC2086
if tail -5 $LOG 2>/dev/null | grep -q "Retrying until reconnected"; then
  echo "Runner stuck in retry loop — reporting unhealthy"
  exit 1
fi

RUNNER_STATUS=$(curl -sf --max-time 10 \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runners" \
  | jq -r --arg name "${RUNNER_NAME}" \
    '.runners[] | select(.name == $name) | .status')

if [ "${RUNNER_STATUS}" = "online" ]; then
  exit 0
fi

echo "Runner status: '${RUNNER_STATUS:-not found}' — reporting unhealthy"
exit 1
