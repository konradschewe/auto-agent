---
name: typescript-hook-env-config
description: Handling environment variables in TypeScript-based Claude Code plugin hooks to avoid dotenv conflicts and ensure proper API configuration
---

## Overview

When migrating hook scripts from shell to TypeScript, using `import "dotenv/config"` can cause environment variable conflicts. Repository `.env` files may override shell environment variables that are already correctly set in the user's Claude Code environment, causing API calls to fail with configuration errors.

## Problem

- User's shell has correct environment variables: `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `MODEL`
- TypeScript hook imports `dotenv/config` at the top
- Repository contains `.env` file with different values (e.g., different BASE_URL)
- `dotenv/config` loads the repo `.env` and **overwrites** the shell environment
- Hook fails with API errors because it's using wrong configuration
- Developer doesn't realize the `.env` file is the culprit

## Root Cause

```typescript
// ❌ PROBLEMATIC PATTERN
import "dotenv/config";  // Loads .env unconditionally

// Later, when accessing process.env:
const baseUrl = process.env.ANTHROPIC_BASE_URL;  // Gets .env value, not shell value
```

The `dotenv/config` side effect runs immediately on module load and overwrites process.env with values from `.env`, regardless of what was already set in the shell.

## Solution: Conditional dotenv Loading

Only load `.env` if variables are not already set in the shell:

```typescript
// ✓ CORRECT PATTERN
// Only load .env if environment variables are NOT already set
if (!process.env.ANTHROPIC_API_KEY) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env" });
}

// Now safe to use - will use shell values if available, .env as fallback
const apiKey = process.env.ANTHROPIC_API_KEY;
const baseUrl = process.env.ANTHROPIC_BASE_URL;
const model = process.env.MODEL;
```

## Why This Works

1. **Respects shell environment:** If user has variables set in their shell (the normal case), they take precedence
2. **Falls back to .env:** Only loads `.env` if variables are missing (useful for local development)
3. **No overwriting:** Uses dotenv's optional mode instead of forced override
4. **Predictable behavior:** Shell environment is source of truth, not filesystem

## Implementation Steps

### For Existing TypeScript Hooks

1. **Check current dotenv usage:**
   ```bash
   grep -n "dotenv" src/hook.ts src/index.ts src/agent.ts
   ```

2. **Replace all unconditional `import "dotenv/config"`:**
   ```typescript
   // OLD:
   import "dotenv/config";
   
   // NEW:
   if (!process.env.ANTHROPIC_API_KEY) {
     const dotenv = await import("dotenv");
     dotenv.config({ path: ".env" });
   }
   ```

3. **Place this check at the very top of entry point files** before any other code that uses `process.env`

4. **Verify the fix:**
   ```bash
   # Test with shell variables set (normal case)
   echo $ANTHROPIC_API_KEY
   
   # Run hook - should use shell value
   npx tsx src/hook.ts
   
   # Check logs to confirm no config errors
   tail ~/.claude/auto-agent.log
   ```

5. **Test with repo .env temporarily missing** (optional):
   ```bash
   # Temporarily rename .env
   mv .env .env.bak
   
   # Run hook - should still work because shell has variables
   npx tsx src/hook.ts
   
   # Restore
   mv .env.bak .env
   ```

## Example: Complete Hook File

```typescript
#!/usr/bin/env tsx

// FIRST: Only load .env if environment not already set
if (!process.env.ANTHROPIC_API_KEY) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env" });
}

// NOW SAFE: Import everything else
import { readFileSync, writeFileSync } from "fs";

// Use environment - will be from shell or .env fallback
const apiKey = process.env.ANTHROPIC_API_KEY;
const baseUrl = process.env.ANTHROPIC_BASE_URL;

// Rest of hook logic...
```

## When to Use This Pattern

- ✓ TypeScript hook files that import `dotenv/config`
- ✓ Development projects with `.env` files
- ✓ Plugins that run in user shells where environment is pre-configured
- ✓ When shell environment is source of truth

## When NOT Needed

- ✗ Pure shell scripts (use `source .env` explicitly if needed)
- ✗ If `.env` should always override shell variables
- ✗ If no `.env` file exists

## Key Insight

Claude Code plugins should respect the user's shell environment as the primary configuration source. Repository `.env` files are developer conveniences, not production configuration. This pattern ensures the right precedence: **shell first, `.env` as fallback**.

## Related Skills

- `debug-plugin-hooks` - Logging to diagnose which configuration is being used
- `fix-hook-path-resolution` - Path handling in hooks
- `hook-output-visibility-pattern` - Making hook execution visible in chat