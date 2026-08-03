import { tool } from "ai";
import { z } from "zod";
import { readFileSync } from "fs";

export function readTranscriptTool(transcriptPath: string, fromTurn = 0) {
  return tool({
    description: "Read and summarize the session transcript. Returns all turns with new turns marked [NEW].",
    parameters: z.object({}),
    execute: async () => {
      const raw = readFileSync(transcriptPath, "utf-8");
      const turns: Array<{ role: string; content: unknown }> = [];
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const entry = JSON.parse(trimmed);
          // Transcript format: { type: "user"|"assistant", message: { role, content } }
          if (entry.message?.role && entry.message?.content !== undefined) {
            turns.push({ role: entry.message.role, content: entry.message.content });
          }
        } catch {}
      }

      if (turns.length === 0) {
        return { tooShort: true, turnCount: 0 };
      }

      const newTurnCount = Math.max(0, turns.length - fromTurn);
      if (newTurnCount === 0) {
        return { tooShort: true, turnCount: turns.length, newTurnCount: 0 };
      }

      const lines: string[] = [];
      for (let i = fromTurn; i < turns.length; i++) {
        const turn = turns[i];
        const role = turn.role;
        const content = turn.content;

        if (typeof content === "string") {
          lines.push(`[${role}] ${content.slice(0, 300)}`);
        } else if (Array.isArray(content)) {
          const parts: string[] = [];
          for (const block of content) {
            if (typeof block !== "object" || block === null) continue;
            const b = block as Record<string, unknown>;
            if (b.type === "text") {
              parts.push(String(b.text ?? "").slice(0, 200));
            } else if (b.type === "tool_use") {
              const input = (b.input as Record<string, unknown>) ?? {};
              const cmd = input.command ?? input.file_path ?? JSON.stringify(input).slice(0, 80);
              parts.push(`[tool:${b.name}] ${cmd}`);
            } else if (b.type === "tool_result") {
              const rc = b.content;
              const text = Array.isArray(rc)
                ? rc.map((x: unknown) => (x as Record<string, unknown>)?.text ?? "").join(" ")
                : String(rc ?? "");
              parts.push(`[result] ${text.slice(0, 150)}`);
            }
          }
          lines.push(`[${role}] ${parts.join(" | ")}`);
        }
      }

      return { turnCount: turns.length, newTurnCount, fromTurn, summary: lines.join("\n") };
    },
  });
}
