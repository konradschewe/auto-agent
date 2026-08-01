---
name: plugin-distribution-strategy
description: Decision framework for Claude Code plugin distribution, marketplace registration, naming conventions, and environment variable handling
---

## Overview

This skill captures the decision-making process for distributing Claude Code plugins—choosing between dedicated marketplace vs simple plugin distribution, naming conventions, credential management, and the final recommended approach for single-plugin shipping.

## When to Use

- Planning distribution strategy for a new Claude Code plugin
- Deciding whether to create a dedicated marketplace or use existing one
- Determining plugin and marketplace naming to avoid confusion
- Configuring credential access (API keys) for plugins
- Writing plugin documentation for end-users
- Determining whether to keep marketplace.json and install scripts

## Key Decisions

### 1. Marketplace vs Simple Plugin Distribution

**Option A: Dedicated Marketplace (Multi-Plugin Strategy)**
- Use case: You plan multiple related plugins
- Flow: User adds marketplace first (`/plugin add <marketplace-url>`), then installs individual plugins from it
- Install syntax: `/plugin install plugin-name@marketplace-name`
- Benefits: Single catalog for all your plugins, centralized updates
- Overhead: Extra indirection, users must know marketplace exists
- Files needed: `.claude-plugin/marketplace.json`

**Option B: Direct Plugin Distribution (Single Plugin) ✓ RECOMMENDED**
- Use case: One-off plugin or plugin for specific use case
- Flow: User directly adds plugin (`/plugin add <plugin-url>`)
- Install syntax: `/plugin install plugin-name`
- Benefits: Simpler for end users, fewer steps, no marketplace overhead
- Trade-off: Doesn't scale if you add more plugins later (convert to Option A if needed)
- Files needed: `plugin.json`, `hooks.json`, no marketplace.json needed

**Decision Rule:** 
- **Single plugin shipping:** Use Option B (direct) — simpler, clearer UX
- **Multiple plugins planned:** Set up Option A (marketplace) — scalable long-term
- **Review point:** If adding 2nd plugin later, migrate to dedicated marketplace

### 2. Naming Conventions

The naming format `plugin-name@marketplace-name` can create confusion if both are identical:

**Avoid:** `auto-agent@auto-agent` — repetitive and unclear

**If Using Marketplace (Option A):**
1. **Owner-based marketplace:** `plugin-name@owner-name` (e.g., `auto-agent@konradschewe`)
   - Makes it clear who owns/maintains it
   - Allows multiple plugins under same marketplace
   - Standard pattern in many package managers (npm, PyPI)

**If Using Direct Distribution (Option B - Recommended):**
- Just `plugin-name` (no @namespace needed)
- Clearest for single plugins
- Standard format for direct installations

### 3. Installation & Setup Cleanup

**Old Approach (marketplace-based):**
- `install.sh` with symlinking and npm install
- `marketplace.json` required
- Users follow: add marketplace → install plugin → reload
- More moving parts

**New Approach (direct distribution - recommended):**
- Users follow: add plugin → install plugin → reload
- `npm install` happens automatically during `/plugin install`
- `install.sh` not needed (can be deleted)
- `marketplace.json` not needed (can be deleted or kept but unused)
- README focuses on single 3-step flow instead of marketplace complexity

### 4. Environment Variable Handling

**Standard Pattern (Preferred):**
- Plugins inherit environment variables from Claude Code's parent shell
- If user has `ANTHROPIC_API_KEY` set in their shell (which they need for Claude Code anyway), it's automatically available in hooks
- No custom `.env` file needed for typical installations
- **Implementation:** Just reference `$ANTHROPIC_API_KEY` directly in hook scripts

**Custom `.env` Pattern (Fallback Only):**
- Use `~/.claude/<plugin-name>.env` for special cases (custom proxies, development, non-standard setups)
- NOT the standard path — most users won't have this
- Document as optional advanced configuration only

**Documentation Pattern:**
1. "Works out of the box if you have ANTHROPIC_API_KEY in your shell"
2. For special cases: "Optionally create ~/.claude/<plugin-name>.env for custom settings"
3. Remove `.env` from repo (it's for developers only)

### 5. Plugin Installation Flow Documentation

**For Direct Distribution (Recommended):**
```
1. Add plugin:      /plugin add <github-url>
2. Install plugin:  /plugin install plugin-name
3. Reload Claude Code (Cmd+K → Reload)
4. Ready to use     (ANTHROPIC_API_KEY inherited from environment)
```

**For Marketplace Distribution (if multi-plugin planned):**
```
1. Add marketplace: /plugin add <marketplace-url>
2. View plugins:    /plugin discover
3. Install plugin:  /plugin install plugin-name@marketplace-name
4. Reload Claude Code
5. Ready to use
```

### 6. README Documentation Structure for Direct Distribution

When documenting a plugin for direct distribution:

1. **Quick description** - What it does in 1-2 sentences
2. **Installation** - Step-by-step flow (see patterns above)
3. **How it works** - Architecture, what happens behind the scenes
4. **Troubleshooting** - Common issues and solutions
5. **Development** - For contributors (optional)

Key: Installation should be prominent, concise, 3-4 steps maximum.

## Implementation Checklist for Single-Plugin Release

- [ ] Decide: Direct distribution (Option B) or Marketplace (Option A)?
- [ ] If Option B (direct): Delete `install.sh` and can ignore `marketplace.json`
- [ ] Verify `.claude-plugin/plugin.json` has all required fields
- [ ] Verify `hooks/hooks.json` has correct structure (relative paths, no extra nesting)
- [ ] Remove redundant hook entries from `settings.json`
- [ ] Remove custom `.env` requirement from documentation
- [ ] Update README with 3-step installation flow
- [ ] Test plugin installation via `/plugin install plugin-name`
- [ ] Verify environment variables inherit correctly (test `ANTHROPIC_API_KEY` access in hook)

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Creating marketplace for single plugin | Use direct distribution instead; simpler for users |
| Identical plugin and marketplace names | Use owner-based naming or skip marketplace entirely (direct dist) |
| Assuming custom `.env` needed | Standard pattern: inherit ANTHROPIC_API_KEY from environment |
| Keeping `install.sh` after moving to `/plugin install` | Delete it; it's obsolete with plugin system |
| Keeping `marketplace.json` for single plugin | Delete it; only needed for multi-plugin marketplaces |
| Duplicate hook registration (hooks.json + settings.json) | Use only hooks.json; settings.json entry is redundant |
| Documenting too many installation steps | Stick to: add → install → reload (3 steps) |

## Decision Flowchart

```
Q: Shipping multiple plugins or just one?
├─ MULTIPLE → Use marketplace (Option A)
│            Create marketplace.json
│            Use owner-based naming: plugin@owner
│            Keep install.sh if helpful for dev
│
├─ SINGLE → Use direct distribution (Option B) ✓ RECOMMENDED
│          Delete/skip marketplace.json
│          Delete install.sh
│          Simple naming: just plugin-name
│          Simple 3-step README flow

Q: Plugin needs special credentials beyond ANTHROPIC_API_KEY?
├─ YES → Document custom ~/.claude/<plugin-name>.env as optional
├─ NO → Just inherit from environment (standard)

Q: Ready to distribute?
├─ YES → Remove dev-only files from repo
│        Update README with installation flow
│        Test via `/plugin install`
│        Make GitHub public/ready
```

## Resources

- Claude Code Plugin Documentation: https://code.claude.com/docs/en/plugins
- Hook Configuration: https://code.claude.com/docs/en/hooks
- Plugin Discovery: https://code.claude.com/docs/en/discover-plugins
- Plugin Installation: https://code.claude.com/docs/en/discover-plugins (installation flow docs)