import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { readTranscriptTool } from "./tools/readTranscript.js";
import { listSkillsTool } from "./tools/listSkills.js";
import { readSkillTool } from "./tools/readSkill.js";
import { writeSkillTool } from "./tools/writeSkill.js";
import { systemPrompt } from "./prompt.js";

interface SkillsDirs {
  project?: string;
  user?: string;
}

interface RunOptions {
  transcriptPath: string;
  skillsDirs: SkillsDirs;
  sessionId: string;
  fromTurn?: number;
}

export async function runAgent({ transcriptPath, skillsDirs, fromTurn = 0 }: RunOptions) {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  });

  const model = process.env.MODEL || "claude-haiku-4-5-20251001";

  const writtenSkills: Array<{ name: string; scope: string }> = [];
  const baseWriteSkill = writeSkillTool(skillsDirs);

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

  const { text, steps } = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    prompt: "Analyze the current session and create or update skills as appropriate.",
    tools: {
      read_transcript: readTranscriptTool(transcriptPath, fromTurn),
      list_skills: listSkillsTool(skillsDirs),
      read_skill: readSkillTool(skillsDirs),
      write_skill: trackedWriteSkill,
    },
    maxSteps: 20,
  });

  return { text, stepCount: steps.length, writtenSkills };
}
