import type { Intent } from "../types";

export interface Classification {
  intent: Intent;
  confidence: number;
  adapter: "jev" | "laya";
}

export interface ClassifierAdapter {
  readonly name: "jev" | "laya";
  classify(text: string): Classification;
}

interface Rule {
  intent: Intent;
  weight: number;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    intent: "kill_switch",
    weight: 0.97,
    patterns: [/kill switch/i, /\bpare tudo\b/i, /abortar opera/i, /interromper o squad/i],
  },
  {
    intent: "handoff",
    weight: 0.91,
    patterns: [/\bhandoff\b/i, /assumir (o )?controle/i, /passa pra (mim|humano)/i, /humano na fila/i],
  },
  {
    intent: "financial_approval",
    weight: 0.88,
    patterns: [/\bsaque\b/i, /\bpagamento\b/i, /transfer[eê]ncia/i, /\bomie\b/i, /cr[eé]dito externo/i],
  },
  {
    intent: "tool_call",
    weight: 0.84,
    patterns: [
      /\bmcp\b/i,
      /executa a ferramenta/i,
      /memory\.search/i,
      /memory\.write/i,
      /github\.read/i,
      /github\.comment/i,
      /browser\.navigate/i,
      /browser\.snapshot/i,
      /omie\.consultar/i,
    ],
  },
  {
    intent: "memory_query",
    weight: 0.8,
    patterns: [/mem[oó]ria/i, /o que ficou/i, /state\.json/i, /\blembr/i],
  },
];

export function classifyLocal(text: string, adapter: "jev" | "laya" = "jev"): Classification {
  const normalized = text.normalize("NFKC");
  let best: Classification = { intent: "chat", confidence: 0.55, adapter };
  for (const rule of RULES) {
    const hits = rule.patterns.filter((pattern) => pattern.test(normalized)).length;
    if (hits === 0) continue;
    const confidence = Math.min(0.99, rule.weight + (hits - 1) * 0.02);
    if (confidence > best.confidence) {
      best = { intent: rule.intent, confidence, adapter };
    }
  }
  return best;
}

export const jevAdapter: ClassifierAdapter = {
  name: "jev",
  classify(text) {
    return classifyLocal(text, "jev");
  },
};

export const layaAdapter: ClassifierAdapter = {
  name: "laya",
  classify(text) {
    return classifyLocal(text, "laya");
  },
};
