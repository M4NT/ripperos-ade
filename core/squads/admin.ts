import { rm } from "node:fs/promises";
import { ensureCatalog, nextTone, saveCatalog, type WorkspaceCatalog } from "../../agents/memory/catalog";
import { emptySquad } from "../../agents/memory/empty-squad";
import { withFileLock } from "../../agents/memory/json-file";
import { loadStored, mutateStored, saveStored } from "../../agents/memory/squad-files";
import { squadDir } from "../../agents/memory/layout";
import { assertAgentId, assertSquadId, slugify } from "../../core/ids";
import { readGitSnapshot } from "../../core/workspace/git-snapshot";
import { sanitizeText } from "../../core/security/hemlock";
import { readKillSwitch } from "../../core/security/kill-switch";
import type { RosterEntry } from "../../core/types";
import { RejectedInputError, SquadNotFoundError } from "./errors";
import { toView } from "./view";
import type { SquadView } from "../types";

function uniqueId(taken: Set<string>, base: string, separator: "-" | "_"): string {
  let id = base;
  let index = 2;
  while (taken.has(id)) {
    id = `${base.slice(0, 40)}${separator}${index}`;
    index += 1;
    if (index > 40) throw new RejectedInputError("Não foi possível gerar um identificador.");
  }
  return id;
}

async function lockedCatalog<T>(tenantId: string, run: (catalog: WorkspaceCatalog) => Promise<T>): Promise<T> {
  return withFileLock(`catalog:${tenantId}`, async () => run(await ensureCatalog(tenantId)));
}

export async function createSquad(tenantId: string, title: string): Promise<SquadView> {
  const name = sanitizeText(title, 80);
  if (name.length < 2) throw new RejectedInputError("Dê um nome com pelo menos 2 caracteres.");
  return lockedCatalog(tenantId, async (catalog) => {
    const id = assertSquadId(uniqueId(new Set(catalog.squads.map((squad) => squad.id)), slugify(name), "-"));
    const entry = { id, title: name, stateName: id.replace(/-/g, "_") };
    const git = await readGitSnapshot();
    const stored = emptySquad(entry, git.branch);
    const killed = await readKillSwitch();
    if (killed.engaged) {
      stored.state.status = "pausado";
      stored.control.pausedByKill = true;
    }
    await saveStored(tenantId, id, stored);
    const next = { ...catalog, squads: [...catalog.squads, entry] };
    await saveCatalog(tenantId, next);
    return toView(tenantId, id, stored, next);
  });
}

export async function addAgent(tenantId: string, squadId: string, input: { name: string; role: string }): Promise<SquadView> {
  const name = sanitizeText(input.name, 40);
  const role = sanitizeText(input.role, 60);
  if (name.length < 2 || role.length < 2) throw new RejectedInputError("Nome e função do agente são obrigatórios.");
  return lockedCatalog(tenantId, async (catalog) => {
    if (!catalog.squads.some((squad) => squad.id === squadId)) throw new SquadNotFoundError(squadId);
    const id = assertAgentId(uniqueId(new Set(catalog.agents.map((agent) => agent.id)), slugify(name).replace(/-/g, "_"), "_"));
    const agent: RosterEntry = { id, name, role, kind: "agent", tone: nextTone(catalog.agents.length) };
    const next = { ...catalog, agents: [...catalog.agents, agent] };
    await saveCatalog(tenantId, next);
    return mutateStored(tenantId, squadId, async (stored) => {
      const state = {
        ...stored.state,
        agents: { ...stored.state.agents, [id]: { status: "idle" as const, tarefa_atual: null, bloqueado: false } },
      };
      const updated = { ...stored, state };
      return { stored: updated, dirty: true, result: await toView(tenantId, squadId, updated, next) };
    });
  });
}

export async function removeAgent(tenantId: string, squadId: string, agentId: string): Promise<SquadView> {
  return lockedCatalog(tenantId, async (catalog) => {
    if (!catalog.squads.some((squad) => squad.id === squadId)) throw new SquadNotFoundError(squadId);
    return mutateStored(tenantId, squadId, async (stored) => {
      if (!stored.state.agents[agentId]) throw new RejectedInputError("Agente não está neste squad.");
      const agents = { ...stored.state.agents };
      delete agents[agentId];
      const updated = {
        ...stored,
        state: { ...stored.state, agents },
        control: { ...stored.control, handoffAgentIds: stored.control.handoffAgentIds.filter((id) => id !== agentId) },
      };
      const next = { ...catalog, agents: catalog.agents.filter((agent) => agent.id !== agentId) };
      await saveCatalog(tenantId, next);
      return { stored: updated, dirty: true, result: await toView(tenantId, squadId, updated, next) };
    });
  });
}

export async function releaseHandoff(tenantId: string, squadId: string, agentId: string): Promise<SquadView> {
  const catalog = await ensureCatalog(tenantId);
  return mutateStored(tenantId, squadId, async (stored) => {
    const agent = stored.state.agents[agentId];
    if (!agent) throw new RejectedInputError("Agente não está neste squad.");
    const state = {
      ...stored.state,
      agents: { ...stored.state.agents, [agentId]: { ...agent, status: stored.control.pausedByKill ? "idle" as const : "ativo" as const } },
    };
    const control = { ...stored.control, handoffAgentIds: stored.control.handoffAgentIds.filter((id) => id !== agentId) };
    const updated = { ...stored, state, control };
    return { stored: updated, dirty: true, result: await toView(tenantId, squadId, updated, catalog) };
  });
}

export async function updateSquadMeta(
  tenantId: string,
  squadId: string,
  patch: { prAtual?: string | null; refreshGit?: boolean },
): Promise<SquadView> {
  const catalog = await ensureCatalog(tenantId);
  const git = patch.refreshGit ? await readGitSnapshot() : null;
  return mutateStored(tenantId, squadId, async (stored) => {
    let pr = stored.state.pr_atual;
    if (patch.prAtual !== undefined) {
      const cleaned = patch.prAtual === null ? null : sanitizeText(patch.prAtual, 40);
      pr = cleaned ? cleaned : null;
    }
    const state = { ...stored.state, pr_atual: pr, branch: git?.branch || stored.state.branch };
    const updated = { ...stored, state };
    return { stored: updated, dirty: true, result: await toView(tenantId, squadId, updated, catalog) };
  });
}

export async function deleteSquad(tenantId: string, squadId: string): Promise<void> {
  await lockedCatalog(tenantId, async (catalog) => {
    if (!catalog.squads.some((squad) => squad.id === squadId)) throw new SquadNotFoundError(squadId);
    const stored = await loadStored(tenantId, squadId);
    const removed = new Set(Object.keys(stored?.state.agents ?? {}));
    await rm(squadDir(tenantId, squadId), { recursive: true, force: true });
    const kept = catalog.squads.filter((squad) => squad.id !== squadId);
    const used = new Set<string>();
    for (const squad of kept) {
      const other = await loadStored(tenantId, squad.id);
      for (const id of Object.keys(other?.state.agents ?? {})) used.add(id);
    }
    await saveCatalog(tenantId, {
      ...catalog,
      squads: kept,
      agents: catalog.agents.filter((agent) => !removed.has(agent.id) || used.has(agent.id)),
    });
  });
}

export async function renameHuman(tenantId: string, name: string): Promise<void> {
  const cleaned = sanitizeText(name, 40);
  if (cleaned.length < 2) throw new RejectedInputError("Dê um nome com pelo menos 2 caracteres.");
  await lockedCatalog(tenantId, async (catalog) => {
    await saveCatalog(tenantId, { ...catalog, human: { ...catalog.human, name: cleaned } });
  });
}
