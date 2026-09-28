import { randomUUID } from "node:crypto";
import { ensureCatalog } from "../../agents/memory/catalog";
import { mutateStored } from "../../agents/memory/squad-files";
import { foldHotMessages } from "../optimization/context-ripper";
import { publishSquad } from "../realtime/bus";
import { parseMentions } from "../roster";
import { classifyLocal } from "../router/classifier";
import { detectInjection, sanitizeOutput, sanitizeText } from "../security/hemlock";
import { writeKillSwitch } from "../security/kill-switch";
import { resolveTargets } from "../execution/targets";
import { runAgentTurns } from "../execution/turns";
import { recordUsage } from "../../proxy-gateway/billing";
import { RejectedInputError, SquadNotFoundError } from "./errors";
import { sharedQueue } from "./queue";
import { toView } from "./view";
import type { ExecutionRecord, SquadControl, SquadMessage, SquadState, SquadView, StoredSquad } from "../types";

function applyTurns(
  stored: StoredSquad,
  turns: Awaited<ReturnType<typeof runAgentTurns>>,
  intent: SquadMessage["intent"],
  squadId: string,
  names: Map<string, string>,
): StoredSquad {
  let state: SquadState = stored.state;
  const agents = { ...state.agents };
  let control: SquadControl = { ...stored.control, handoffAgentIds: [...stored.control.handoffAgentIds], executions: [...stored.control.executions] };
  const messages = [...stored.messages];
  for (const turn of turns) {
    const agent = agents[turn.agentId];
    if (!agent) continue;
    agents[turn.agentId] = {
      status: turn.idle ? "idle" : "ativo",
      tarefa_atual: turn.task,
      bloqueado: turn.blocked,
    };
    if (turn.idle && !control.handoffAgentIds.includes(turn.agentId)) control.handoffAgentIds.push(turn.agentId);
    if (turn.memoryHits) control = { ...control, lastMemoryHits: turn.memoryHits };
    const record: ExecutionRecord = {
      id: randomUUID(),
      at: new Date().toISOString(),
      agentId: turn.agentId,
      tool: turn.tool,
      status: turn.status,
      summary: turn.text.replace(/\s+/g, " ").slice(0, 180),
    };
    control = { ...control, executions: [...control.executions, record].slice(-40) };
    messages.push({
      id: randomUUID(),
      squadId,
      authorId: turn.agentId,
      authorName: names.get(turn.agentId) ?? turn.agentId,
      role: "agent",
      text: sanitizeOutput(turn.text),
      mentions: [],
      createdAt: record.at,
      intent,
    });
  }
  state = { ...state, agents, ultima_execucao: messages.at(-1)?.createdAt ?? state.ultima_execucao };
  return { state, messages, control };
}

export async function postSquadMessage(input: {
  tenantId: string;
  squadId: string;
  authorId: string;
  text: string;
}): Promise<{ view: SquadView; message: SquadMessage }> {
  const catalog = await ensureCatalog(input.tenantId);
  if (!catalog.squads.some((squad) => squad.id === input.squadId)) throw new SquadNotFoundError(input.squadId);
  if (input.authorId !== catalog.human.id) throw new RejectedInputError("Só o operador envia pelo compositor.");
  const sanitized = sanitizeText(input.text);
  if (!sanitized) throw new RejectedInputError("Mensagem vazia.");
  const injection = detectInjection(sanitized);
  if (injection.blocked) throw new RejectedInputError(`Entrada bloqueada pelo Hemlock (${injection.rule}).`);
  const text = sanitizeOutput(sanitized);
  const roster = [catalog.human, ...catalog.agents];
  const mentions = parseMentions(text, roster);
  if (/@\S/.test(text) && mentions.length === 0) throw new RejectedInputError("Nenhum agente mencionado está neste squad.");
  const classification = classifyLocal(text, "jev");
  const author = catalog.human;

  return sharedQueue.enqueue(input.tenantId, async () => {
    const human: SquadMessage = {
      id: randomUUID(),
      squadId: input.squadId,
      authorId: author.id,
      authorName: author.name,
      role: "human",
      text,
      mentions,
      createdAt: new Date().toISOString(),
      intent: classification.intent,
    };
    const first = await mutateStored(input.tenantId, input.squadId, async (stored) => {
      const targets = resolveTargets(classification.intent, mentions, Object.keys(stored.state.agents), stored.control.handoffAgentIds);
      let state: SquadState = { ...stored.state, ultima_execucao: human.createdAt };
      let control = stored.control;
      if (classification.intent === "kill_switch") {
        await writeKillSwitch(true, "classificador");
        state = { ...state, status: "pausado" };
        control = { ...control, pausedByKill: true };
      }
      const folded = foldHotMessages(state, [...stored.messages, human]);
      const next: StoredSquad = { state: folded.state, messages: folded.messages, control };
      if (folded.summary) {
        const { rememberSummary } = await import("../../agents/memory/vector-store");
        await rememberSummary({ tenantId: input.tenantId, squadId: input.squadId, text: folded.summary }).catch((error: unknown) => {
          console.error("vector store", error);
        });
      }
      return { stored: next, dirty: true, result: { targets, view: await toView(input.tenantId, input.squadId, next, catalog) } };
    });
    publishSquad(input.squadId, first.view);
    if (first.targets.length === 0) {
      await recordUsage(input.tenantId, "prompt", text).catch((error: unknown) => console.error("billing", error));
      return { view: first.view, message: human };
    }
    const turns = await runAgentTurns({
      tenantId: input.tenantId,
      squadId: input.squadId,
      text,
      intent: classification.intent,
      targets: first.targets,
    });
    const names = new Map(roster.map((entry) => [entry.id, entry.name]));
    const view = await mutateStored(input.tenantId, input.squadId, async (stored) => {
      const withNames = applyTurns(stored, turns, classification.intent, input.squadId, names);
      const folded = foldHotMessages(withNames.state, withNames.messages);
      const next: StoredSquad = { state: folded.state, messages: folded.messages, control: withNames.control };
      return { stored: next, dirty: true, result: await toView(input.tenantId, input.squadId, next, catalog) };
    });
    publishSquad(input.squadId, view);
    await recordUsage(input.tenantId, "prompt", text).catch((error: unknown) => console.error("billing", error));
    const completion = turns.map((turn) => turn.text).join("\n");
    await recordUsage(input.tenantId, "completion", completion).catch((error: unknown) => console.error("billing", error));
    return { view, message: human };
  });
}
