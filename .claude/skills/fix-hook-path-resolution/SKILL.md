---
name: fix-hook-path-resolution
description: Fix plugin hook path resolution issues when hooks.json uses relative paths that fail when Claude Code runs from a different working directory, especially with user-scope plugin installations
---

## Overview

When a Claude Code plugin is installed at **user scope** (global, not project-specific), Claude Code may execute hooks from a different working directory than the plugin root. If `hooks.json` uses relative paths like `"command": "hooks/stop.sh"`, the hook execution fails with `No such file or directory`.

This skill captures the diagnosis and fix pattern for this issue.

## When to Use

- Plugin hook fails with: `Failed with non-blocking status code: /bin/sh: hooks/stop.sh: No such file or directory`
- Plugin works in its own repo directory but fails elsewhere
- Plugin is installed at **user scope** (global) rather than project scope
- Hook commands in `hooks.json` use relative paths

## Root Cause

Claude Code executes hook commands relative to the **session's current working directory (CWD)**, not relative to the plugin installation directory. When:
1. Plugin is installed globally at user scope (e.g., `~/.claude/plugins/cache/...`)
2. Claude Code session starts in a different directory (e.g., `~/projects/other-repo/`)
3. `hooks.json` specifies relative path: `"command": "hooks/stop.sh"`
4. Claude Code tries to run `./hooks/stop.sh` from `~/projects/other-repo/` → **fails**

The fix works in the plugin's own repo accidentally because the CWD happens to be the plugin root.

## Solution: Use `${CLAUDE_PLUGIN_ROOT}` Variable

Claude Code provides `${CLAUDE_PLUGIN_ROOT}` as a variable that resolves to the absolute plugin installation directory at runtime.

### Fix Pattern

**Before (relative path):**
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "hooks/stop.sh"
          }
        ]
      }
    ]
  }
}
```

**After (absolute path via variable):**
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop.sh"
          }
        ]
      }
    ]
  }
}
```

### Steps to Fix

1. **Locate `hooks.json`**
   ```bash
   find . -name "hooks.json" -path "*/hooks/*"
   # Typically in <plugin-root>/hooks/hooks.json
   ```

2. **Update all hook command paths to use `${CLAUDE_PLUGIN_ROOT}`**
   ```bash
   # For each hook entry:
   # OLD: "command": "hooks/stop.sh"
   # NEW: "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop.sh"
   
   # Or for other relative paths:
   # OLD: "command": "scripts/run.sh"
   # NEW: "command": "${CLAUDE_PLUGIN_ROOT}/scripts/run.sh"
   ```

3. **Verify the fix**
   ```bash
   # Review the updated hooks.json
   cat hooks/hooks.json
   ```

4. **Reinstall the plugin to update the cache**
   ```bash
   # For user-scope plugins:
   claude plugin uninstall <plugin-name> --scope user
   claude plugin install <plugin-name> --scope user
   
   # For project-scope plugins:
   claude plugin uninstall <plugin-name> --scope project
   claude plugin install <plugin-name> --scope project
   ```

5. **Test the hook from a different working directory**
   ```bash
   # Start Claude Code from a different project directory
   cd ~/other-project
   # Try to trigger the hook or verify it no longer throws "No such file or directory"
   ```

6. **Commit the fix**
   ```bash
   git add hooks/hooks.json
   git commit -m "Fix hook path to use \${CLAUDE_PLUGIN_ROOT} for user-scope installs"
   git push
   ```

## Key Insight

The `${CLAUDE_PLUGIN_ROOT}` variable is automatically available to hook commands and resolves to the absolute installation directory, making it safe to use hooks from any working directory. This is essential for plugins distributed via user scope (global installations).

## Related Issues

- Relative paths in hook commands only work if Claude Code's CWD happens to be the plugin root
- This typically hides the bug during development (repo is the CWD)
- Bug emerges only when plugin is used from a different directory
- Plugin installation at project scope may also have this issue depending on CWD

## See Also

- `debug-plugin-hooks` - Systematic debugging workflow for hooks
- `plugin-distribution-strategy` - Distribution patterns for Claude Code plugins