import { tool } from "ai";
import { z } from "zod";
import { readdirSync, existsSync } from "fs";

interface SkillsDirs {
  project?: string;
  user?: string;
}

export function listSkillsTool(skillsDirs: SkillsDirs) {
  return tool({
    description: "List all currently active skills, showing their scope (project or user).",
    parameters: z.object({}),
    execute: async () => {
      const skills: Array<{ name: string; scope: "project" | "user" }> = [];
      for (const [scope, dir] of [["project", skillsDirs.project], ["user", skillsDirs.user]] as const) {
        if (!dir || !existsSync(dir)) continue;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && !e.name.startsWith(".")) {
            skills.push({ name: e.name, scope });
          }
        }
      }
      return { skills };
    },
  });
}
