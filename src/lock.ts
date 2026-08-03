import { mkdirSync, rmSync } from "fs";

export function acquireLock(lockDir: string): boolean {
  try {
    mkdirSync(lockDir, { recursive: false });
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(lockDir: string): void {
  try {
    rmSync(lockDir, { recursive: true });
  } catch {}
}

export function registerLockCleanup(lockDir: string): void {
  const cleanup = () => releaseLock(lockDir);
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(1); });
  process.on("SIGTERM", () => { cleanup(); process.exit(1); });
}
