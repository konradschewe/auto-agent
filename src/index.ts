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
  },
});

const transcriptPath = args.transcript;
const skillsDir = args["skills-dir"];
const sessionId = args["session-id"];

if (!transcriptPath || !skillsDir || !sessionId) {
  process.stderr.write("Usage: index.ts --transcript <path> --skills-dir <dir> --session-id <id>\n");
  process.exit(1);
}

const { text, stepCount } = await runAgent({ transcriptPath, skillsDir, sessionId });

process.stdout.write(`auto-agent: analysis complete (${stepCount} steps)\n`);
if (text) process.stdout.write(text + "\n");
