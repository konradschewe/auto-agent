import { tool } from "ai";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { SkillsDirs } from "../types.js";

export function readSkillTool(skillsDirs: SkillsDirs) {
  return tool({
    description: "Read the SKILL.md content of an existing skill.",
    parameters: z.object({
      name: z.string().describe("Skill directory name"),
      scope: z.enum(["project", "user"]).describe("Which scope to read from"),
    }),
    execute: async ({ name, scope }) => {
      const dir = scope === "project" ? skillsDirs.project : skillsDirs.user;
      if (!dir) return { error: `Scope '${scope}' is not configured` };
      const skillMdPath = join(dir, name, "SKILL.md");
      if (!existsSync(skillMdPath)) return { error: `Skill '${name}' not found in ${scope} scope` };
      return { content: readFileSync(skillMdPath, "utf-8"), scope };
    },
  });
}
