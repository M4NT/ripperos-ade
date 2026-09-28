import { controlPath, messagesPath, squadDir, statePath } from "./layout";
import { readJson, withFileLock, writeJson } from "./json-file";
import { SquadNotFoundError } from "../../core/squads/errors";
import type { AgentSnapshot, ExecutionRecord, SquadControl, SquadMessage, SquadState, StoredSquad } from "../../core/types";

function isAgent(value: unknown): value is AgentSnapshot {
  if (!value || typeof value !== "object") return false;
  const agent = value as AgentSnapshot;
  return (
    (agent.status === "ativo" || agent.status === "idle") &&
    (agent.tarefa_atual === null || typeof agent.tarefa_atual === "string") &&
    typeof agent.bloqueado === "boolean"
  );
}

function isState(value: unknown): value is SquadState {
  if (!value || typeof value !== "object") return false;
  const state = value as SquadState;
  if (typeof state.squad !== "string") return false;
  if (state.status !== "ativo" && state.status !== "pausado") return false;
  if (typeof state.branch !== "string") return false;
  if (state.pr_atual !== null && typeof state.pr_atual !== "string") return false;
  if (state.ultima_execucao !== null && typeof state.ultima_execucao !== "string") return false;
  if (!state.agents || typeof state.agents !== "object") return false;
  return Object.values(state.agents).every(isAgent);
}

function isMessage(value: unknown): value is SquadMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as SquadMessage;
  return typeof message.id === "string" && typeof message.text === "string" && typeof message.authorId === "string";
}

function isExecution(value: unknown): value is ExecutionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as ExecutionRecord;
  return typeof record.id === "string" && typeof record.summary === "string" && (record.status === "ok" || record.status === "recusado" || record.status === "erro");
}

function isControl(value: unknown): value is SquadControl {
  if (!value || typeof value !== "object") return false;
  const control = value as SquadControl;
  return Array.isArray(control.handoffAgentIds) && typeof control.pausedByKill === "boolean";
}

export async function loadStored(tenantId: string, squadId: string): Promise<StoredSquad | null> {
  const state = await readJson<SquadState>(statePath(tenantId, squadId));
  const messages = await readJson<SquadMessage[]>(messagesPath(tenantId, squadId));
  const control = await readJson<SquadControl>(controlPath(tenantId, squadId));
  if (!state && !messages && !control) return null;
  if (!isState(state) || !Array.isArray(messages) || !messages.every(isMessage)) {
    throw new Error(`Snapshot inválido do squad ${squadId}`);
  }
  const safeControl: SquadControl = isControl(control)
    ? {
        handoffAgentIds: control.handoffAgentIds.filter((id) => typeof id === "string"),
        pausedByKill: control.pausedByKill,
        lastMemoryHits: Array.isArray(control.lastMemoryHits) ? control.lastMemoryHits.filter((hit) => typeof hit === "string") : [],
        executions: Array.isArray(control.executions) ? control.executions.filter(isExecution) : [],
      }
    : { handoffAgentIds: [], pausedByKill: false, lastMemoryHits: [], executions: [] };
  return { state, messages, control: safeControl };
}

export async function saveStored(tenantId: string, squadId: string, stored: StoredSquad): Promise<void> {
  await writeJson(statePath(tenantId, squadId), stored.state);
  await writeJson(messagesPath(tenantId, squadId), stored.messages);
  await writeJson(controlPath(tenantId, squadId), stored.control);
}

export async function mutateStored<T>(
  tenantId: string,
  squadId: string,
  mutate: (current: StoredSquad) => Promise<{ stored: StoredSquad; dirty: boolean; result: T }>,
): Promise<T> {
  return withFileLock(squadDir(tenantId, squadId), async () => {
    const current = await loadStored(tenantId, squadId);
    if (!current) throw new SquadNotFoundError(squadId);
    const outcome = await mutate(current);
    if (outcome.dirty) await saveStored(tenantId, squadId, outcome.stored);
    return outcome.result;
  });
}
