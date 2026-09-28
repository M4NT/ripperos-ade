import { ensureCatalog } from "../memory/catalog";
import { mutateStored } from "../memory/squad-files";
import { DEFAULT_TENANT } from "../../core/roster";
import { publishSquad } from "../../core/realtime/bus";
import { readKillSwitch } from "../../core/security/kill-switch";
import { toView } from "../../core/squads/view";
import type { SquadState, StoredSquad } from "../../core/types";

const globalLoop = globalThis as typeof globalThis & { __ripperosIdleLoop?: ReturnType<typeof setInterval> };

function syncPause(stored: StoredSquad, engaged: boolean): { stored: StoredSquad; changed: boolean } {
  let changed = false;
  let state: SquadState = stored.state;
  let control = stored.control;

  if (engaged && state.status !== "pausado") {
    state = { ...state, status: "pausado" };
    control = { ...control, pausedByKill: true };
    changed = true;
  } else if (!engaged && control.pausedByKill && state.status === "pausado") {
    state = { ...state, status: "ativo" };
    control = { ...control, pausedByKill: false };
    changed = true;
  }

  const agents = { ...state.agents };
  for (const id of control.handoffAgentIds) {
    const agent = agents[id];
    if (agent && agent.status !== "idle") {
      agents[id] = { ...agent, status: "idle" };
      changed = true;
    }
  }
  if (changed) state = { ...state, agents };
  return { stored: { ...stored, state, control }, changed };
}

export async function tickIdleLoop(tenantId = DEFAULT_TENANT): Promise<void> {
  const catalog = await ensureCatalog(tenantId);
  for (const squad of catalog.squads) {
    const view = await mutateStored(tenantId, squad.id, async (current) => {
      const killed = await readKillSwitch();
      const next = syncPause(current, killed.engaged);
      if (!next.changed) return { stored: current, dirty: false, result: null };
      return { stored: next.stored, dirty: true, result: await toView(tenantId, squad.id, next.stored, catalog) };
    });
    if (view) publishSquad(squad.id, view);
  }
}

export function startIdleLoop(intervalMs = 4000): void {
  if (globalLoop.__ripperosIdleLoop) return;
  const timer = setInterval(() => {
    void tickIdleLoop().catch((error: unknown) => {
      console.error("idle-loop", error);
    });
  }, intervalMs);
  timer.unref?.();
  globalLoop.__ripperosIdleLoop = timer;
}
