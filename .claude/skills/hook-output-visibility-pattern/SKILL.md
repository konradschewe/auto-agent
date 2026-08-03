---
name: hook-output-visibility-pattern
description: Pattern for displaying hook execution results and reasoning in Claude Code chat via decision blocking, avoiding live streaming limitations
---

## Overview

When long-running hooks (like background agents) execute in Claude Code, there's no native way to stream output to the chat. This skill captures the pattern for making hook results visible by having the hook emit a **decision block** with a reason message that triggers a new chat turn.

## Problem

- Claude Code hooks run silently in the background
- Long-running hooks (like `npx tsx agent.ts`) produce output only at completion
- `systemMessage` in hook JSON output doesn't work (only used for task context, not chat display)
- Users get no feedback about what the hook did

## Solution: Decision Block with Reason

The pattern uses Claude Code's `decision: "block"` mechanism to force a chat turn after the hook completes:

1. **Agent returns structured output** with a reason string listing what was done
2. **Hook script parses this output** and extracts the reason
3. **Hook emits JSON decision block** with `decision: "block"` and the reason
4. **Claude Code displays the reason** as a new chat turn automatically

## Implementation Steps

### 1. Agent Code Modification

Your agent should return a structured output with a summary of actions:

```typescript
interface AgentResult {
  text: string;  // Summary/reasoning from agent's analysis
  writtenSkills: Array<{ name: string; scope: 'project' | 'user' }>;
}

// At end of agent execution:
const reason = writtenSkills.length > 0 
  ? `created skills: ${writtenSkills.map(s => `${s.name} (${s.scope})`).join(', ')} — ${text}`
  : `no changes: ${text}`;

console.log(`AGENT_REASON:${reason}`);
```

**Key points:**
- Agent analyzes transcript and either creates skills or explains why not
- Always produce a reason (either what was created or why nothing changed)
- Output in structured format (e.g., `AGENT_REASON:...`) for easy parsing

### 2. Hook Script Parsing

The hook script (e.g., `stop.sh`) must:
1. Run the long-running agent command
2. Capture its output
3. Extract the reason marker (e.g., `AGENT_REASON:`)
4. Emit JSON decision block

Example pattern:

```bash
#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$HOME/.claude/auto-agent.log"

# Run the agent and capture output
OUTPUT=$(npx tsx "$PLUGIN_DIR/src/index.ts" 2>&1)
echo "$OUTPUT" >> "$LOG"

# Extract reason (everything after AGENT_REASON: marker)
REASON=$(echo "$OUTPUT" | grep -oP 'AGENT_REASON:\K.*' | tail -1)

if [ -z "$REASON" ]; then
  REASON="completed (no output captured)"
fi

# Emit JSON decision block with reason
# Use Python to properly escape JSON strings
REASON_JSON=$(python3 -c "import json; print(json.dumps('$REASON'))")

# Output the decision block JSON to stdout
cat <<EOF
{
  "decision": "block",
  "reason": $REASON_JSON
}
EOF
```

**Key technique:**
- Use `python3 -c "import json; print(json.dumps('...'))"` to safely escape the reason string
- Avoids manual quoting and handles special characters, newlines, etc.

### 3. Agent Output Structure

Your agent index file should:
1. Capture the return value from `runAgent()`
2. Extract text and written skills
3. Format the reason
4. Output `AGENT_REASON:` marker

```typescript
const result = await runAgent({ ... });

const reasonText = result.writtenSkills.length > 0
  ? `wrote skills: ${result.writtenSkills.map(s => `${s.name} (${s.scope})`).join(', ')} — ${result.text}`
  : result.text;

console.log(`AGENT_REASON:${reasonText}`);
```

## Result in Claude Code

When the hook exits:
1. Claude Code receives the JSON decision block with `decision: "block"`
2. Claude Code creates a new chat turn automatically
3. The `reason` field content appears as a visible message
4. User sees exactly what the hook did (or why it didn't do anything)

Example output in chat:
```
wrote skills: fix-hook-path-resolution (user), update-config (project) — Analyzed session and identified reusable patterns
```

Or if no changes:
```
no changes: Session was exploratory troubleshooting without extractable patterns
```

## Benefits

- **Token efficient:** No complex message body, just a reason string (2-3 sentences)
- **Always visible:** Whether skills were created or not, user gets feedback
- **No custom UI needed:** Uses native Claude Code decision blocking
- **Proper attribution:** Agent explains its reasoning, not just listing outputs

## Related Patterns

- `debug-plugin-hooks` - Logging infrastructure for hooks
- `fix-hook-path-resolution` - Path handling in hook commands
- `plugin-distribution-strategy` - Hook configuration in plugin.json

## TypeScript Implementation Example

```typescript
// In agent.ts
export async function runAgent(...): Promise<AgentResult> {
  // ... analysis loop ...
  return {
    text: "explanation of what was analyzed and why",
    writtenSkills: [...skills created...]
  };
}

// In index.ts
const result = await runAgent({ ... });
const skillsDesc = result.writtenSkills
  .map(s => `${s.name} (${s.scope})`)
  .join(', ');

const reason = result.writtenSkills.length > 0
  ? `wrote skills: ${skillsDesc} — ${result.text}`
  : `no changes: ${result.text}`;

console.log(`AGENT_REASON:${reason}`);
```

## Key Insight

Claude Code's decision blocking mechanism is designed for blocking execution, but as a side effect it displays a message in chat. By leveraging this, you get free feedback from long-running hooks without implementing custom UI or dealing with streaming complexity. The trade-off: hook must run to completion before result appears (but this is acceptable for background agents that naturally complete).
