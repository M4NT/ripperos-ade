"use client";

import { useEffect, useState } from "react";
import { Inspector } from "./inspector";
import { Sidebar } from "./sidebar";
import { Thread } from "./thread";
import { useSquadStore } from "../stores/squad-store";

export function Workspace() {
  const home = useSquadStore((state) => state.home);
  const view = useSquadStore((state) => state.view);
  const section = useSquadStore((state) => state.section);
  const error = useSquadStore((state) => state.error);
  const inspectorOpen = useSquadStore((state) => state.inspectorOpen);
  const narrow = useSquadStore((state) => state.narrow);
  const [humanName, setHumanName] = useState("");
  const homeName = useSquadStore((state) => state.home?.human.name ?? "");

  useEffect(() => {
    if (homeName) setHumanName(homeName);
  }, [homeName]);

  useEffect(() => {
    void useSquadStore.getState().loadHome();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1179px)");
    const apply = () => useSquadStore.getState().setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const command = navigator.userAgent.includes("Mac") ? event.metaKey : event.ctrlKey;
      if (!command || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      document.getElementById("squad-search")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!home) {
    return <main className="grid h-dvh place-items-center text-sm text-stone-500">{error ?? "Abrindo o workspace..."}</main>;
  }

  const showThread = section === "squads" || section === "execucoes" || section === "memoria";

  return (
    <main className="relative flex h-dvh overflow-hidden bg-[#f3f2ef] text-stone-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1">
        {showThread ? <Thread /> : <CenterPanel humanName={humanName} onHumanName={setHumanName} />}
        {showThread && view && inspectorOpen ? <Inspector overlay={narrow} /> : null}
      </div>
    </main>
  );
}

function CenterPanel({ humanName, onHumanName }: { humanName: string; onHumanName: (value: string) => void }) {
  const home = useSquadStore((state) => state.home);
  const section = useSquadStore((state) => state.section);
  const draft = useSquadStore((state) => state.draft);
  if (!home) return null;
  return (
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f7f6f4] p-6">
      {section === "inicio" ? (
        <div className="grid max-w-xl gap-3">
          <h1 className="text-lg font-semibold">Início</h1>
          {home.squads.length === 0 ? <p className="text-sm text-stone-500">Crie um squad para começar.</p> : null}
          {home.squads.map((squad) => (
            <button key={squad.id} type="button" onClick={() => void useSquadStore.getState().openSquad(squad.id)} className="rounded-2xl bg-white p-4 text-left text-sm">
              <div className="font-medium">{squad.title}</div>
              <p className="mt-1 text-stone-500">
                {squad.agentCount} {squad.agentCount === 1 ? "agente" : "agentes"} · {squad.status === "ativo" ? "Ativo" : "Pausado"}
              </p>
            </button>
          ))}
        </div>
      ) : null}
      {section === "marketplace" ? (
        <div className="max-w-xl space-y-4 text-sm">
          <h1 className="text-lg font-semibold">Marketplace MCP</h1>
          <ToolList title="Allowlist" tools={home.tools.allowed} draft={draft} />
          <ToolList title="Financeiro, só com approvalToken" tools={home.tools.financial} draft={draft} />
        </div>
      ) : null}
      {section === "configuracoes" ? (
        <form
          className="max-w-xl space-y-3 rounded-2xl bg-white p-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            if (humanName.trim()) void useSquadStore.getState().renameHuman(humanName.trim());
          }}
        >
          <h1 className="text-lg font-semibold">Configurações</h1>
          <label className="block text-stone-600">
            Operador
            <input value={humanName} onChange={(event) => onHumanName(event.target.value)} className="mt-1 w-full rounded-lg border border-[#e7e4de] px-2 py-1.5 text-stone-900 outline-none" />
          </label>
          <button type="submit" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-white">Salvar nome</button>
          <dl className="space-y-1 text-stone-600">
            <div>Tenant: {home.tenantId}</div>
            <div>Kill switch: {home.killSwitch.engaged ? "ativo" : "liberado"}</div>
            <div>Tokens de prompt: {home.billing.promptTokens}</div>
            <div>Tokens de resposta: {home.billing.completionTokens}</div>
          </dl>
        </form>
      ) : null}
    </section>
  );
}

function ToolList({ title, tools, draft }: { title: string; tools: string[]; draft: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 space-y-2">
        {tools.map((tool) => (
          <li key={tool} className="flex items-center justify-between gap-3 text-stone-600">
            <span>{tool}</span>
            <button
              type="button"
              className="text-xs text-sky-700"
              onClick={() => {
                useSquadStore.getState().setSection("squads");
                useSquadStore.getState().setDraft(`${draft} ${tool}`.trim());
              }}
            >
              Inserir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
