#!/usr/bin/env bash
# CI Failure Watch Hook — PostToolUse (Bash)
# After `git push`, spawns a fully detached background watcher that tracks
# the resulting GitHub Actions run and drops an alert file on failure.
# The hook itself NEVER blocks — always exits 0 fast.
#
# Invoke normally (as a hook) to detect+spawn, or with `--watch <branch>`
# to run the actual watcher loop (used internally by the detached process).
#
# Based on Claude Code Mastery Guides V1-V5 by TheDecipherist

set -uo pipefail

REPO_DIR="/home/garci/projects/bill-tracker"
REPO_SLUG="blueguy23/bill-tracker"
LOG_DIR="$REPO_DIR/logs"
ALERT_FILE="$LOG_DIR/.ci-alert"
LOCK_DIR="/tmp/.ci-watch-locks"
WATCH_LOG="$LOG_DIR/ci-watch.log"

mkdir -p "$LOCK_DIR" "$LOG_DIR" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Watcher mode: run in background, tracks one branch's newest CI run.
# ---------------------------------------------------------------------------
run_watcher() {
    local branch="$1"
    local lock_file="$LOCK_DIR/${branch//\//_}.lock"

    # Skip if a watcher is already running for this branch
    if [ -e "$lock_file" ]; then
        local existing_pid
        existing_pid=$(cat "$lock_file" 2>/dev/null || echo "")
        if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
            exit 0
        fi
    fi
    echo $$ > "$lock_file"
    trap 'rm -f "$lock_file"' EXIT

    {
        echo "[$(date -Iseconds)] watch start branch=$branch pid=$$"

        # Give GitHub Actions a moment to register the run
        sleep 30

        local run_id=""
        local attempt
        for attempt in 1 2 3; do
            run_id=$(gh run list --repo "$REPO_SLUG" --branch "$branch" --limit 1 \
                --json databaseId,status --jq '.[0].databaseId' 2>/dev/null || echo "")
            if [ -n "$run_id" ] && [ "$run_id" != "null" ]; then
                break
            fi
            echo "[$(date -Iseconds)] no run found yet (attempt $attempt/3)"
            sleep 30
        done

        if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
            echo "[$(date -Iseconds)] no CI run appeared for branch=$branch — nothing to watch (likely path-filtered push)"
            exit 0
        fi

        echo "[$(date -Iseconds)] watching run_id=$run_id"

        # Cap total watch time at ~30 minutes
        if command -v timeout &>/dev/null; then
            timeout 1800 gh run watch "$run_id" --repo "$REPO_SLUG" --exit-status --interval 30
        else
            gh run watch "$run_id" --repo "$REPO_SLUG" --exit-status --interval 30
        fi
        local watch_exit=$?

        if [ "$watch_exit" -ne 0 ]; then
            local failed_jobs run_url
            failed_jobs=$(gh run view "$run_id" --repo "$REPO_SLUG" --json jobs \
                --jq '[.jobs[] | select(.conclusion=="failure") | .name] | join(", ")' 2>/dev/null || echo "unknown")
            run_url=$(gh run view "$run_id" --repo "$REPO_SLUG" --json url --jq '.url' 2>/dev/null || echo "unknown")

            {
                echo "branch=$branch run_id=$run_id failed_jobs=${failed_jobs:-unknown} url=$run_url"
            } > "$ALERT_FILE"

            echo "[$(date -Iseconds)] CI FAILED run_id=$run_id failed_jobs=${failed_jobs:-unknown}"
        else
            echo "[$(date -Iseconds)] CI passed run_id=$run_id"
        fi
    } >> "$WATCH_LOG" 2>&1

    exit 0
}

if [ "${1:-}" = "--watch" ]; then
    run_watcher "${2:-unknown}"
    exit 0
fi

# ---------------------------------------------------------------------------
# Hook mode: read stdin, detect `git push`, spawn detached watcher.
# ---------------------------------------------------------------------------
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)

if [ -z "$COMMAND" ]; then
    exit 0
fi

case "$COMMAND" in
    *"git push"*) ;;
    *) exit 0 ;;
esac

BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
    exit 0
fi

# Spawn a fully detached watcher — nohup + setsid, all fds redirected.
nohup setsid bash "$REPO_DIR/.claude/hooks/ci-watch.sh" --watch "$BRANCH" \
    </dev/null >/dev/null 2>&1 &
disown 2>/dev/null || true

exit 0
