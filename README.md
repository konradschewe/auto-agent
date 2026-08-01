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

### 4. Set your API key

The plugin reads `ANTHROPIC_API_KEY` from the environment. If it's already set in your shell (which it is if you're using Claude Code), nothing else is needed.

To use a custom proxy or a different model, set these in your shell profile:

```env
ANTHROPIC_BASE_URL=https://your-proxy.example.com
MODEL=claude-haiku-4-5-20251001
```

## Requirements

- Node.js 18+
- An Anthropic API key (or compatible proxy)

## Skills output location

Skills are written to the first directory that exists:

1. `<project-cwd>/.claude/skills/` — project-local (create this to keep skills in the repo)
2. `~/.claude/skills/` — global fallback

To use project-local skills:

```bash
mkdir -p .claude/skills
```

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
├── hooks.json           # Registers the Stop hook (auto-loaded by Claude Code)
└── stop.sh              # Reads session JSON from stdin, invokes the agent

src/
├── tools/
│   ├── readTranscript.ts  # Parses JSONL transcript into a summary
│   ├── listSkills.ts      # Lists existing skill directories
│   ├── readSkill.ts       # Reads a skill's SKILL.md
│   └── writeSkill.ts      # Writes skill dir with SKILL.md
├── prompt.ts              # System prompt for the analysis agent
├── agent.ts               # Vercel AI SDK generateText loop (max 20 steps)
└── index.ts               # CLI entry point
```

The agent reads the session transcript, compares against existing skills, then creates or updates skills as appropriate.
