export { RejectedInputError, SquadNotFoundError } from "./errors";
export { toView } from "./view";
export { postSquadMessage } from "./post-message";
export { createSquad, addAgent, removeAgent, releaseHandoff, updateSquadMeta, renameHuman, deleteSquad } from "./admin";
export { readWorkspace, setTenantKillSwitch, querySquadMemory } from "./workspace-home";

import { ensureCatalog } from "../../agents/memory/catalog";
import { mutateStored } from "../../agents/memory/squad-files";
import { toView } from "./view";
import type { SquadView } from "../types";

export async function readSquad(tenantId: string, squadId: string): Promise<SquadView> {
  const catalog = await ensureCatalog(tenantId);
  return mutateStored(tenantId, squadId, async (current) => ({
    stored: current,
    dirty: false,
    result: await toView(tenantId, squadId, current, catalog),
  }));
}
