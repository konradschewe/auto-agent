import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { readTranscriptTool } from "./tools/readTranscript.js";
import { listSkillsTool } from "./tools/listSkills.js";
import { readSkillTool } from "./tools/readSkill.js";
import { writeSkillTool } from "./tools/writeSkill.js";
import { deleteSkillTool } from "./tools/deleteSkill.js";
import { systemPrompt } from "./prompt.js";
import type { RunOptions } from "./types.js";

export async function runAgent({ transcriptPath, skillsDirs, fromTurn = 0 }: RunOptions) {
  const rawBaseURL = process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, "");
  const baseURL = rawBaseURL ? `${rawBaseURL}/v1` : undefined;
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN,
    baseURL,
  });

  const model = process.env.MODEL || "claude-haiku-4-5-20251001";

  const writtenSkills: Array<{ name: string; scope: string }> = [];
  const deletedSkills: Array<{ name: string; scope: string }> = [];
  const baseWriteSkill = writeSkillTool(skillsDirs);
  const baseDeleteSkill = deleteSkillTool(skillsDirs);

  const trackedWriteSkill = {
    ...baseWriteSkill,
    execute: async (...args: Parameters<typeof baseWriteSkill.execute>) => {
      const result = await baseWriteSkill.execute(...args);
      if (!("error" in result)) {
        writtenSkills.push({ name: args[0].name, scope: args[0].scope });
      }
      return result;
    },
  };

  const trackedDeleteSkill = {
    ...baseDeleteSkill,
    execute: async (...args: Parameters<typeof baseDeleteSkill.execute>) => {
      const result = await baseDeleteSkill.execute(...args);
      if (!("error" in result)) {
        deletedSkills.push({ name: args[0].name, scope: args[0].scope });
      }
      return result;
    },
  };

  const { text, steps } = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    prompt: "Analyze the current session and create, update, or delete skills as appropriate.",
    tools: {
      read_transcript: readTranscriptTool(transcriptPath, fromTurn),
      list_skills: listSkillsTool(skillsDirs),
      read_skill: readSkillTool(skillsDirs),
      write_skill: trackedWriteSkill,
      delete_skill: trackedDeleteSkill,
    },
    maxSteps: 20,
  });

  return { text, stepCount: steps.length, writtenSkills, deletedSkills };
}
