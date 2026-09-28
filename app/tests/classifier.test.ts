import { describe, expect, it } from "vitest";
import { classifyLocal, layaAdapter } from "@core/router/classifier";

describe("classificador local", () => {
  it("reconhece kill switch, handoff, financeiro, ferramenta, memória e chat", () => {
    expect(classifyLocal("pare tudo agora").intent).toBe("kill_switch");
    expect(classifyLocal("preciso de handoff humano").intent).toBe("handoff");
    expect(classifyLocal("validação de saque no Omie").intent).toBe("financial_approval");
    expect(classifyLocal("executa a ferramenta github.read").intent).toBe("tool_call");
    expect(classifyLocal("o que ficou na memória?").intent).toBe("memory_query");
    expect(classifyLocal("bom dia, squad").intent).toBe("chat");
  });

  it("entrega confiança maior que o fallback de chat e marca o adaptador", () => {
    const result = layaAdapter.classify("kill switch");
    expect(result.adapter).toBe("laya");
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});
