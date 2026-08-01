import { tool } from "ai";
import { z } from "zod";
import { writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";

export function writeSkillTool(skillsDir: string) {
  return tool({
    description:
      "Write a skill directory with SKILL.md, optional scripts/ and resources/. Creates new or overwrites existing.",
    parameters: z.object({
      name: z.string().describe("kebab-case skill name"),
      skillMd: z.string().describe("Full SKILL.md content including YAML frontmatter"),
      scripts: z
        .record(z.string())
        .optional()
        .describe("Map of filename to script content (e.g. { 'run.sh': '#!/bin/bash\\n...' })"),
      resources: z
        .record(z.string())
        .optional()
        .describe("Map of filename to resource content (e.g. { 'context.md': '# Context\\n...' })"),
    }),
    execute: async ({ name, skillMd, scripts, resources }) => {
      const dir = join(skillsDir, name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "SKILL.md"), skillMd, "utf-8");

      if (scripts) {
        const scriptsDir = join(dir, "scripts");
        mkdirSync(scriptsDir, { recursive: true });
        for (const [filename, content] of Object.entries(scripts)) {
          const p = join(scriptsDir, filename);
          writeFileSync(p, content, "utf-8");
          chmodSync(p, 0o755);
        }
      }

      if (resources) {
        const resourcesDir = join(dir, "resources");
        mkdirSync(resourcesDir, { recursive: true });
        for (const [filename, content] of Object.entries(resources)) {
          writeFileSync(join(resourcesDir, filename), content, "utf-8");
        }
      }

      return { written: dir };
    },
  });
}
