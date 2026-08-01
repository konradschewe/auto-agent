import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { readTranscriptTool } from "./tools/readTranscript.js";
import { listSkillsTool } from "./tools/listSkills.js";
import { readSkillTool } from "./tools/readSkill.js";
import { writeSkillTool } from "./tools/writeSkill.js";
import { systemPrompt } from "./prompt.js";

interface RunOptions {
  transcriptPath: string;
  skillsDir: string;
  sessionId: string;
}

export async function runAgent({ transcriptPath, skillsDir }: RunOptions) {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  });

  const model = process.env.MODEL || "claude-haiku-4-5-20251001";

  const { text, steps } = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    prompt: "Analyze the current session and create or update skills as appropriate.",
    tools: {
      read_transcript: readTranscriptTool(transcriptPath),
      list_skills: listSkillsTool(skillsDir),
      read_skill: readSkillTool(skillsDir),
      write_skill: writeSkillTool(skillsDir),
    },
    maxSteps: 20,
  });

  return { text, stepCount: steps.length };
}
