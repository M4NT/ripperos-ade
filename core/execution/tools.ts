import { BrowserPool } from "../../browser-cluster/manager";
import { rememberSummary, searchMemory } from "../../agents/memory/vector-store";
import { FINANCIAL_TOOLS, MCP_ALLOWLIST, guardMcpCall } from "../security/hemlock";
import { readGitSnapshot } from "../workspace/git-snapshot";
import { captureCommand } from "../workspace/spawn-capture";

export interface ToolOutcome {
  status: "ok" | "recusado" | "erro";
  tool: string | null;
  summary: string;
  memoryHits: string[] | null;
}

const TOOL_NAMES = [...MCP_ALLOWLIST, ...FINANCIAL_TOOLS];
const pool = new BrowserPool();

export function toolsInText(text: string): string[] {
  const lower = text.toLowerCase();
  return TOOL_NAMES.filter((name) => lower.includes(name.toLowerCase()));
}

export function approvalTokenFrom(text: string): string | null {
  const match = text.match(/\b(?:approvalToken|approval)[:= ]+([A-Za-z0-9._~-]{16,128})\b/);
  return match?.[1] ?? null;
}

function clip(text: string, max = 1200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

async function readRepository(): Promise<ToolOutcome> {
  const git = await readGitSnapshot();
  if (!git.head && git.branch === "local") {
    return { status: "erro", tool: "github.read", summary: "O git local não respondeu neste diretório.", memoryHits: null };
  }
  const status = git.status.split("\n").filter(Boolean).slice(0, 8).join("\n");
  const summary = [`branch ${git.branch}`, git.head, status].filter(Boolean).join("\n");
  return { status: "ok", tool: "github.read", summary, memoryHits: null };
}

async function probeBrowser(tool: "browser.navigate" | "browser.snapshot"): Promise<ToolOutcome> {
  const draft = {
    id: "ripper-browser-9222",
    cdpPort: 9222,
    image: "ripperos-browser:local",
    display: ":99",
  };
  const docker = await captureCommand("docker", ["version", "--format", "{{.Server.Version}}"], 4000);
  const command = `docker ${pool.dockerRunArgs(draft).join(" ")}`;
  const daemon = docker.code === 0 ? `Docker ${docker.stdout || "ok"}` : "Docker indisponível";
  return {
    status: docker.code === 0 ? "ok" : "erro",
    tool,
    summary: clip(`${daemon}. Nenhum container foi iniciado. ${command}`),
    memoryHits: null,
  };
}

export async function runNamedTool(input: {
  tenantId: string;
  squadId: string;
  text: string;
}): Promise<ToolOutcome> {
  const tool = toolsInText(input.text)[0] ?? null;
  if (!tool) {
    return {
      status: "recusado",
      tool: null,
      summary: "Nenhuma ferramenta nomeada. Use memory.search, memory.write, github.read ou outra da allowlist.",
      memoryHits: null,
    };
  }
  const decision = guardMcpCall({ name: tool, approvalToken: approvalTokenFrom(input.text) });
  if (!decision.allowed) {
    return { status: "recusado", tool, summary: decision.reason, memoryHits: null };
  }
  if (tool === "memory.search") {
    const hits = await searchMemory(input.tenantId, input.text, 3);
    const memoryHits = hits.map((hit) => hit.text);
    const summary = memoryHits.length > 0 ? memoryHits.join("\n") : "A memória deste tenant ainda não tem resumo.";
    return { status: "ok", tool, summary, memoryHits };
  }
  if (tool === "memory.write") {
    const record = await rememberSummary({ tenantId: input.tenantId, squadId: input.squadId, text: input.text });
    return { status: "ok", tool, summary: `Gravado na memória: ${clip(record.text, 240)}`, memoryHits: [record.text] };
  }
  if (tool === "github.read") return readRepository();
  if (tool === "github.comment") {
    return {
      status: "recusado",
      tool,
      summary: "Este host não publica comentário no remoto. github.read lê o git local.",
      memoryHits: null,
    };
  }
  if (tool === "browser.navigate" || tool === "browser.snapshot") return probeBrowser(tool);
  if (tool === "omie.consultar" || tool === "omie.pagar" || tool === "omie.transferir" || tool === "saque.executar") {
    return {
      status: "recusado",
      tool,
      summary: "O Hemlock aceitou a chamada, mas não há conector Omie neste host. Nenhum valor foi movimentado.",
      memoryHits: null,
    };
  }
  return { status: "recusado", tool, summary: "Ferramenta sem executor neste host.", memoryHits: null };
}
