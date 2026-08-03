import { appendFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LOG = join(homedir(), ".claude", "auto-agent.log");

export function log(msg: string): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  appendFileSync(LOG, `[${ts}] ${msg}\n`);
}
