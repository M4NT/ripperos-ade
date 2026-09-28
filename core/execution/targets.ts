import type { Intent } from "../types";
import { RejectedInputError } from "../squads/errors";

export function resolveTargets(intent: Intent, mentions: string[], agentIds: string[], handoffIds: string[]): string[] {
  const known = mentions.filter((id) => agentIds.includes(id));
  if (mentions.length > 0 && known.length === 0 && intent !== "kill_switch") {
    throw new RejectedInputError("Nenhum agente mencionado está neste squad.");
  }
  const blocked = known.length > 0 && known.every((id) => handoffIds.includes(id));
  if (intent === "kill_switch") return [];
  if (intent === "chat") {
    if (blocked) throw new RejectedInputError("Esse agente está em handoff. Devolva o controle no inspetor.");
    return known.filter((id) => !handoffIds.includes(id));
  }
  if (intent === "handoff") {
    const pool = known.length > 0 ? known : agentIds;
    if (pool.length === 0) throw new RejectedInputError("Não há agente para receber o handoff.");
    return pool;
  }
  if (agentIds.length === 0) throw new RejectedInputError("Adicione um agente antes de pedir execução.");
  if (blocked) throw new RejectedInputError("Esse agente está em handoff. Devolva o controle no inspetor.");
  if (known.length > 0) return known.filter((id) => !handoffIds.includes(id));
  if (agentIds.length === 1 && !handoffIds.includes(agentIds[0] ?? "")) return agentIds;
  throw new RejectedInputError("Mencione qual agente deve executar.");
}
