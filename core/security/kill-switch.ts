import { readJson, writeJson } from "../../agents/memory/json-file";
import { killSwitchPath } from "../../agents/memory/layout";
import type { KillSwitchState } from "../types";

const fallback: KillSwitchState = { engaged: false, updatedAt: null, reason: null };

function isKillSwitchState(value: unknown): value is KillSwitchState {
  if (!value || typeof value !== "object") return false;
  const state = value as KillSwitchState;
  return typeof state.engaged === "boolean";
}

export async function readKillSwitch(): Promise<KillSwitchState> {
  const stored = await readJson<KillSwitchState>(killSwitchPath());
  if (!stored || !isKillSwitchState(stored)) return { ...fallback };
  return {
    engaged: stored.engaged,
    updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : null,
    reason: typeof stored.reason === "string" ? stored.reason : null,
  };
}

export async function isKillSwitchEngaged(): Promise<boolean> {
  const state = await readKillSwitch();
  return state.engaged;
}

export async function writeKillSwitch(engaged: boolean, reason: string): Promise<KillSwitchState> {
  const next: KillSwitchState = {
    engaged,
    updatedAt: new Date().toISOString(),
    reason,
  };
  await writeJson(killSwitchPath(), next);
  return next;
}
