---
name: debug-plugin-hooks
description: Systematic workflow for adding logging and debugging to Claude Code plugin hooks, verifying hook configuration across plugin.json and settings.json, and ensuring hooks are discoverable by the plugin system
---

## Overview

This skill captures the process of instrumenting plugin hooks with logging, verifying hook configuration is correct, and ensuring hooks are properly registered and executable.

## When to Use

- Adding logging to background hooks that run silently
- Troubleshooting why plugin hooks aren't triggering
- Verifying hook configuration across plugin.json, settings.json, and hooks.json
- Setting up debugging infrastructure for hook behavior monitoring

## Key Steps

### 1. Understand Current Hook Setup
```bash
# Check hook configuration in plugin root
cat <plugin-root>/hooks/hooks.json

# Check if hook is also in settings.json (redundant but common)
cat ~/.claude/settings.json | grep -A 10 "hooks"

# Verify plugin is enabled
ls ~/.claude/plugins/
```

### 2. Add Logging Infrastructure to Hook Script
- Add log file path variable: `LOG="$HOME/.claude/<plugin-name>.log"`
- Add timestamp function or use inline timestamps
- Log at entry point: `echo "[$(date '+%Y-%m-%d %H:%M:%S')] triggered — session=$SESSION_ID cwd=$PWD" >> "$LOG"`
- Log at all exit points (skips, errors, successes)
- Log the main command execution with output redirection

Example pattern:
```bash
LOG="$HOME/.claude/auto-agent.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] triggered — session=$SESSION_ID" >> "$LOG"

# ... conditional logic with logging ...

if [ condition ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] skip: reason" >> "$LOG"
  exit 0
fi

# Main work with output capture
<command> >> "$LOG" 2>&1 || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] error: $?" >> "$LOG"
  exit 1
}
```

### 3. Verify Hook Configuration Format
- `hooks.json` should use relative paths: `"command": "hooks/stop.sh"`
- `settings.json` entries use absolute paths: `"/Users/.../hooks/stop.sh"`
- Check that `hooks.json` has proper structure (no extra nesting)
- Verify hook event names match Claude Code documentation (e.g., "Stop", not "stop")

### 4. Test Hook Execution
```bash
# Tail the log file to see hook activity
tail -f ~/.claude/<plugin-name>.log

# Trigger the hook by running a session and checking if messages appear
```

### 5. Verify Hook Configuration is Auto-Discovered
- Check Claude Code documentation for plugin hook auto-discovery rules
- Remove redundant entries from `settings.json` if hooks.json is correct
- Reload Claude Code or plugin to trigger re-registration

## Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Hook never fires | Plugin disabled or hooks.json not found | Enable plugin, verify hooks.json exists at root |
| Hook fires but no output | Background execution without logging | Add logging infrastructure to hook script |
| Relative path errors | Hook script uses paths relative to wrong directory | Use plugin root: `PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` |
| Redundant hook registration | Same hook in both hooks.json and settings.json | Remove settings.json entry if hooks.json is correct |

## Resources

- Claude Code Plugin Documentation: https://code.claude.com/docs/en/plugins
- Hook Configuration Reference: https://code.claude.com/docs/en/hooks
