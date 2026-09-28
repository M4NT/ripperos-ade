"use client";

import { useState } from "react";
import { formatRelative } from "../lib/format";
import { useSquadStore } from "../stores/squad-store";

const TONE = { orange: "bg-orange-500", ink: "bg-neutral-800", blue: "bg-blue-500", stone: "bg-stone-400" } as const;

function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="mono overflow-auto text-[12px] leading-5 text-stone-700">
      {JSON.stringify(value, null, 2).split("\n").map((line, index) => (
        <div key={index} className="flex gap-3">
          <span className="w-5 shrink-0 text-right text-stone-300">{index + 1}</span>
          <span>{line}</span>
        </div>
      ))}
    </pre>
  );
}

export function Inspector({ overlay }: { overlay: boolean }) {
  const view = useSquadStore((state) => state.view);
  const tab = useSquadStore((state) => state.inspectorTab);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [pr, setPr] = useState<string | null>(null);
  if (!view) return null;
  const agents = view.roster.filter((entry) => entry.kind === "agent");
  const online = agents.filter((agent) => view.state.agents[agent.id]?.status === "ativo").length;
  const handoff = agents.filter((agent) => view.control.handoffAgentIds.includes(agent.id));
  const prValue = pr ?? view.state.pr_atual ?? "";

  return (
    <aside className={`flex h-full w-[340px] shrink-0 flex-col border-l border-[#e7e4de] bg-[#fbfaf8] ${overlay ? "absolute top-0 right-0 z-20 shadow-xl" : ""}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {overlay ? (
          <button type="button" className="text-sm text-stone-500" onClick={() => useSquadStore.getState().setInspectorOpen(false)}>
            Fechar
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={() => void useSquadStore.getState().toggleKill()}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${view.killSwitch.engaged ? "border-rose-600 bg-rose-600 text-white" : "border-rose-200 bg-rose-50 text-rose-700"}`}
        >
          {view.killSwitch.engaged ? "Retomar" : "Kill Switch"}
        </button>
      </div>
      <div className="flex gap-1 px-4 text-sm">
        {(
          [
            ["estado", "Estado"],
            ["handoff", "Handoff"],
            ["execucoes", "Execuções"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => useSquadStore.getState().setInspectorTab(id)} className={`rounded-lg px-2.5 py-1.5 ${tab === id ? "bg-white font-medium shadow-sm" : "text-stone-500"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mx-4 mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#e7e4de] bg-white">
        {tab === "estado" ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[#f0eeea] px-3 py-2 text-sm">
              <span className="font-medium">state.json</span>
              <button type="button" className="text-xs text-sky-700" onClick={() => void useSquadStore.getState().refreshGit()}>
                Ler git
              </button>
            </div>
            <div className="px-3 py-2 text-xs text-emerald-700">{formatRelative(view.state.ultima_execucao)}</div>
            <label className="flex items-center gap-2 px-3 pb-2 text-xs text-stone-500">
              PR
              <input
                value={prValue}
                onChange={(event) => setPr(event.target.value)}
                onBlur={() => {
                  if (pr === null) return;
                  void useSquadStore.getState().savePr(pr);
                  setPr(null);
                }}
                placeholder="vazio"
                className="w-24 rounded border border-[#e7e4de] px-1.5 py-1 text-stone-800 outline-none"
              />
            </label>
            <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
              <JsonView value={view.state} />
            </div>
          </div>
        ) : null}
        {tab === "handoff" ? (
          <div className="space-y-2 p-3 text-sm">
            {handoff.length === 0 ? <p className="text-stone-500">Nenhum agente em handoff. Peça handoff no chat.</p> : null}
            {handoff.map((agent) => (
              <div key={agent.id} className="rounded-xl bg-[#f7f6f3] px-3 py-2">
                <div className="font-medium">{agent.name}</div>
                <div className="text-stone-500">{view.state.agents[agent.id]?.tarefa_atual ?? "Aguardando humano"}</div>
                <button type="button" className="mt-2 text-xs text-sky-700" onClick={() => void useSquadStore.getState().releaseHandoff(agent.id)}>
                  Devolver controle
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {tab === "execucoes" ? (
          <ul className="space-y-2 overflow-auto p-3 text-sm">
            {view.control.executions.length === 0 ? <li className="text-stone-500">Nenhuma execução.</li> : null}
            {[...view.control.executions].reverse().map((record) => (
              <li key={record.id} className="rounded-xl bg-[#f7f6f3] px-3 py-2">
                <div className="font-medium">{agents.find((agent) => agent.id === record.agentId)?.name ?? record.agentId}</div>
                <div className="text-stone-500">{record.summary}</div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="px-4 py-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Agentes no squad</span>
          <span className="text-xs text-emerald-700">{online} online</span>
        </div>
        <ul className="mb-3 space-y-2">
          {agents.length === 0 ? <li className="text-sm text-stone-500">Adicione o primeiro agente.</li> : null}
          {agents.map((agent) => {
            const snapshot = view.state.agents[agent.id];
            return (
              <li key={agent.id} className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white ${TONE[agent.tone]}`}>{agent.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{agent.name}</span>
                  <span className="block truncate text-xs text-stone-500">{agent.role}</span>
                </span>
                <span className="text-xs text-stone-500">{snapshot?.status === "ativo" ? "Ativo" : "Idle"}</span>
                <button type="button" className="text-xs text-stone-400" onClick={() => void useSquadStore.getState().removeAgent(agent.id)} aria-label={`Remover ${agent.name}`}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !role.trim()) return;
            void useSquadStore.getState().addAgent(name.trim(), role.trim());
            setName("");
            setRole("");
          }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="w-24 rounded-lg border border-[#e7e4de] bg-white px-2 py-1.5 text-sm outline-none" />
          <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Função" className="min-w-0 flex-1 rounded-lg border border-[#e7e4de] bg-white px-2 py-1.5 text-sm outline-none" />
          <button type="submit" className="rounded-lg bg-neutral-900 px-2 text-sm text-white">+</button>
        </form>
      </div>
    </aside>
  );
}
