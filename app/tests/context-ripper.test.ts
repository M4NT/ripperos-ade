import { describe, expect, it } from "vitest";
import { foldHotMessages, HOT_MESSAGE_LIMIT, KEEP_RECENT } from "@core/optimization/context-ripper";
import { compactMessages, estimateTokens } from "@core/optimization/token-ripper";
import type { SquadMessage, SquadState } from "@core/types";

const state: SquadState = {
  squad: "os_danadinhos",
  status: "ativo",
  branch: "master",
  pr_atual: "24",
  ultima_execucao: null,
  agents: {},
};

function message(id: string): SquadMessage {
  return {
    id,
    squadId: "os-danadinhos",
    authorId: "valt",
    authorName: "Valt",
    role: "agent",
    text: `nota ${id}`,
    mentions: [],
    createdAt: "2024-03-14T14:20:00.000Z",
  };
}

describe("Context the Ripper", () => {
  it("mantém o transcript quente abaixo do limite", () => {
    const messages = Array.from({ length: HOT_MESSAGE_LIMIT }, (_, index) => message(`m${index}`));
    const folded = foldHotMessages(state, messages);
    expect(folded.summary).toBeNull();
    expect(folded.messages).toHaveLength(HOT_MESSAGE_LIMIT);
  });

  it("arquiva o excedente e tira o texto cru do contexto ativo", () => {
    const messages = Array.from({ length: HOT_MESSAGE_LIMIT + 3 }, (_, index) => message(`m${index}`));
    const folded = foldHotMessages(state, messages);
    expect(folded.messages).toHaveLength(KEEP_RECENT);
    expect(folded.messages.map((item) => item.id)).toEqual(["m7", "m8", "m9", "m10"]);
    expect(folded.state.resumo).toContain("Valt: nota m0");
    expect(folded.summary).toContain("nota m0");
    expect(folded.messages.some((item) => item.id === "m0")).toBe(false);
  });
});

describe("Token the Ripper", () => {
  it("remove duplicatas, linhas já resumidas e estima tokens", () => {
    const compacted = compactMessages([
      { text: "linha   repetida\nlinha repetida" },
      { text: "linha repetida", summarized: true },
      { text: "fecha o PR" },
    ]);
    expect(compacted.dropped).toBe(1);
    expect(compacted.text).toBe("linha repetida\nfecha o PR");
    expect(estimateTokens("abcd")).toBe(1);
    expect(compacted.tokens).toBeGreaterThan(0);
  });
});
