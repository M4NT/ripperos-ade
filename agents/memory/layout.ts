import path from "node:path";
import { assertSquadId, assertTenantId } from "../../core/ids";
import { repoRoot } from "../../core/paths";

export function tenantRoot(tenantId: string): string {
  return path.join(repoRoot(), "agents", "memory", "tenants", assertTenantId(tenantId));
}

export function squadDir(tenantId: string, squadId: string): string {
  return path.join(tenantRoot(tenantId), "squads", assertSquadId(squadId));
}

export function vectorStoreDir(tenantId: string): string {
  return path.join(tenantRoot(tenantId), "vector_store");
}

export function billingPath(tenantId: string): string {
  return path.join(tenantRoot(tenantId), "billing.json");
}

export function catalogPath(tenantId: string): string {
  return path.join(tenantRoot(tenantId), "catalog.json");
}

export function killSwitchPath(): string {
  return path.join(repoRoot(), "agents", "memory", "kill-switch.json");
}

export function statePath(tenantId: string, squadId: string): string {
  return path.join(squadDir(tenantId, squadId), "state.json");
}

export function messagesPath(tenantId: string, squadId: string): string {
  return path.join(squadDir(tenantId, squadId), "messages.json");
}

export function controlPath(tenantId: string, squadId: string): string {
  return path.join(squadDir(tenantId, squadId), "control.json");
}
