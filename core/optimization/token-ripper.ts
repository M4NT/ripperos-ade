export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 4);
}

export function compactPayload(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const deduped: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+/g, " ").trim();
    if (!line) continue;
    if (deduped[deduped.length - 1] === line) continue;
    deduped.push(line);
  }
  return deduped.join("\n");
}

export function compactMessages(messages: { text: string; summarized?: boolean }[]): {
  text: string;
  dropped: number;
  tokens: number;
} {
  const active = messages.filter((message) => !message.summarized);
  const text = compactPayload(active.map((message) => message.text).join("\n"));
  return {
    text,
    dropped: messages.length - active.length,
    tokens: estimateTokens(text),
  };
}
