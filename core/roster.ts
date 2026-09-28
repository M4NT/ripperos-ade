export const DEFAULT_TENANT = "default";

export function parseMentions(text: string, roster: { id: string; name: string }[]): string[] {
  const hits: string[] = [];
  const ordered = [...roster].sort((left, right) => right.name.length - left.name.length);
  for (const entry of ordered) {
    const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`@${escaped}\\b`, "i").test(text)) hits.push(entry.id);
  }
  return hits;
}
