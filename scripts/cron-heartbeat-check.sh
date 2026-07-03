#!/bin/bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# --- CI runner self-heal ----------------------------------------------------
# WSL2/host reboots kill the self-hosted GitHub runner containers
# (ci-runner-1, ci-runner-2 from ghostrunner/docker-compose.yml). This section
# detects that and attempts to bring the stack back up. It must NEVER cause
# this script to exit non-zero — the existing heartbeat duties below are the
# primary job and must always run regardless of what happens here.
#
# cron runs with a bare PATH (no /usr/local/bin, no nvm), so resolve docker
# via an explicit PATH extension + command -v rather than assuming it's found.
check_ci_runners() {
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local compose_file="/home/garci/projects/ghostrunner/docker-compose.yml"

  PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

  local docker_bin
  docker_bin="$(command -v docker)"
  if [ -z "$docker_bin" ]; then
    echo "[$ts] runner-check: docker not found on PATH — skipping runner-health check"
    return 0
  fi

  local before
  before="$("$docker_bin" ps --format '{{.Names}}' 2>/dev/null)"

  local missing=""
  for name in ci-runner-1 ci-runner-2; do
    if ! grep -qx "$name" <<< "$before"; then
      missing="$missing $name"
    fi
  done

  if [ -n "$missing" ]; then
    echo "[$ts] runner-check: missing runner(s):$missing — before: [$(tr '\n' ' ' <<< "$before")]"
    echo "[$ts] runner-check: attempting self-heal — docker compose -f $compose_file up -d"
    "$docker_bin" compose -f "$compose_file" up -d 2>&1 | sed "s/^/[$ts] runner-check: compose: /"
    local after
    after="$("$docker_bin" ps --format '{{.Names}}' 2>/dev/null)"
    echo "[$ts] runner-check: after heal — [$(tr '\n' ' ' <<< "$after")]"
  else
    echo "[$ts] runner-check: ci-runner-1 and ci-runner-2 running — OK"
  fi

  if command -v gh >/dev/null 2>&1; then
    local gh_status
    if gh_status="$(gh api repos/blueguy23/bill-tracker/actions/runners --jq '.runners[] | "\(.name) \(.status)"' 2>&1)"; then
      echo "[$ts] runner-check: GitHub-reported runner status:"
      echo "$gh_status" | sed "s/^/[$ts] runner-check:   /"
    else
      echo "[$ts] runner-check: gh api call failed (non-fatal, logging only): $gh_status"
    fi
  else
    echo "[$ts] runner-check: gh CLI not available in this environment — skipping GitHub status verification"
  fi

  return 0
}

# Never let a failure in the runner-health section touch this script's exit code.
check_ci_runners || echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] runner-check: encountered an unexpected error — continuing (non-fatal)"
# -----------------------------------------------------------------------------

cd /home/garci/projects/bill-tracker && npx tsx scripts/cron-heartbeat-check.ts "$@"
