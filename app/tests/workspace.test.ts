import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addAgent, createSquad, postSquadMessage, releaseHandoff } from "@core/squads/service";

let directory: string | null = null;

afterEach(async () => {
  delete process.env.RIPPEROS_ROOT;
  if (directory) {
    await rm(directory, { recursive: true, force: true });
    directory = null;
  }
});

describe("workspace real", () => {
  it("cria squad vazio, registra tarefa e devolve handoff", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "ripperos-squad-"));
    process.env.RIPPEROS_ROOT = directory;
    const created = await createSquad("default", "Operação Norte");
    expect(created.messages).toEqual([]);
    expect(created.state.pr_atual).toBeNull();
    expect(created.state.branch.length).toBeGreaterThan(0);
    const withAgent = await addAgent("default", created.squadId, { name: "Nara", role: "Pesquisa" });
    expect(withAgent.roster.some((entry) => entry.name === "Nara")).toBe(true);
    const posted = await postSquadMessage({
      tenantId: "default",
      squadId: created.squadId,
      authorId: "ripper",
      text: "@Nara revisar o relatório",
    });
    const reply = posted.view.messages.find((message) => message.authorName === "Nara");
    expect(reply?.text).toContain("Tarefa registrada");
    expect(posted.view.state.agents.nara?.tarefa_atual).toContain("revisar o relatório");
    const handed = await postSquadMessage({
      tenantId: "default",
      squadId: created.squadId,
      authorId: "ripper",
      text: "@Nara handoff",
    });
    expect(handed.view.control.handoffAgentIds).toContain("nara");
    expect(handed.view.state.agents.nara?.status).toBe("idle");
    const released = await releaseHandoff("default", created.squadId, "nara");
    expect(released.control.handoffAgentIds).not.toContain("nara");
    expect(released.state.agents.nara?.status).toBe("ativo");
  }, 20000);
});
