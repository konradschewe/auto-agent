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

TURN_COUNT=$(grep -c '"role"' "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)

# Deduplicate: skip if this transcript was already analyzed
ANALYZED_LOG="$PLUGIN_DIR/.analyzed"
touch "$ANALYZED_LOG"
if grep -qF "$SESSION_ID" "$ANALYZED_LOG" 2>/dev/null; then
  log "skip: already analyzed"
  exit 0
fi

# Load credentials from plugin-dir .env if present (local development only)
if [[ -f "$PLUGIN_DIR/.env" ]]; then
  set -o allexport
  source "$PLUGIN_DIR/.env"
  set +o allexport
fi

log "starting agent — transcript=$TRANSCRIPT_PATH skills-dir=$SKILLS_DIR turns=$TURN_COUNT"

# Run pattern analysis
if npx --prefix "$PLUGIN_DIR" tsx "$PLUGIN_DIR/src/index.ts" \
  --transcript "$TRANSCRIPT_PATH" \
  --skills-dir "$SKILLS_DIR" \
  --session-id "$SESSION_ID" >> "$LOG" 2>&1; then
  log "agent finished"
  echo "$SESSION_ID" >> "$ANALYZED_LOG"
else
  log "agent failed (exit $?)"
fi
