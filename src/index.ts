#!/usr/bin/env tsx
import "dotenv/config";
import { parseArgs } from "util";
import { runAgent } from "./agent.js";

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    transcript: { type: "string" },
    "skills-dir": { type: "string" },
    "session-id": { type: "string" },
    "from-turn": { type: "string" },
  },
});

const transcriptPath = args.transcript;
const skillsDir = args["skills-dir"];
const sessionId = args["session-id"];
const fromTurn = parseInt(args["from-turn"] ?? "0", 10);

if (!transcriptPath || !skillsDir || !sessionId) {
  process.stderr.write("Usage: index.ts --transcript <path> --skills-dir <dir> --session-id <id> [--from-turn <n>]\n");
  process.exit(1);
}

const { text, stepCount } = await runAgent({ transcriptPath, skillsDir, sessionId, fromTurn });

process.stdout.write(`auto-agent: analysis complete (${stepCount} steps)\n`);
if (text) process.stdout.write(text + "\n");
