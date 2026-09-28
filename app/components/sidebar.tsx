"use client";

import { useEffect, useState } from "react";
import type { RosterEntry } from "@core/types";
import type { Section } from "../stores/squad-store";
import { useSquadStore } from "../stores/squad-store";

const NAV: { id: Section; label: string }[] = [
  { id: "inicio", label: "Início" },
  { id: "squads", label: "Squads" },
  { id: "marketplace", label: "Marketplace" },
  { id: "execucoes", label: "Execuções" },
  { id: "memoria", label: "Memória" },
  { id: "configuracoes", label: "Configurações" },
];

const TONE: Record<RosterEntry["tone"], string> = {
  orange: "bg-orange-500",
  ink: "bg-neutral-800",
  blue: "bg-blue-500",
  stone: "bg-stone-400",
};

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function Sidebar() {
  const home = useSquadStore((state) => state.home);
  const view = useSquadStore((state) => state.view);
  const section = useSquadStore((state) => state.section);
  const query = useSquadStore((state) => state.sidebarQuery);
  const squadId = useSquadStore((state) => state.squadId);
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("Ctrl K");
  const needle = query.trim().toLowerCase();
  const squads = (home?.squads ?? []).filter((squad) => !needle || squad.title.toLowerCase().includes(needle));
  const agents = (view?.roster ?? []).filter((entry) => entry.kind === "agent");
  const visibleAgents = agents.filter((agent) => !needle || `${agent.name} ${agent.role}`.toLowerCase().includes(needle));

  useEffect(() => {
    if (navigator.userAgent.includes("Mac")) setShortcut("⌘K");
  }, []);

  if (!home) return null;

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[#e7e4de] bg-[#f7f6f3]">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-sm font-semibold text-white">R</div>
        <div>
          <div className="text-sm font-semibold tracking-tight">RipperOS ADE</div>
          <div className="text-xs text-stone-500">Agentes · Dados · Execução</div>
        </div>
      </div>
      <label className="mx-3 flex items-center gap-2 rounded-lg border border-[#e7e4de] bg-white px-2.5 py-2 text-sm text-stone-500">
        <input
          id="squad-search"
          value={query}
          onChange={(event) => useSquadStore.getState().setSidebarQuery(event.target.value)}
          placeholder="Buscar agentes, squads..."
          className="w-full bg-transparent text-stone-800 outline-none placeholder:text-stone-400"
        />
        <kbd className="rounded border border-stone-200 px-1 text-[10px] text-stone-400">{shortcut}</kbd>
      </label>
      <nav className="mt-3 space-y-0.5 px-2">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => useSquadStore.getState().setSection(item.id)}
            className={`flex w-full rounded-lg px-2.5 py-2 text-left text-sm ${section === item.id ? "bg-[#eceae6] font-medium" : "text-stone-600 hover:bg-[#eceae6]/70"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-5 flex items-center justify-between px-4 text-[11px] font-medium tracking-wide text-stone-400">
        <span>MEUS SQUADS</span>
      </div>
      <form
        className="mx-3 mt-2 flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          const next = title.trim();
          if (!next) return;
          setTitle("");
          void useSquadStore.getState().createSquad(next);
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Novo squad"
          className="min-w-0 flex-1 rounded-lg border border-[#e7e4de] bg-white px-2 py-1.5 text-sm outline-none"
        />
        <button type="submit" className="rounded-lg bg-neutral-900 px-2 text-sm text-white">
          Criar
        </button>
      </form>
      <div className="mx-2 mt-2 space-y-2">
        {squads.length === 0 ? <p className="px-2 text-sm text-stone-500">Nenhum squad ainda.</p> : null}
        {squads.map((squad) => (
          <button
            key={squad.id}
            type="button"
            onClick={() => void useSquadStore.getState().openSquad(squad.id)}
            className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left ${squad.id === squadId ? "bg-white shadow-sm" : "hover:bg-white/70"}`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 text-xs font-semibold text-white">{initial(squad.title)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{squad.title}</span>
              <span className="block text-xs text-stone-500">
                {squad.agentCount} {squad.agentCount === 1 ? "agente" : "agentes"} · {squad.status === "ativo" ? "Ativo" : "Pausado"}
              </span>
            </span>
            <span className={`h-2 w-2 rounded-full ${squad.status === "ativo" ? "bg-emerald-500" : "bg-rose-400"}`} />
          </button>
        ))}
      </div>
      {view && visibleAgents.length > 0 ? (
        <div className="mx-2 mt-3 space-y-1 rounded-xl bg-white p-2">
          {visibleAgents.map((agent) => {
            const snapshot = view.state.agents[agent.id];
            const task = snapshot?.tarefa_atual;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => useSquadStore.getState().setDraft(`@${agent.name} `)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f7f6f3]"
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${TONE[agent.tone]}`}>{initial(agent.name)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{agent.name}</span>
                  <span className="block truncate text-xs text-stone-500">{agent.role}</span>
                  <span className="block truncate text-xs text-stone-400">{task ?? "Sem tarefa"}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-auto flex items-center gap-2 border-t border-[#e7e4de] px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-stone-700 text-xs font-medium text-white">{initial(home.human.name)}</div>
        <div>
          <div className="text-sm font-medium">{home.human.name}</div>
          <div className="text-xs text-stone-500">{home.human.role}</div>
        </div>
      </div>
    </aside>
  );
}
