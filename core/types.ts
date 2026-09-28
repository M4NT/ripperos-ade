export type AgentStatus = "ativo" | "idle";
export type SquadStatus = "ativo" | "pausado";
export type Intent =
  | "chat"
  | "handoff"
  | "financial_approval"
  | "tool_call"
  | "kill_switch"
  | "memory_query";
export type ParticipantKind = "human" | "agent";
export type Tone = "orange" | "ink" | "blue" | "stone";

export interface AgentSnapshot {
  status: AgentStatus;
  tarefa_atual: string | null;
  bloqueado: boolean;
}

export interface SquadState {
  squad: string;
  status: SquadStatus;
  branch: string;
  pr_atual: string | null;
  ultima_execucao: string | null;
  agents: Record<string, AgentSnapshot>;
  resumo?: string;
}

export interface SquadMessage {
  id: string;
  squadId: string;
  authorId: string;
  authorName: string;
  role: ParticipantKind;
  text: string;
  mentions: string[];
  createdAt: string;
  intent?: Intent;
}

export interface ExecutionRecord {
  id: string;
  at: string;
  agentId: string;
  tool: string | null;
  status: "ok" | "recusado" | "erro";
  summary: string;
}

export interface SquadControl {
  handoffAgentIds: string[];
  pausedByKill: boolean;
  lastMemoryHits: string[];
  executions: ExecutionRecord[];
}

export interface KillSwitchState {
  engaged: boolean;
  updatedAt: string | null;
  reason: string | null;
}

export interface RosterEntry {
  id: string;
  name: string;
  role: string;
  kind: ParticipantKind;
  tone: Tone;
}

export interface SquadView {
  tenantId: string;
  squadId: string;
  title: string;
  state: SquadState;
  messages: SquadMessage[];
  control: SquadControl;
  killSwitch: KillSwitchState;
  roster: RosterEntry[];
  tools: {
    allowed: string[];
    financial: string[];
  };
}

export interface StoredSquad {
  state: SquadState;
  messages: SquadMessage[];
  control: SquadControl;
}

export interface SquadSummary {
  id: string;
  title: string;
  status: SquadStatus;
  agentCount: number;
  ultimaExecucao: string | null;
}

export interface WorkspaceHome {
  tenantId: string;
  human: RosterEntry;
  squads: SquadSummary[];
  billing: {
    promptTokens: number;
    completionTokens: number;
    total: number;
  };
  killSwitch: KillSwitchState;
  tools: {
    allowed: string[];
    financial: string[];
  };
}
