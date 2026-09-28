import { ensureCatalog } from "../../agents/memory/catalog";
import { loadStored, mutateStored } from "../../agents/memory/squad-files";
import { searchMemory } from "../../agents/memory/vector-store";
import { readUsage } from "../../proxy-gateway/billing";
import { FINANCIAL_TOOLS, MCP_ALLOWLIST, sanitizeText } from "../security/hemlock";
import { readKillSwitch, writeKillSwitch } from "../security/kill-switch";
import { publishSquad } from "../realtime/bus";
import { RejectedInputError } from "./errors";
import { sharedQueue } from "./queue";
import { toView } from "./view";
import type { SquadView, WorkspaceHome } from "../types";

export async function readWorkspace(tenantId: string): Promise<WorkspaceHome> {
  const catalog = await ensureCatalog(tenantId);
  const usage = await readUsage(tenantId);
  const squads = [];
  for (const squad of catalog.squads) {
    const stored = await loadStored(tenantId, squad.id);
    if (!stored) continue;
    squads.push({
      id: squad.id,
      title: squad.title,
      status: stored.state.status,
      agentCount: Object.keys(stored.state.agents).length,
      ultimaExecucao: stored.state.ultima_execucao,
    });
  }
  return {
    tenantId,
    human: catalog.human,
    squads,
    billing: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      total: usage.total,
    },
    killSwitch: await readKillSwitch(),
    tools: { allowed: [...MCP_ALLOWLIST], financial: [...FINANCIAL_TOOLS] },
  };
}

async function applyKill(tenantId: string, squadId: string, engaged: boolean, catalog: Awaited<ReturnType<typeof ensureCatalog>>) {
  return mutateStored(tenantId, squadId, async (current) => {
    const stored = {
      ...current,
      state: { ...current.state, status: engaged ? ("pausado" as const) : ("ativo" as const) },
      control: { ...current.control, pausedByKill: engaged },
    };
    return { stored, dirty: true, result: await toView(tenantId, squadId, stored, catalog) };
  });
}

export async function setTenantKillSwitch(
  tenantId: string,
  engaged: boolean,
  focusSquadId: string | null,
): Promise<{ killSwitch: WorkspaceHome["killSwitch"]; view: SquadView | null }> {
  return sharedQueue.enqueue(
    tenantId,
    async () => {
      const catalog = await ensureCatalog(tenantId);
      await writeKillSwitch(engaged, "painel");
      let focus: SquadView | null = null;
      for (const squad of catalog.squads) {
        const view = await applyKill(tenantId, squad.id, engaged, catalog);
        publishSquad(squad.id, view);
        if (squad.id === focusSquadId) focus = view;
      }
      return { killSwitch: await readKillSwitch(), view: focus };
    },
    { bypassKill: true },
  );
}

export async function querySquadMemory(tenantId: string, squadId: string, query: string): Promise<SquadView> {
  const text = sanitizeText(query, 500);
  if (!text) throw new RejectedInputError("Informe o que procurar na memória.");
  const catalog = await ensureCatalog(tenantId);
  let hits: string[] = [];
  try {
    hits = (await searchMemory(tenantId, text, 5)).map((hit) => hit.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar a memória.";
    throw new RejectedInputError(message);
  }
  return mutateStored(tenantId, squadId, async (stored) => {
    const updated = { ...stored, control: { ...stored.control, lastMemoryHits: hits } };
    return { stored: updated, dirty: true, result: await toView(tenantId, squadId, updated, catalog) };
  });
}
