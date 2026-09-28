"use client";

import { create } from "zustand";
import type { SquadView, WorkspaceHome } from "@core/types";

export type Section = "inicio" | "squads" | "marketplace" | "execucoes" | "memoria" | "configuracoes";
export type MainTab = "chat" | "arquivos" | "execucoes" | "memoria";
export type InspectorTab = "estado" | "handoff" | "execucoes";

interface SquadStore {
  home: WorkspaceHome | null;
  squadId: string | null;
  view: SquadView | null;
  section: Section;
  mainTab: MainTab;
  inspectorTab: InspectorTab;
  inspectorOpen: boolean;
  narrow: boolean;
  selectedId: string | null;
  draft: string;
  sidebarQuery: string;
  messageQuery: string;
  memoryQuery: string;
  sending: boolean;
  error: string | null;
  setSection: (section: Section) => void;
  setMainTab: (tab: MainTab) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setInspectorOpen: (open: boolean) => void;
  setNarrow: (narrow: boolean) => void;
  setSelected: (id: string) => void;
  setDraft: (draft: string) => void;
  setSidebarQuery: (query: string) => void;
  setMessageQuery: (query: string) => void;
  setMemoryQuery: (query: string) => void;
  loadHome: () => Promise<void>;
  openSquad: (id: string) => Promise<void>;
  createSquad: (title: string) => Promise<void>;
  addAgent: (name: string, role: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  deleteSquad: () => Promise<void>;
  releaseHandoff: (agentId: string) => Promise<void>;
  refreshGit: () => Promise<void>;
  savePr: (pr: string) => Promise<void>;
  searchMemory: () => Promise<void>;
  renameHuman: (name: string) => Promise<void>;
  send: () => Promise<void>;
  toggleKill: () => Promise<void>;
}

let source: EventSource | null = null;

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export const useSquadStore = create<SquadStore>((set, get) => ({
  home: null,
  squadId: null,
  view: null,
  section: "squads",
  mainTab: "chat",
  inspectorTab: "estado",
  inspectorOpen: true,
  narrow: false,
  selectedId: null,
  draft: "",
  sidebarQuery: "",
  messageQuery: "",
  memoryQuery: "",
  sending: false,
  error: null,
  setSection: (section) =>
    set({
      section,
      mainTab: section === "memoria" ? "memoria" : section === "execucoes" ? "execucoes" : get().mainTab,
      inspectorTab: section === "execucoes" ? "execucoes" : get().inspectorTab,
    }),
  setMainTab: (mainTab) => set({ mainTab, section: "squads" }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab, inspectorOpen: true }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setNarrow: (narrow) => set({ narrow, inspectorOpen: narrow ? false : true }),
  setSelected: (selectedId) => set({ selectedId }),
  setDraft: (draft) => set({ draft }),
  setSidebarQuery: (sidebarQuery) => set({ sidebarQuery }),
  setMessageQuery: (messageQuery) => set({ messageQuery }),
  setMemoryQuery: (memoryQuery) => set({ memoryQuery }),
  loadHome: async () => {
    const response = await fetch("/api/workspace");
    const home = await readJson<WorkspaceHome>(response);
    if (!response.ok) {
      set({ error: home.error ?? "Falha ao abrir o workspace." });
      return;
    }
    set({ home, error: null });
    const current = get().squadId;
    const next = current && home.squads.some((squad) => squad.id === current) ? current : home.squads[0]?.id;
    if (next) await get().openSquad(next);
  },
  openSquad: async (id) => {
    set({ squadId: id, section: "squads", error: null });
    const response = await fetch(`/api/squads/${id}`);
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "Falha ao abrir o squad.", view: null });
      return;
    }
    set({ view, selectedId: view.messages.at(-1)?.id ?? null });
    source?.close();
    const stream = new EventSource(`/api/squads/${id}/stream`);
    stream.addEventListener("snapshot", (event) => {
      const nextView = JSON.parse((event as MessageEvent).data) as SquadView;
      set((state) => ({
        view: nextView,
        selectedId: state.selectedId && nextView.messages.some((message) => message.id === state.selectedId) ? state.selectedId : nextView.messages.at(-1)?.id ?? null,
      }));
    });
    source = stream;
  },
  createSquad: async (title) => {
    const response = await fetch("/api/squads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.squadId) {
      set({ error: view.error ?? "Não foi possível criar o squad." });
      return;
    }
    await get().loadHome();
    await get().openSquad(view.squadId);
  },
  addAgent: async (name, role) => {
    const id = get().squadId;
    if (!id) return;
    const response = await fetch(`/api/squads/${id}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "Não foi possível adicionar o agente." });
      return;
    }
    set({ view, error: null });
    await get().loadHome();
  },
  removeAgent: async (agentId) => {
    const id = get().squadId;
    if (!id) return;
    const response = await fetch(`/api/squads/${id}/agents/${agentId}`, { method: "DELETE" });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "Não foi possível remover o agente." });
      return;
    }
    set({ view, error: null });
    await get().loadHome();
  },
  deleteSquad: async () => {
    const id = get().squadId;
    if (!id) return;
    const response = await fetch(`/api/squads/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await readJson<{ error?: string }>(response);
      set({ error: body.error ?? "Não foi possível excluir o squad." });
      return;
    }
    source?.close();
    set({ squadId: null, view: null, error: null });
    await get().loadHome();
  },
  releaseHandoff: async (agentId) => {
    const id = get().squadId;
    if (!id) return;
    const response = await fetch(`/api/squads/${id}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "Não foi possível devolver o controle." });
      return;
    }
    set({ view, error: null });
  },
  refreshGit: async () => {
    const id = get().squadId;
    if (!id) return;
    const response = await fetch(`/api/squads/${id}/meta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshGit: true }),
    });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "O git local não respondeu." });
      return;
    }
    set({ view, error: null });
  },
  savePr: async (pr) => {
    const id = get().squadId;
    if (!id) return;
    const response = await fetch(`/api/squads/${id}/meta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prAtual: pr.trim() ? pr.trim() : null }),
    });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "Não foi possível salvar o PR." });
      return;
    }
    set({ view, error: null });
  },
  searchMemory: async () => {
    const id = get().squadId;
    const query = get().memoryQuery.trim();
    if (!id || !query) return;
    const response = await fetch(`/api/squads/${id}/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const view = await readJson<SquadView>(response);
    if (!response.ok || !view.state) {
      set({ error: view.error ?? "Falha na busca da memória." });
      return;
    }
    set({ view, error: null, mainTab: "memoria", section: "squads" });
  },
  renameHuman: async (name) => {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ humanName: name }),
    });
    const home = await readJson<WorkspaceHome>(response);
    if (!response.ok) {
      set({ error: home.error ?? "Não foi possível renomear." });
      return;
    }
    set({ home, error: null });
    const id = get().squadId;
    if (id) await get().openSquad(id);
  },
  send: async () => {
    const draft = get().draft.trim();
    const id = get().squadId;
    const authorId = get().home?.human.id;
    if (!draft || !id || !authorId || get().sending) return;
    set({ sending: true, error: null });
    try {
      const response = await fetch(`/api/squads/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft, authorId }),
      });
      const body = await readJson<{ view?: SquadView }>(response);
      if (!response.ok || !body.view) {
        set({ error: body.error ?? "Não foi possível enviar." });
        return;
      }
      set({ draft: "", view: body.view, selectedId: body.view.messages.at(-1)?.id ?? null });
    } finally {
      set({ sending: false });
    }
  },
  toggleKill: async () => {
    const engaged = get().view?.killSwitch.engaged ?? get().home?.killSwitch.engaged ?? false;
    const response = await fetch("/api/kill-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engaged: !engaged, squadId: get().squadId }),
    });
    const body = await readJson<{ view: SquadView | null; killSwitch: WorkspaceHome["killSwitch"] }>(response);
    if (!response.ok) {
      set({ error: body.error ?? "Falha no kill switch." });
      return;
    }
    if (body.view) set({ view: body.view, error: null });
    await get().loadHome();
  },
}));
