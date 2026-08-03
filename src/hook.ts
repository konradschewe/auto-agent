#!/usr/bin/env tsx
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { runAgent } from "./agent.js";
import { acquireLock, registerLockCleanup } from "./lock.js";
import { getLastTurns, markAnalyzed } from "./analyzed-log.js";
import { resolveSkillsDirs } from "./skills-dirs.js";
import { formatSummary } from "./format-summary.js";
import { log } from "./logger.js";
import { readStdin, parseHookInput, countTurns } from "./stdin.js";

const raw = await readStdin();
const { transcriptPath, sessionId, cwd } = parseHookInput(raw);

log(`triggered — session=${sessionId} cwd=${cwd}`);

if (!transcriptPath || !existsSync(transcriptPath)) {
  log(`skip: transcript not found (${transcriptPath})`);
  process.exit(0);
}

const scope = process.env.CLAUDE_PLUGIN_OPTION_SCOPE ?? process.env.AUTO_SKILL_SCOPE ?? "both";
const skillsDirs = resolveSkillsDirs(scope, cwd);

if (!skillsDirs.project && !skillsDirs.user) {
  log(`skip: no skills directories available (scope=${scope}, cwd=${cwd})`);
  process.exit(0);
}

const turnCount = countTurns(transcriptPath);
const pluginData = process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude");
const lockDir = join(pluginData, `.auto-skill-lock-${sessionId}-${turnCount}`);

if (!acquireLock(lockDir)) {
  log("skip: another instance already running for this session/turn");
  process.exit(0);
}
registerLockCleanup(lockDir);

const analyzedLog = join(pluginData, ".auto-skill-analyzed");
const lastTurns = getLastTurns(analyzedLog, sessionId);

log(
  `starting agent — turns=${turnCount} last-analyzed=${lastTurns} scope=${scope} ` +
  `project-skills=${skillsDirs.project ?? "none"} user-skills=${skillsDirs.user ?? "none"}`
);

try {
  const { text, writtenSkills } = await runAgent({
    transcriptPath,
    skillsDirs,
    sessionId,
    fromTurn: lastTurns,
  });

  log("agent finished");
  markAnalyzed(analyzedLog, sessionId, turnCount);

  const reason = formatSummary(writtenSkills, text);
  if (reason) {
    process.stdout.write(JSON.stringify({ systemMessage: `auto-agent: ${reason}` }) + "\n");
  }
} catch (err) {
  log(`agent failed: ${err}`);
  process.exit(1);
}
