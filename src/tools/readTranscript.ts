import { tool } from "ai";
import { z } from "zod";
import { readFileSync } from "fs";

export function readTranscriptTool(transcriptPath: string) {
  return tool({
    description: "Read and summarize the session transcript. Returns a compact summary of all turns.",
    parameters: z.object({}),
    execute: async () => {
      const raw = readFileSync(transcriptPath, "utf-8");
      const turns: Array<{ role: string; content: unknown }> = [];
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          turns.push(JSON.parse(trimmed));
        } catch {}
      }

      if (turns.length < 10) {
        return { tooShort: true, turnCount: turns.length };
      }

      const lines: string[] = [];
      for (let i = 0; i < Math.min(turns.length, 100); i++) {
        const turn = turns[i];
        const role = turn.role ?? "unknown";
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

        if (i === 99 && turns.length > 100) {
          lines.push(`... (${turns.length - 100} more turns truncated)`);
        }
      }

      return { turnCount: turns.length, summary: lines.join("\n") };
    },
  });
}
