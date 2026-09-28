"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SquadMessage, SquadView } from "@core/types";
import { formatClock, splitMessage } from "../lib/format";
import type { MainTab } from "../stores/squad-store";
import { useSquadStore } from "../stores/squad-store";

function MessageBody({ text, names }: { text: string; names: string[] }) {
  return (
    <p className="whitespace-pre-wrap text-[14px] leading-6 text-stone-800">
      {splitMessage(text, names).map((part, index) => {
        if (part.type === "mention") return <span key={index} className="font-medium text-sky-700">{part.value}</span>;
        if (part.type === "link") {
          return (
            <a key={index} href={part.value} target="_blank" rel="noreferrer" className="break-all text-sky-700 underline">
              {part.value}
            </a>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </p>
  );
}

function Bubble({ view, message, selected }: { view: SquadView; message: SquadMessage; selected: boolean }) {
  const [copied, setCopied] = useState(false);
  const names = view.roster.map((entry) => entry.name);
  const tone = view.roster.find((entry) => entry.id === message.authorId)?.tone ?? "stone";
  const color = tone === "orange" ? "bg-orange-500" : tone === "blue" ? "bg-blue-500" : tone === "ink" ? "bg-neutral-800" : "bg-stone-400";
  return (
    <article
      onClick={() => useSquadStore.getState().setSelected(message.id)}
      className={`relative rounded-2xl px-3.5 py-3 ${selected ? "border border-sky-300 bg-white shadow-sm" : "bg-[#f5f4f1]"}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white ${color}`}>{message.authorName.slice(0, 1)}</span>
        <span className="text-sm font-medium">{message.authorName}</span>
        <span className="text-xs text-stone-400">{formatClock(message.createdAt)}</span>
        {message.intent ? <span className="rounded-full bg-stone-200/70 px-1.5 text-[10px] text-stone-500">{message.intent}</span> : null}
      </div>
      <MessageBody text={message.text} names={names} />
      {selected ? (
        <div className="mt-2 flex gap-2 text-xs text-stone-500">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(message.text);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "copiado" : "copiar"}
          </button>
          <button type="button" onClick={() => useSquadStore.getState().setDraft(`@${message.authorName} `)}>
            responder
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function Thread() {
  const view = useSquadStore((state) => state.view);
  const tab = useSquadStore((state) => state.mainTab);
  const query = useSquadStore((state) => state.messageQuery);
  const selectedId = useSquadStore((state) => state.selectedId);
  const draft = useSquadStore((state) => state.draft);
  const sending = useSquadStore((state) => state.sending);
  const error = useSquadStore((state) => state.error);
  const memoryQuery = useSquadStore((state) => state.memoryQuery);
  const narrow = useSquadStore((state) => state.narrow);
  const inspectorOpen = useSquadStore((state) => state.inspectorOpen);
  const scroller = useRef<HTMLDivElement>(null);
  const names = useMemo(() => view?.roster.map((entry) => entry.name) ?? [], [view]);
  const needle = query.trim().toLowerCase();
  const messages = (view?.messages ?? []).filter((message) => !needle || `${message.text} ${message.authorName}`.toLowerCase().includes(needle));
  const links = [...new Set((view?.messages ?? []).flatMap((message) => [...message.text.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0])))];
  const mentionQuery = draft.match(/@([\p{L}\p{N}._ ]{0,40})$/u)?.[1]?.toLowerCase() ?? null;
  const suggestions = mentionQuery === null ? [] : (view?.roster ?? []).filter((entry) => entry.kind === "agent" && entry.name.toLowerCase().includes(mentionQuery));

  useEffect(() => {
    const node = scroller.current;
    if (!node || tab !== "chat") return;
    node.scrollTop = node.scrollHeight;
  }, [view?.messages.length, tab]);

  if (!view) {
    return (
      <section className="grid min-w-0 flex-1 place-items-center bg-[#f7f6f4] p-8 text-center">
        <div className="max-w-md">
          <h1 className="text-lg font-semibold">Nenhum squad aberto</h1>
          <p className="mt-2 text-sm text-stone-500">Crie um squad na barra ao lado. O estado, a fila e a memória passam a ser deste squad.</p>
        </div>
      </section>
    );
  }

  const killed = view.killSwitch.engaged;
  const tabs: { id: MainTab; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "arquivos", label: "Arquivos" },
    { id: "execucoes", label: "Execuções" },
    { id: "memoria", label: "Memória" },
  ];

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[#f7f6f4]">
      <header className="flex items-start justify-between gap-4 border-b border-[#e7e4de] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold">{view.title}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${view.state.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {view.state.status === "ativo" ? "Ativo" : "Pausado"}
            </span>
            <button type="button" className="text-xs text-stone-400" onClick={() => void useSquadStore.getState().deleteSquad()}>
              Excluir
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {Object.keys(view.state.agents).length} {Object.keys(view.state.agents).length === 1 ? "agente" : "agentes"} · {view.state.branch}
            {view.state.pr_atual ? ` · PR ${view.state.pr_atual}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-1 text-sm">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => useSquadStore.getState().setMainTab(item.id)} className={`rounded-lg px-3 py-1.5 ${tab === item.id ? "bg-white font-medium shadow-sm" : "text-stone-500"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => useSquadStore.getState().setMessageQuery(event.target.value)}
            placeholder="Filtrar"
            className="w-28 rounded-lg border border-[#e7e4de] bg-white px-2 py-1.5 text-sm outline-none"
          />
          {narrow || !inspectorOpen ? (
            <button type="button" onClick={() => useSquadStore.getState().setInspectorOpen(!inspectorOpen)} className="rounded-lg border border-[#e7e4de] bg-white px-2 py-1.5 text-sm">
              Estado
            </button>
          ) : null}
        </div>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {killed ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">Kill switch ativo. A fila e o runner estão pausados.</div> : null}
        {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</div> : null}
        {tab === "chat" && messages.length === 0 ? <p className="text-sm text-stone-500">Sem mensagens. Mencione um agente para registrar a tarefa ou pedir uma ferramenta.</p> : null}
        {tab === "chat" ? messages.map((message) => <Bubble key={message.id} view={view} message={message} selected={message.id === selectedId} />) : null}
        {tab === "arquivos" ? (
          <ul className="space-y-2">
            {links.length === 0 ? <li className="text-sm text-stone-500">Nenhum link nas mensagens deste squad.</li> : null}
            {links.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noreferrer" className="break-all text-sm text-sky-700 underline">{link}</a>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "execucoes" ? <ExecutionList view={view} /> : null}
        {tab === "memoria" ? (
          <div className="space-y-3 text-sm">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void useSquadStore.getState().searchMemory();
              }}
            >
              <input
                value={memoryQuery}
                onChange={(event) => useSquadStore.getState().setMemoryQuery(event.target.value)}
                placeholder="Buscar na memória do tenant"
                className="min-w-0 flex-1 rounded-lg border border-[#e7e4de] bg-white px-3 py-2 outline-none"
              />
              <button type="submit" className="rounded-lg bg-neutral-900 px-3 text-white">Buscar</button>
            </form>
            <p className="rounded-xl bg-white p-3 text-stone-700">{view.state.resumo ?? "Nenhum resumo compactado ainda."}</p>
            {view.control.lastMemoryHits.map((hit) => (
              <p key={hit} className="rounded-xl border border-[#e7e4de] bg-white p-3 text-stone-600">{hit}</p>
            ))}
          </div>
        ) : null}
      </div>
      <form
        className="border-t border-[#e7e4de] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void useSquadStore.getState().send();
        }}
      >
        {suggestions.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {suggestions.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className="rounded-full bg-white px-2 py-1 text-xs text-sky-800"
                onClick={() => useSquadStore.getState().setDraft(draft.replace(/@([\p{L}\p{N}._ ]{0,40})$/u, `@${agent.name} `))}
              >
                @{agent.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-[#e7e4de] bg-white px-3 py-2">
          <textarea
            value={draft}
            disabled={killed || sending}
            onChange={(event) => useSquadStore.getState().setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void useSquadStore.getState().send();
              }
            }}
            rows={2}
            placeholder={killed ? "Squad pausado pelo kill switch" : `Mensagem para ${view.title}. Use @Agente, memory.search, github.read ou handoff.`}
            className="max-h-32 min-h-12 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-stone-400"
          />
          <button type="submit" disabled={killed || sending || draft.trim().length === 0} className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white disabled:bg-stone-300" aria-label="Enviar">
            ↑
          </button>
        </div>
      </form>
    </section>
  );
}

function ExecutionList({ view }: { view: SquadView }) {
  const records = [...view.control.executions].reverse();
  if (records.length === 0) return <p className="text-sm text-stone-500">Nenhuma execução neste squad.</p>;
  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id} className="rounded-xl bg-white px-3 py-2 text-sm">
          <div className="font-medium">{view.roster.find((entry) => entry.id === record.agentId)?.name ?? record.agentId}</div>
          <div className="text-stone-500">{record.tool ?? record.status} · {formatClock(record.at)} · {record.status}</div>
          <p className="mt-1 text-stone-700">{record.summary}</p>
        </li>
      ))}
    </ul>
  );
}
