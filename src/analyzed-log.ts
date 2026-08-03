import { existsSync, readFileSync, writeFileSync } from "fs";

export function getLastTurns(analyzedLog: string, sessionId: string): number {
  if (!existsSync(analyzedLog)) {
    writeFileSync(analyzedLog, "");
    return 0;
  }
  const match = readFileSync(analyzedLog, "utf8")
    .split("\n")
    .filter(l => l.startsWith(`${sessionId} `))
    .at(-1);
  return match ? parseInt(match.split(" ")[1] ?? "0", 10) : 0;
}

export function markAnalyzed(analyzedLog: string, sessionId: string, turnCount: number): void {
  const existing = existsSync(analyzedLog) ? readFileSync(analyzedLog, "utf8") : "";
  const filtered = existing
    .split("\n")
    .filter(l => !l.startsWith(`${sessionId} `))
    .join("\n")
    .trimEnd();
  writeFileSync(analyzedLog, filtered ? `${filtered}\n${sessionId} ${turnCount}\n` : `${sessionId} ${turnCount}\n`);
}
