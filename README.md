# auto-skill

A Claude Code plugin that observes your sessions and automatically generates reusable skills from detected patterns.

## What it does

After each Claude Code session ends, a `Stop` hook analyzes the session transcript and looks for:

- **Tool chains** — repeated sequences of Bash/Edit/Write/Read calls for a specific sub-task
- **Explained concepts** — domain knowledge you had to explain to Claude (conventions, project structure, business rules)
- **Repeated workflows** — multi-step processes you initiated more than once

Detected patterns are written as skills into `.claude/skills/` (project-local) or `~/.claude/skills/` (global). Claude Code picks them up automatically in the next session.

## Installation

### 1. Add the marketplace

```shell
/plugin marketplace add konradschewe/auto-agent
```

### 2. Install the plugin

```shell
/plugin install auto-skill@auto-agent
```

Choose your scope when prompted:
- **Project** — shared with all collaborators (written to `.claude/settings.json`)
- **User** — available across all your projects
- **Local** — only for you in this project, not committed

### 3. Activate

```shell
/reload-plugins
```

## Requirements

- Node.js 18+
- An Anthropic API key (or compatible proxy)

The plugin reads credentials from the environment. If `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` is already set in your shell or in `~/.claude/settings.json` (which is the case if you're using Claude Code), nothing extra is needed.

To use a custom proxy, set `ANTHROPIC_BASE_URL` in your shell or in `~/.claude/settings.json`:

```json
"env": {
  "ANTHROPIC_BASE_URL": "https://your-proxy.example.com/anthropic",
  "MODEL": "claude-haiku-4-5-20251001"
}
```

The plugin appends `/v1` to `ANTHROPIC_BASE_URL` internally, so the URL should not include it — consistent with how Claude Code itself uses the variable.

## Configuration

### Skill scope

By default the plugin writes to both project-local (`.claude/skills/`) and user-global (`~/.claude/skills/`) locations, and the agent decides per skill which is more appropriate.

You can restrict this when installing:

```shell
claude plugin install auto-skill@auto-agent --config scope=project
```

Or change it afterwards via `/plugin` → Installed → auto-skill → Configure:

| Value | Behavior |
|---|---|
| `both` (default) | Agent decides per skill — project-specific patterns go local, general ones go global |
| `project` | Only writes to `.claude/skills/` in the current project |
| `user` | Only writes to `~/.claude/skills/` globally |

## Debugging

The hook logs everything to `~/.claude/auto-agent.log`. Watch it in real time:

```bash
tail -f ~/.claude/auto-agent.log
```

Log entries include why a session was skipped (already analyzed, transcript not found), when the agent starts, and whether it succeeded or failed.

## Architecture

```
.claude-plugin/
├── plugin.json          # Plugin manifest
└── marketplace.json     # Marketplace catalog (this repo is its own marketplace)

hooks/
└── hooks.json           # Registers the Stop hook (auto-loaded by Claude Code)

src/
├── tools/
│   ├── readTranscript.ts  # Parses JSONL transcript into a summary
│   ├── listSkills.ts      # Lists existing skill directories
│   ├── readSkill.ts       # Reads a skill's SKILL.md
│   └── writeSkill.ts      # Writes skill dir with SKILL.md
├── prompt.ts              # System prompt for the analysis agent
├── agent.ts               # Vercel AI SDK generateText loop (max 20 steps)
├── hook.ts                # Stop hook entry point (reads stdin, manages lock/state, runs agent)
└── index.ts               # CLI entry point (for local development)
```

The hook reads session JSON from stdin (provided by Claude Code), acquires a per-session lock to prevent duplicate runs, then invokes the agent. The agent reads the session transcript, compares against existing skills, and creates or updates skills as appropriate.
