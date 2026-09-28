import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { connect } from "@lancedb/lancedb";
import { embedText, rememberSummary, searchMemory, setLanceConnect } from "@agents/memory/vector-store";

setLanceConnect((uri) => connect(uri));

let directory: string | null = null;

afterEach(async () => {
  delete process.env.RIPPEROS_ROOT;
  if (directory) {
    await rm(directory, { recursive: true, force: true });
    directory = null;
  }
});

describe("vector store por tenant", () => {
  it("normaliza o embedding", () => {
    const vector = embedText("retry repasse saque");
    expect(vector).toHaveLength(64);
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("grava o resumo no LanceDB do tenant e recupera por busca", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "ripperos-memory-"));
    process.env.RIPPEROS_ROOT = directory;
    const text = "Valt: retry do repasse CANCELLED validação de saque";
    await rememberSummary({ tenantId: "default", squadId: "os-danadinhos", text, id: "sum-1" });
    const hits = await searchMemory("default", "validação de saque", 3);
    expect(hits.some((hit) => hit.id === "sum-1" && hit.text === text)).toBe(true);
    expect(hits[0]?.squadId).toBe("os-danadinhos");
  });
});
