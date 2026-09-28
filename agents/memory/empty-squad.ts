import type { CatalogSquad } from "./catalog";
import type { StoredSquad } from "../../core/types";

export function emptySquad(squad: CatalogSquad, branch: string): StoredSquad {
  return {
    state: {
      squad: squad.stateName,
      status: "ativo",
      branch,
      pr_atual: null,
      ultima_execucao: null,
      agents: {},
    },
    messages: [],
    control: {
      handoffAgentIds: [],
      pausedByKill: false,
      lastMemoryHits: [],
      executions: [],
    },
  };
}
