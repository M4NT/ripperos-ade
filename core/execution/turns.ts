import type { Intent } from "../types";
import { compactPayload } from "../optimization/token-ripper";
import { searchMemory } from "../../agents/memory/vector-store";
import { runNamedTool, toolsInText, type ToolOutcome } from "./tools";

export interface AgentTurn {
  agentId: string;
  text: string;
  tool: string | null;
  status: "ok" | "recusado" | "erro";
  task: string | null;
  idle: boolean;
  blocked: boolean;
  memoryHits: string[] | null;
}

function taskOf(text: string): string {
  return compactPayload(text).replace(/\s+/g, " ").slice(0, 80);
}

function fromOutcome(agentId: string, outcome: ToolOutcome, blocked: boolean): AgentTurn {
  return {
    agentId,
    text: outcome.summary,
    tool: outcome.tool,
    status: outcome.status,
    task: taskOf(outcome.summary),
    idle: false,
    blocked,
    memoryHits: outcome.memoryHits,
  };
}

async function runMemory(tenantId: string, text: string): Promise<ToolOutcome> {
  try {
    const hits = await searchMemory(tenantId, text, 3);
    const memoryHits = hits.map((hit) => hit.text);
    return {
      status: "ok",
      tool: "memory.search",
      summary: memoryHits.length > 0 ? memoryHits.join("\n") : "A memória deste tenant ainda não tem resumo.",
      memoryHits,
    };
  } catch (error) {
    const summary = error instanceof Error ? error.message : "Falha ao consultar a memória.";
    return { status: "erro", tool: "memory.search", summary, memoryHits: null };
  }
}

export async function runAgentTurns(input: {
  tenantId: string;
  squadId: string;
  text: string;
  intent: Intent;
  targets: string[];
}): Promise<AgentTurn[]> {
  const actors = input.intent === "chat" || input.intent === "handoff" ? input.targets : input.targets.slice(0, 1);
  const turns: AgentTurn[] = [];
  for (const agentId of actors) {
    if (input.intent === "handoff") {
      turns.push({
        agentId,
        text: "Handoff aceito. Fico idle até você devolver o controle.",
        tool: null,
        status: "ok",
        task: taskOf(input.text),
        idle: true,
        blocked: false,
        memoryHits: null,
      });
      continue;
    }
    if (input.intent === "chat") {
      const task = taskOf(input.text);
      turns.push({
        agentId,
        text: `Tarefa registrada: ${task}`,
        tool: null,
        status: "ok",
        task,
        idle: false,
        blocked: false,
        memoryHits: null,
      });
      continue;
    }
    if (input.intent === "memory_query") {
      turns.push(fromOutcome(agentId, await runMemory(input.tenantId, input.text), false));
      continue;
    }
    if (input.intent === "financial_approval" && toolsInText(input.text).length === 0) {
      turns.push({
        agentId,
        text: "Pedido financeiro registrado. Nenhuma transação sai sem a ferramenta e um approvalToken.",
        tool: null,
        status: "recusado",
        task: taskOf(input.text),
        idle: false,
        blocked: true,
        memoryHits: null,
      });
      continue;
    }
    try {
      const outcome = await runNamedTool({ tenantId: input.tenantId, squadId: input.squadId, text: input.text });
      turns.push(fromOutcome(agentId, outcome, outcome.summary.includes("approvalToken")));
    } catch (error) {
      const summary = error instanceof Error ? error.message : "Falha ao executar a ferramenta.";
      turns.push(fromOutcome(agentId, { status: "erro", tool: null, summary, memoryHits: null }, false));
    }
  }
  return turns;
}
