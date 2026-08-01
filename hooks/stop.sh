#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$HOME/.claude/auto-agent.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

INPUT=$(cat)

TRANSCRIPT_PATH=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.transcript_path??'')" 2>/dev/null || true)
SESSION_ID=$(echo "$INPUT"     | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.session_id??'')"    2>/dev/null || true)
CWD=$(echo "$INPUT"            | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.cwd??'')"            2>/dev/null || true)

log "triggered — session=$SESSION_ID cwd=$CWD"

if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
  log "skip: transcript not found ($TRANSCRIPT_PATH)"
  exit 0
fi

# Scope: "both" (default), "project", or "user"
# Set via plugin userConfig (CLAUDE_PLUGIN_OPTION_SCOPE) or AUTO_SKILL_SCOPE env var
SCOPE="${CLAUDE_PLUGIN_OPTION_SCOPE:-${AUTO_SKILL_SCOPE:-both}}"

# Determine skills directories based on scope
PROJECT_SKILLS_DIR=""
USER_SKILLS_DIR=""

if [[ "$SCOPE" == "both" || "$SCOPE" == "project" ]]; then
  if [[ -n "$CWD" && -d "$CWD/.claude" ]]; then
    PROJECT_SKILLS_DIR="$CWD/.claude/skills"
    mkdir -p "$PROJECT_SKILLS_DIR"
  fi
fi

if [[ "$SCOPE" == "both" || "$SCOPE" == "user" ]]; then
  USER_SKILLS_DIR="$HOME/.claude/skills"
  mkdir -p "$USER_SKILLS_DIR"
fi

# Need at least one dir
if [[ -z "$PROJECT_SKILLS_DIR" && -z "$USER_SKILLS_DIR" ]]; then
  log "skip: no skills directories available (scope=$SCOPE, cwd=$CWD)"
  exit 0
fi

TURN_COUNT=$(python3 -c "
import json, sys
n = 0
with open(sys.argv[1]) as f:
    for line in f:
        try:
            e = json.loads(line)
            if e.get('message', {}).get('role'): n += 1
        except: pass
print(n)
" "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)

# Analyzed log lives in plugin data dir (persists across updates, outside repo)
ANALYZED_LOG="${CLAUDE_PLUGIN_DATA:-$HOME/.claude}/.auto-skill-analyzed"
touch "$ANALYZED_LOG"
LAST_TURNS=$(grep "^$SESSION_ID " "$ANALYZED_LOG" 2>/dev/null | awk '{print $2}' | tail -1 || echo "0")

# Load credentials from plugin-dir .env if present (local development only)
if [[ -f "$PLUGIN_DIR/.env" ]]; then
  set -o allexport
  source "$PLUGIN_DIR/.env"
  set +o allexport
fi

log "starting agent — turns=$TURN_COUNT last-analyzed=$LAST_TURNS scope=$SCOPE project-skills=${PROJECT_SKILLS_DIR:-none} user-skills=${USER_SKILLS_DIR:-none}"

# Build args
ARGS=(
  --transcript "$TRANSCRIPT_PATH"
  --session-id "$SESSION_ID"
  --from-turn "$LAST_TURNS"
)
[[ -n "$PROJECT_SKILLS_DIR" ]] && ARGS+=(--project-skills-dir "$PROJECT_SKILLS_DIR")
[[ -n "$USER_SKILLS_DIR" ]]    && ARGS+=(--user-skills-dir "$USER_SKILLS_DIR")

if npx --prefix "$PLUGIN_DIR" tsx "$PLUGIN_DIR/src/index.ts" "${ARGS[@]}" >> "$LOG" 2>&1; then
  log "agent finished"
  sed -i '' "/^$SESSION_ID /d" "$ANALYZED_LOG" 2>/dev/null || true
  echo "$SESSION_ID $TURN_COUNT" >> "$ANALYZED_LOG"
else
  log "agent failed (exit $?)"
fi
