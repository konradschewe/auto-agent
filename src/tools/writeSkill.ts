import { tool } from "ai";
import { z } from "zod";
import { writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import type { SkillsDirs } from "../types.js";

export function writeSkillTool(skillsDirs: SkillsDirs) {
  return tool({
    description:
      "Write a skill directory with SKILL.md, optional scripts/ and resources/. Creates new or overwrites existing.",
    parameters: z.object({
      name: z.string().describe("kebab-case skill name"),
      scope: z.enum(["project", "user"]).describe(
        "Where to write the skill: 'project' for project-specific patterns, 'user' for general reusable patterns"
      ),
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
    execute: async ({ name, scope, skillMd, scripts, resources }) => {
      const dir = scope === "project" ? skillsDirs.project : skillsDirs.user;
      if (!dir) return { error: `Scope '${scope}' is not configured` };

      const skillDir = join(dir, name);
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), skillMd, "utf-8");

      if (scripts) {
        const scriptsDir = join(skillDir, "scripts");
        mkdirSync(scriptsDir, { recursive: true });
        for (const [filename, content] of Object.entries(scripts)) {
          const p = join(scriptsDir, filename);
          writeFileSync(p, content, "utf-8");
          chmodSync(p, 0o755);
        }
      }

      if (resources) {
        const resourcesDir = join(skillDir, "resources");
        mkdirSync(resourcesDir, { recursive: true });
        for (const [filename, content] of Object.entries(resources)) {
          writeFileSync(join(resourcesDir, filename), content, "utf-8");
        }
      }

      return { written: skillDir, scope };
    },
  });
}
