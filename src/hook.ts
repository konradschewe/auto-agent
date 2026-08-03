#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { runAgent } from "./agent.js";

const LOG = join(homedir(), ".claude", "auto-agent.log");

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  appendFileSync(LOG, `[${ts}] ${msg}\n`);
}

function parseInput(raw: string) {
  try {
    const d = JSON.parse(raw);
    return {
      transcriptPath: (d.transcript_path as string) ?? "",
      sessionId: (d.session_id as string) ?? "",
      cwd: (d.cwd as string) ?? "",
    };
  } catch {
    return { transcriptPath: "", sessionId: "", cwd: "" };
  }
}

function acquireLock(lockDir: string): boolean {
  try {
    mkdirSync(lockDir, { recursive: false });
    return true;
  } catch {
    return false;
  }
}

function countTurns(transcriptPath: string): number {
  try {
    const lines = readFileSync(transcriptPath, "utf8").split("\n");
    return lines.reduce((n, line) => {
      try {
        const e = JSON.parse(line);
        return e?.message?.role ? n + 1 : n;
      } catch {
        return n;
      }
    }, 0);
  } catch {
    return 0;
  }
}

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const raw = Buffer.concat(chunks).toString("utf8");
const { transcriptPath, sessionId, cwd } = parseInput(raw);

log(`triggered — session=${sessionId} cwd=${cwd}`);

if (!transcriptPath || !existsSync(transcriptPath)) {
  log(`skip: transcript not found (${transcriptPath})`);
  process.exit(0);
}

const scope = process.env.CLAUDE_PLUGIN_OPTION_SCOPE ?? process.env.AUTO_SKILL_SCOPE ?? "both";

const projectSkillsDir =
  (scope === "both" || scope === "project") && cwd && existsSync(join(cwd, ".claude"))
    ? join(cwd, ".claude", "skills")
    : "";

const userSkillsDir =
  scope === "both" || scope === "user" ? join(homedir(), ".claude", "skills") : "";

if (!projectSkillsDir && !userSkillsDir) {
  log(`skip: no skills directories available (scope=${scope}, cwd=${cwd})`);
  process.exit(0);
}

if (projectSkillsDir) mkdirSync(projectSkillsDir, { recursive: true });
if (userSkillsDir) mkdirSync(userSkillsDir, { recursive: true });

const turnCount = countTurns(transcriptPath);

const pluginData = process.env.CLAUDE_PLUGIN_DATA ?? join(homedir(), ".claude");
const lockDir = join(pluginData, `.auto-skill-lock-${sessionId}-${turnCount}`);

if (!acquireLock(lockDir)) {
  log("skip: another instance already running for this session/turn");
  process.exit(0);
}

const releaseLock = () => {
  try {
    import("fs").then(({ rmdirSync }) => rmdirSync(lockDir));
  } catch {}
};
process.on("exit", releaseLock);
process.on("SIGINT", () => { releaseLock(); process.exit(1); });
process.on("SIGTERM", () => { releaseLock(); process.exit(1); });

const analyzedLog = join(pluginData, ".auto-skill-analyzed");
if (!existsSync(analyzedLog)) writeFileSync(analyzedLog, "");

const lastTurns = (() => {
  const lines = readFileSync(analyzedLog, "utf8").split("\n");
  const match = lines.filter(l => l.startsWith(`${sessionId} `)).at(-1);
  return match ? parseInt(match.split(" ")[1] ?? "0", 10) : 0;
})();

log(
  `starting agent — turns=${turnCount} last-analyzed=${lastTurns} scope=${scope} ` +
  `project-skills=${projectSkillsDir || "none"} user-skills=${userSkillsDir || "none"}`
);

const skillsDirs = {
  project: projectSkillsDir || undefined,
  user: userSkillsDir || undefined,
};

try {
  const { text, stepCount, writtenSkills } = await runAgent({
    transcriptPath,
    skillsDirs,
    sessionId,
    fromTurn: lastTurns,
  });

  log("agent finished");

  const content = readFileSync(analyzedLog, "utf8")
    .split("\n")
    .filter(l => !l.startsWith(`${sessionId} `))
    .join("\n")
    .trimEnd();
  writeFileSync(analyzedLog, content ? content + "\n" + `${sessionId} ${turnCount}\n` : `${sessionId} ${turnCount}\n`);

  const parts: string[] = [];
  if (writtenSkills.length > 0) {
    parts.push(`wrote skills: ${writtenSkills.map(s => `${s.name} (${s.scope})`).join(", ")}`);
  }
  const summary = text?.trim() ?? "";
  if (summary && summary.length <= 120 && !summary.includes("\n")) {
    parts.push(summary);
  } else if (writtenSkills.length === 0) {
    parts.push("no new patterns found");
  }

  const reason = parts.join(" — ");
  if (reason) {
    const out = JSON.stringify({ systemMessage: `auto-agent: ${reason}` });
    process.stdout.write(out + "\n");
  }
} catch (err) {
  log(`agent failed: ${err}`);
  process.exit(1);
}
