import { tool } from "ai";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export function readSkillTool(skillsDir: string) {
  return tool({
    description: "Read the SKILL.md content of an existing skill.",
    parameters: z.object({ name: z.string().describe("Skill directory name") }),
    execute: async ({ name }) => {
      const skillMdPath = join(skillsDir, name, "SKILL.md");
      if (!existsSync(skillMdPath)) return { error: `Skill '${name}' not found` };
      return { content: readFileSync(skillMdPath, "utf-8") };
    },
  });
}
