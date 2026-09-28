import { rm } from "node:fs/promises";
import { assertAgentId, assertSquadId } from "../../core/ids";
import type { RosterEntry, Tone } from "../../core/types";
import { readJson, writeJson } from "./json-file";
import { catalogPath, squadDir } from "./layout";
import { loadStored } from "./squad-files";

export interface CatalogSquad {
  id: string;
  title: string;
  stateName: string;
}

export interface WorkspaceCatalog {
  human: RosterEntry;
  agents: RosterEntry[];
  squads: CatalogSquad[];
}

const TONES: Tone[] = ["orange", "ink", "blue"];

const HUMAN: RosterEntry = {
  id: "ripper",
  name: "Ripper",
  role: "Operador",
  kind: "human",
  tone: "stone",
};

function isEntry(value: unknown): value is RosterEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as RosterEntry;
  return typeof entry.id === "string" && typeof entry.name === "string" && (entry.kind === "human" || entry.kind === "agent");
}

function isCatalog(value: unknown): value is WorkspaceCatalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as WorkspaceCatalog;
  return isEntry(catalog.human) && Array.isArray(catalog.agents) && Array.isArray(catalog.squads);
}

export function nextTone(agentCount: number): Tone {
  return TONES[agentCount % TONES.length] ?? "orange";
}

async function dropFixture(tenantId: string): Promise<void> {
  const stored = await loadStored(tenantId, "os-danadinhos");
  if (!stored) return;
  const blob = `${stored.messages.map((message) => `${message.id}\n${message.text}`).join("\n")}\n${stored.state.resumo ?? ""}`;
  if (!blob.includes("\nm1\n") && !stored.messages.some((message) => message.id === "m1") && !blob.includes("github.com/M4NT/split/pull/24")) {
    return;
  }
  await rm(squadDir(tenantId, "os-danadinhos"), { recursive: true, force: true });
  const catalog = await readJson<WorkspaceCatalog>(catalogPath(tenantId));
  if (!catalog || !isCatalog(catalog)) return;
  await writeJson(catalogPath(tenantId), {
    ...catalog,
    squads: catalog.squads.filter((squad) => squad.id !== "os-danadinhos"),
  });
}

export async function ensureCatalog(tenantId: string): Promise<WorkspaceCatalog> {
  await dropFixture(tenantId);
  const existing = await readJson<WorkspaceCatalog>(catalogPath(tenantId));
  if (existing && isCatalog(existing)) return existing;
  const created: WorkspaceCatalog = { human: HUMAN, agents: [], squads: [] };
  await writeJson(catalogPath(tenantId), created);
  return created;
}

export async function saveCatalog(tenantId: string, catalog: WorkspaceCatalog): Promise<void> {
  catalog.human.id = assertAgentId(catalog.human.id);
  for (const squad of catalog.squads) assertSquadId(squad.id);
  for (const agent of catalog.agents) assertAgentId(agent.id);
  await writeJson(catalogPath(tenantId), catalog);
}
