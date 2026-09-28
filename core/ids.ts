const TENANT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const SQUAD_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const AGENT_ID = /^[a-z0-9][a-z0-9_]{0,63}$/;

export function assertTenantId(value: string): string {
  if (!TENANT_ID.test(value)) {
    throw new Error(`Tenant inválido: ${value}`);
  }
  return value;
}

export function assertSquadId(value: string): string {
  if (!SQUAD_ID.test(value)) {
    throw new Error(`Squad inválido: ${value}`);
  }
  return value;
}

export function assertAgentId(value: string): string {
  if (!AGENT_ID.test(value)) {
    throw new Error(`Agente inválido: ${value}`);
  }
  return value;
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "item";
}
