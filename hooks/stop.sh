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

# Determine skill output directory:
# If the session has a project-local .claude/skills/, write there.
# Otherwise fall back to ~/.claude/skills/.
if [[ -n "$CWD" && -d "$CWD/.claude/skills" ]]; then
  SKILLS_DIR="$CWD/.claude/skills"
elif [[ -n "$CWD" && -d "$CWD/.claude" ]]; then
  SKILLS_DIR="$CWD/.claude/skills"
else
  SKILLS_DIR="$HOME/.claude/skills"
fi

mkdir -p "$SKILLS_DIR"

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

log "starting agent — transcript=$TRANSCRIPT_PATH skills-dir=$SKILLS_DIR turns=$TURN_COUNT last-analyzed=$LAST_TURNS"

# Run pattern analysis
if npx --prefix "$PLUGIN_DIR" tsx "$PLUGIN_DIR/src/index.ts" \
  --transcript "$TRANSCRIPT_PATH" \
  --skills-dir "$SKILLS_DIR" \
  --session-id "$SESSION_ID" \
  --from-turn "$LAST_TURNS" >> "$LOG" 2>&1; then
  log "agent finished"
  # Record session + turn count so next run knows where we left off
  sed -i '' "/^$SESSION_ID /d" "$ANALYZED_LOG" 2>/dev/null || true
  echo "$SESSION_ID $TURN_COUNT" >> "$ANALYZED_LOG"
else
  log "agent failed (exit $?)"
fi
