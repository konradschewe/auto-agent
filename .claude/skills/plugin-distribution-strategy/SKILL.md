---
name: plugin-distribution-strategy
description: Decision framework for Claude Code plugin distribution, marketplace registration, naming conventions, and environment variable handling
---

## Overview

This skill captures the decision-making process for distributing Claude Code plugins—choosing between dedicated marketplace vs simple plugin distribution, naming conventions, and credential management.

## When to Use

- Planning distribution strategy for a new Claude Code plugin
- Deciding whether to create a dedicated marketplace or use existing one
- Determining plugin and marketplace naming to avoid confusion
- Configuring credential access (API keys) for plugins
- Writing plugin documentation for end-users

## Key Decisions

### 1. Marketplace vs Simple Plugin Distribution

**Option A: Dedicated Marketplace (Multi-Plugin Strategy)**
- Use case: You plan multiple related plugins
- Flow: User adds marketplace first (`/plugin add <marketplace-url>`), then installs individual plugins from it
- Install syntax: `/plugin install plugin-name@marketplace-name`
- Benefits: Single catalog for all your plugins, centralized updates
- Overhead: Extra indirection, users must know marketplace exists

**Option B: Direct Plugin Distribution (Single Plugin)**
- Use case: One-off plugin or plugin for specific use case
- Flow: User directly adds plugin (`/plugin add <plugin-url>`)
- Install syntax: `/plugin install plugin-name`
- Benefits: Simpler for end users, fewer steps, no marketplace overhead
- Trade-off: Doesn't scale if you add more plugins later

**Decision Rule:** If shipping only 1 plugin, use Option B (direct). If planning 2+, set up dedicated marketplace.

### 2. Naming Conventions

The naming format `plugin-name@marketplace-name` can create confusion if both are identical:

**Problematic:** `auto-agent@auto-agent` — repetitive and unclear
- Root cause: Plugin name = marketplace name

**Better Options:**
1. **Owner-based marketplace:** `auto-agent@konradschewe` or `auto-agent@your-username`
   - Makes it clear who owns/maintains it
   - Allows multiple plugins under same marketplace
   - Standard pattern in many package managers (npm, PyPI)

2. **Simplified direct distribution:** Just `auto-agent` (no @namespace needed)
   - Clearest for single plugins
   - Standard format for direct installations

**Recommendation:** For a single plugin, skip the marketplace entirely and use direct distribution.

### 3. Environment Variable Handling

**Standard Pattern (Preferred):**
- Plugins inherit environment variables from Claude Code's parent shell
- If user has `ANTHROPIC_API_KEY` set in their shell (which they need for Claude Code anyway), it's automatically available in hooks
- No custom `.env` file needed for typical installations

**Implementation:**
```bash
# In hook script, just use the variable directly
export API_KEY="${ANTHROPIC_API_KEY}"
```

**Custom `.env` Pattern (Fallback Only):**
- Use `~/.claude/<plugin-name>.env` for special cases (custom proxies, development, non-standard setups)
- NOT the standard path — most users won't have this
- Document as optional advanced configuration

**Documentation Pattern:**
1. "Works out of the box if you have ANTHROPIC_API_KEY in your shell"
2. For special cases: "Optionally create ~/.claude/<plugin-name>.env for custom settings"

### 4. Plugin Installation Flow Documentation

**For Direct Distribution:**
```
1. Add plugin: /plugin add <github-url>
2. Install locally: /plugin install plugin-name
3. Reload Claude Code
4. Ready to use (ANTHROPIC_API_KEY inherited from environment)
```

**For Marketplace Distribution:**
```
1. Add marketplace: /plugin add <marketplace-url>
2. View available plugins: /plugin discover
3. Install desired plugin: /plugin install plugin-name@marketplace-name
4. Reload Claude Code
5. Ready to use
```

### 5. README Documentation Structure

When documenting a plugin for distribution:

1. **Quick description** - What it does in 1-2 sentences
2. **Installation** - Step-by-step flow (see patterns above)
3. **How it works** - Architecture, what happens behind the scenes
4. **Troubleshooting** - Common issues and solutions
5. **Development** - For contributors (optional)

Key: Installation should be prominent and concise.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Creating marketplace for single plugin | Use direct distribution instead; simpler for users |
| Identical plugin and marketplace names | Use owner-based marketplace naming or skip marketplace entirely |
| Assuming custom `.env` needed | Standard pattern: inherit ANTHROPIC_API_KEY from environment |
| Installing via symlink instead of `/plugin install` | Users should use plugin system, not manual symlinking |
| Removing install.sh but forgetting to document new flow | Update README to match actual installation method |

## Decision Flowchart

```
Q: Planning to ship multiple plugins?
├─ YES → Use dedicated marketplace (owner-based naming)
│        Doc: Multi-step flow with `/plugin add marketplace` first
├─ NO → Use direct distribution
│       Doc: Simple flow with `/plugin install plugin-name`
│
Q: Plugin needs special credentials beyond ANTHROPIC_API_KEY?
├─ YES → Document custom ~/.claude/<plugin-name>.env as optional
├─ NO → Just inherit from environment (standard)
```

## Resources

- Claude Code Plugin Documentation: https://code.claude.com/docs/en/plugins
- Hook Configuration: https://code.claude.com/docs/en/hooks
- Plugin Discovery: https://code.claude.com/docs/en/discover-plugins
