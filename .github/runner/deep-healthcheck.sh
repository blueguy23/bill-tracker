#!/bin/bash
# Readiness check — passes only if GitHub API reports this runner as online.
# Used as Docker HEALTHCHECK CMD so autoheal acts on real connectivity,
# not just process existence.

RUNNER_STATUS=$(curl -sf \
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
