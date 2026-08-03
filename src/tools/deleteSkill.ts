import { tool } from "ai";
import { z } from "zod";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import type { SkillsDirs } from "../types.js";

export function deleteSkillTool(skillsDirs: SkillsDirs) {
  return tool({
    description:
      "Permanently delete a skill directory. Use when a skill is outdated, superseded, or incorrect. Prefer update_skill if the name is still useful.",
    parameters: z.object({
      name: z.string().describe("kebab-case skill name to delete"),
      scope: z.enum(["project", "user"]).describe("Scope to delete from"),
      reason: z.string().describe("Why this skill is being deleted"),
    }),
    execute: async ({ name, scope, reason }) => {
      const dir = scope === "project" ? skillsDirs.project : skillsDirs.user;
      if (!dir) return { error: `Scope '${scope}' is not configured` };

      const skillDir = join(dir, name);
      if (!existsSync(skillDir)) return { error: `Skill '${name}' not found in ${scope} scope` };

      rmSync(skillDir, { recursive: true, force: true });
      return { deleted: skillDir, scope, reason };
    },
  });
}
