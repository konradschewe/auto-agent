import { tool } from "ai";
import { z } from "zod";
import { readdirSync, existsSync } from "fs";

export function listSkillsTool(skillsDir: string) {
  return tool({
    description: "List all currently active skills.",
    parameters: z.object({}),
    execute: async () => {
      if (!existsSync(skillsDir)) return { skills: [] };
      const entries = readdirSync(skillsDir, { withFileTypes: true });
      const skills = entries
        .filter((e: import("fs").Dirent) => e.isDirectory() && !e.name.startsWith("."))
        .map((e: import("fs").Dirent) => e.name);
      return { skills };
    },
  });
}
