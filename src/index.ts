#!/usr/bin/env tsx
import { parseArgs } from "util";
import { runAgent } from "./agent.js";

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    transcript: { type: "string" },
    "project-skills-dir": { type: "string" },
    "user-skills-dir": { type: "string" },
    "session-id": { type: "string" },
    "from-turn": { type: "string" },
  },
});

const transcriptPath = args.transcript;
const sessionId = args["session-id"];
const fromTurn = parseInt(args["from-turn"] ?? "0", 10);
const skillsDirs = {
  project: args["project-skills-dir"],
  user: args["user-skills-dir"],
};

if (!transcriptPath || !sessionId || (!skillsDirs.project && !skillsDirs.user)) {
  process.stderr.write(
    "Usage: index.ts --transcript <path> --session-id <id> [--project-skills-dir <dir>] [--user-skills-dir <dir>] [--from-turn <n>]\n"
  );
  process.exit(1);
}

const { text, stepCount, writtenSkills } = await runAgent({ transcriptPath, skillsDirs, sessionId, fromTurn });

process.stdout.write(`auto-agent: analysis complete (${stepCount} steps)\n`);

const parts: string[] = [];
if (writtenSkills.length > 0) {
  const skillsList = writtenSkills.map(({ name, scope }) => `${name} (${scope})`).join(", ");
  parts.push(`wrote skills: ${skillsList}`);
}

// Only use agent text if it looks like a short summary (≤120 chars, no newlines)
const summary = text?.trim() ?? "";
if (summary && summary.length <= 120 && !summary.includes("\n")) {
  parts.push(summary);
} else if (writtenSkills.length === 0) {
  parts.push("no new patterns found");
}

const reason = parts.join(" — ");
if (reason) process.stdout.write(`AGENT_REASON:${reason}\n`);
