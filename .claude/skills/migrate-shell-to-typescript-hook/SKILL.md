---
name: migrate-shell-to-typescript-hook
description: Systematic workflow for migrating Claude Code plugin hooks from shell scripts to TypeScript while maintaining functionality and fixing environment configuration issues
---

## Overview

This skill captures the process of converting a shell hook script (e.g., `stop.sh`) to TypeScript while ensuring proper environment variable precedence, updating hook configuration, and handling plugin cache invalidation.

## When to Use

- Migrating shell-based plugin hooks to TypeScript for cross-platform compatibility
- Consolidating multiple shell scripts into a single TypeScript entry point
- Fixing environment variable conflicts between `.env` and shell configuration
- Updating plugin hook configuration after refactoring hook scripts
- Handling plugin cache issues after local hook changes

## Key Steps

### 1. Plan the Migration

**Assess current shell script:**
```bash
cat hooks/stop.sh
cat hooks/hooks.json
grep -n "import.*dotenv" src/*.ts  # Check if main code already uses dotenv
```

**Identify:**
- What logic exists in the shell script (JSON parsing, state tracking, conditionals, logging)
- Which environment variables are used
- Current hook configuration and entry points
- Whether `.env` file exists and what it contains

### 2. Create TypeScript Hook Entry Point

**Create new file** (e.g., `src/hook.ts`) with shebang:
```typescript
#!/usr/bin/env tsx
```

**Handle environment variables with proper precedence:**
```typescript
// FIRST: Only load .env if environment not already set
if (!process.env.ANTHROPIC_API_KEY) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env" });
}

// NOW SAFE: Import rest of code
import { readFileSync, writeFileSync, appendFileSync } from "fs";
// ... rest of imports
```

**Migrate shell logic to TypeScript:**
- JSON parsing: Use `JSON.parse(readFileSync(...))`
- File operations: Use `fs` module functions
- Logging: Use `appendFileSync()` instead of `echo >> log`
- State tracking: Translate shell variables to TypeScript variables
- Lock mechanism: Implement using `fs` operations or similar
- Exit codes: Use `process.exit(code)`

**Example pattern for state tracking from shell:**
```bash
# Old shell approach
STATE_FILE="$PLUGIN_DIR/.hook-state"
if [ -f "$STATE_FILE" ]; then
  STATE=$(cat "$STATE_FILE")
fi
```

Becomes:
```typescript
// New TypeScript approach
const stateFile = `${pluginDir}/.hook-state`;
let state = {};
if (existsSync(stateFile)) {
  state = JSON.parse(readFileSync(stateFile, "utf8"));
}
```

### 3. Update Hook Configuration

**Modify `hooks.json`** to point to new TypeScript entry:
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/src/hook.ts"  // Changed from hooks/stop.sh
          }
        ]
      }
    ]
  }
}
```

Note: The command should be an executable TypeScript file with shebang, or use:
```json
"command": "npx tsx ${CLAUDE_PLUGIN_ROOT}/src/hook.ts"
```

### 4. Test Hook Locally

**Direct execution:**
```bash
# Test with sample input
echo '{"transcript_path":"","session_id":"test","cwd":"/tmp"}' | \
  npx tsx src/hook.ts
echo "exit: $?"

# Check log file for output
tail -5 ~/.claude/auto-agent.log
```

**Verify environment setup:**
```bash
# Confirm shell variables are set
echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-not set}"
echo "ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-not set}"
echo "MODEL=${MODEL:-not set}"
```

### 5. Remove Old Shell Script

```bash
rm hooks/stop.sh
# Verify deletion
ls hooks/stop.sh 2>&1  # Should show "No such file"
```

### 6. Handle Plugin Cache Invalidation

**Problem:** Claude Code caches plugin files in `~/.claude/plugins/cache/`. Local changes aren't reflected until cache is updated.

**Solution A: Reload plugins command**
```bash
# In Claude Code, run:
# /reload-plugins
```

**Solution B: Manually patch cache** (if reload doesn't work)
```bash
# Identify plugin cache location
ls ~/.claude/plugins/cache/

# Copy updated files to cache
CACHE_DIR="~/.claude/plugins/cache/auto-agent/auto-skill/0.1.0"
cp src/hook.ts "$CACHE_DIR/src/hook.ts"
cp hooks/hooks.json "$CACHE_DIR/hooks/hooks.json"
echo "cache updated"

# Reload plugins again
# /reload-plugins
```

### 7. Verify Hook Execution

**Check logs after first hook trigger:**
```bash
tail -30 ~/.claude/auto-agent.log
```

**Look for:**
- Entry log with timestamp
- Conditional skip reasons (if any)
- Exit status
- Any error messages

**If you see API errors:**
- Check `.env` values against shell environment
- Run with verbose output: `ANTHROPIC_BASE_URL=... npx tsx src/hook.ts`
- Verify the TypeScript hook is using conditional dotenv loading

## Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Hook not found after update | Plugin cache outdated | Manually patch cache or reinstall plugin |
| API errors in TypeScript hook | Wrong env vars | Check `.env` vs shell, use conditional dotenv |
| Exit status errors | Uncaught exceptions | Add try-catch, use `process.exit(code)` explicitly |
| Relative path errors | Wrong cwd assumption | Use `process.cwd()` or resolve paths from `${CLAUDE_PLUGIN_ROOT}` |
| stdin parsing fails | Different input format | Add debug logging to see what Claude Code passes |

## Verification Checklist

- [ ] TypeScript hook created with `#!/usr/bin/env tsx` shebang
- [ ] Conditional dotenv loading implemented (shell vars have precedence)
- [ ] All shell logic translated to TypeScript equivalents
- [ ] `hooks.json` updated to point to new hook location
- [ ] Old shell script deleted
- [ ] Local test passes with sample input
- [ ] Plugin cache patched or `reload-plugins` executed
- [ ] First hook execution checked in log file
- [ ] No API configuration errors in logs

## Performance Considerations

- **Startup time:** `npx tsx` has some overhead vs direct shell; acceptable for background hooks
- **Node.js requirement:** Users now need Node.js 18+ (already required for plugin)
- **Memory:** Minimal impact for single-shot hook execution

## Benefits Over Shell

- ✓ Cross-platform (Windows, macOS, Linux)
- ✓ Better error handling with try-catch
- ✓ Type safety with TypeScript
- ✓ Code reuse with shared modules
- ✓ Easier testing and debugging
- ✓ Better environment variable handling

## Related Skills

- `typescript-hook-env-config` - Environment variable precedence patterns
- `debug-plugin-hooks` - Logging and troubleshooting hooks
- `fix-hook-path-resolution` - Path resolution in hooks
