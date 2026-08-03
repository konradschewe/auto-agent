export function formatSummary(
  writtenSkills: Array<{ name: string; scope: string }>,
  agentText: string | undefined
): string {
  const parts: string[] = [];

  if (writtenSkills.length > 0) {
    parts.push(`wrote skills: ${writtenSkills.map(s => `${s.name} (${s.scope})`).join(", ")}`);
  }

  const summary = agentText?.trim() ?? "";
  if (summary && summary.length <= 120 && !summary.includes("\n")) {
    parts.push(summary);
  } else if (writtenSkills.length === 0) {
    parts.push("no new patterns found");
  }

  return parts.join(" — ");
}
