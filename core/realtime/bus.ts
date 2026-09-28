import type { SquadView } from "../types";

type Listener = (view: SquadView) => void;

const globalBus = globalThis as typeof globalThis & {
  __ripperBus?: Map<string, Set<Listener>>;
};

function listeners(): Map<string, Set<Listener>> {
  if (!globalBus.__ripperBus) globalBus.__ripperBus = new Map();
  return globalBus.__ripperBus;
}

export function subscribeSquad(squadId: string, listener: Listener): () => void {
  const set = listeners().get(squadId) ?? new Set<Listener>();
  set.add(listener);
  listeners().set(squadId, set);
  return () => {
    set.delete(listener);
  };
}

export function publishSquad(squadId: string, view: SquadView): void {
  for (const listener of listeners().get(squadId) ?? []) {
    listener(view);
  }
}
