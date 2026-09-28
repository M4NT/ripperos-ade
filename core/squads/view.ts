import type { WorkspaceCatalog } from "../../agents/memory/catalog";
import { FINANCIAL_TOOLS, MCP_ALLOWLIST } from "../security/hemlock";
import { readKillSwitch } from "../security/kill-switch";
import { SquadNotFoundError } from "./errors";
import type { SquadView, StoredSquad } from "../types";

export async function toView(
  tenantId: string,
  squadId: string,
  stored: StoredSquad,
  catalog: WorkspaceCatalog,
): Promise<SquadView> {
  const squad = catalog.squads.find((entry) => entry.id === squadId);
  if (!squad) throw new SquadNotFoundError(squadId);
  const ids = new Set(Object.keys(stored.state.agents));
  return {
    tenantId,
    squadId,
    title: squad.title,
    state: stored.state,
    messages: stored.messages,
    control: stored.control,
    killSwitch: await readKillSwitch(),
    roster: [catalog.human, ...catalog.agents.filter((agent) => ids.has(agent.id))],
    tools: {
      allowed: [...MCP_ALLOWLIST],
      financial: [...FINANCIAL_TOOLS],
    },
  };
}
