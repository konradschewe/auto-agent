import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { SkillsDirs } from "./types.js";

export function resolveSkillsDirs(scope: string, cwd: string): SkillsDirs {
  const project =
    (scope === "both" || scope === "project") && cwd && existsSync(join(cwd, ".claude"))
      ? join(cwd, ".claude", "skills")
      : undefined;

  const user =
    scope === "both" || scope === "user" ? join(homedir(), ".claude", "skills") : undefined;

  if (project) mkdirSync(project, { recursive: true });
  if (user) mkdirSync(user, { recursive: true });

  return { project, user };
}
