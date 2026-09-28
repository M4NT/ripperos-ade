export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "Sem execução";
  const delta = Date.now() - Date.parse(iso);
  const minutes = Math.max(0, Math.floor(delta / 60000));
  if (minutes < 1) return "Atualizado agora";
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Atualizado há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Atualizado há ${days} d`;
}

export type TextPart = { type: "text" | "link" | "mention"; value: string };

export function splitMessage(text: string, names: string[] = []): TextPart[] {
  const ordered = [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((left, right) => right.length - left.length);
  const mention = ordered.length > 0 ? ordered.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") : "";
  const source = mention ? `(@(?:${mention})|https?:\\/\\/[^\\s)]+)` : "(https?:\\/\\/[^\\s)]+)";
  const pattern = new RegExp(source, "gi");
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: "text", value: text.slice(cursor, index) });
    const value = match[0];
    parts.push({ type: value.startsWith("@") ? "mention" : "link", value });
    cursor = index + value.length;
  }
  if (cursor < text.length) parts.push({ type: "text", value: text.slice(cursor) });
  if (parts.length === 0) parts.push({ type: "text", value: text });
  return parts;
}
