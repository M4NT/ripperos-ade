import { readJson, writeJson } from "../agents/memory/json-file";
import { billingPath } from "../agents/memory/layout";
import { estimateTokens } from "../core/optimization/token-ripper";

export interface TenantUsage {
  tenantId: string;
  promptTokens: number;
  completionTokens: number;
  total: number;
  updatedAt: string | null;
}

function emptyUsage(tenantId: string): TenantUsage {
  return {
    tenantId,
    promptTokens: 0,
    completionTokens: 0,
    total: 0,
    updatedAt: null,
  };
}

function isUsage(value: unknown, tenantId: string): value is TenantUsage {
  if (!value || typeof value !== "object") return false;
  const usage = value as TenantUsage;
  return usage.tenantId === tenantId && typeof usage.promptTokens === "number" && typeof usage.completionTokens === "number";
}

export async function readUsage(tenantId: string): Promise<TenantUsage> {
  const stored = await readJson<TenantUsage>(billingPath(tenantId));
  if (!stored || !isUsage(stored, tenantId)) return emptyUsage(tenantId);
  return {
    ...stored,
    total: stored.promptTokens + stored.completionTokens,
  };
}

export async function recordUsage(
  tenantId: string,
  kind: "prompt" | "completion",
  text: string,
): Promise<TenantUsage> {
  const current = await readUsage(tenantId);
  const tokens = estimateTokens(text);
  const next: TenantUsage = {
    tenantId,
    promptTokens: current.promptTokens + (kind === "prompt" ? tokens : 0),
    completionTokens: current.completionTokens + (kind === "completion" ? tokens : 0),
    total: 0,
    updatedAt: new Date().toISOString(),
  };
  next.total = next.promptTokens + next.completionTokens;
  await writeJson(billingPath(tenantId), next);
  return next;
}
