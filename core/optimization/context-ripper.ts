import type { SquadMessage, SquadState } from "../types";

export const HOT_MESSAGE_LIMIT = 8;
export const KEEP_RECENT = 4;
const RESUMO_CAP = 4000;

export interface FoldResult {
  state: SquadState;
  messages: SquadMessage[];
  summary: string | null;
}

export function foldHotMessages(state: SquadState, messages: SquadMessage[]): FoldResult {
  if (messages.length <= HOT_MESSAGE_LIMIT) {
    return { state, messages, summary: null };
  }
  const archived = messages.slice(0, messages.length - KEEP_RECENT);
  const kept = messages.slice(messages.length - KEEP_RECENT);
  const summary = archived
    .map((message) => `${message.authorName}: ${message.text.replace(/\s+/g, " ").slice(0, 180)}`)
    .join(" | ");
  const combined = [state.resumo, summary].filter((part): part is string => Boolean(part)).join("\n");
  const resumo = combined.length > RESUMO_CAP ? combined.slice(combined.length - RESUMO_CAP) : combined;
  return {
    state: { ...state, resumo },
    messages: kept,
    summary,
  };
}
