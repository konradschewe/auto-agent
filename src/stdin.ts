import { readFileSync } from "fs";

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export function parseHookInput(raw: string) {
  try {
    const d = JSON.parse(raw);
    return {
      transcriptPath: (d.transcript_path as string) ?? "",
      sessionId: (d.session_id as string) ?? "",
      cwd: (d.cwd as string) ?? "",
    };
  } catch {
    return { transcriptPath: "", sessionId: "", cwd: "" };
  }
}

export function countTurns(transcriptPath: string): number {
  try {
    return readFileSync(transcriptPath, "utf8").split("\n").reduce((n, line) => {
      try { return JSON.parse(line)?.message?.role ? n + 1 : n; } catch { return n; }
    }, 0);
  } catch {
    return 0;
  }
}
