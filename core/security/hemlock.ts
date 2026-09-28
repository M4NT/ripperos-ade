export const MCP_ALLOWLIST = [
  "github.read",
  "github.comment",
  "memory.search",
  "memory.write",
  "browser.navigate",
  "browser.snapshot",
  "omie.consultar",
] as const;

export const FINANCIAL_TOOLS = ["omie.pagar", "omie.transferir", "saque.executar"] as const;

const ALLOWED = new Set<string>(MCP_ALLOWLIST);
const FINANCIAL = new Set<string>(FINANCIAL_TOOLS);
const APPROVAL_TOKEN = /^[A-Za-z0-9._~-]{16,128}$/;

const INJECTION_RULES: { id: string; pattern: RegExp }[] = [
  { id: "ignore-previous", pattern: /ignore (all |any )?(previous|prior|above) instructions/i },
  { id: "ignore-pt", pattern: /ignor[ae] todas as instru[cç][oõ]es/i },
  { id: "system-prompt", pattern: /system prompt/i },
  { id: "you-are-now", pattern: /you are now/i },
  { id: "system-tag", pattern: /<\s*\/?\s*system\s*>/i },
  { id: "jailbreak", pattern: /\bjailbreak\b/i },
  { id: "do-anything-now", pattern: /do anything now/i },
];

export interface InjectionScan {
  blocked: boolean;
  rule: string | null;
}

export interface McpDecision {
  allowed: boolean;
  reason: string;
}

export function sanitizeText(input: string, maxChars = 8000): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxChars);
}

export function sanitizeOutput(input: string, maxChars = 8000): string {
  const withoutScripts = sanitizeText(input, maxChars)
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*\/?\s*(system|assistant|tool)\s*>/gi, "");
  return withoutScripts.trim();
}

export function detectInjection(input: string): InjectionScan {
  for (const rule of INJECTION_RULES) {
    if (rule.pattern.test(input)) {
      return { blocked: true, rule: rule.id };
    }
  }
  return { blocked: false, rule: null };
}

export function guardMcpCall(call: { name: string; approvalToken?: string | null }): McpDecision {
  if (FINANCIAL.has(call.name)) {
    if (!call.approvalToken || !APPROVAL_TOKEN.test(call.approvalToken)) {
      return { allowed: false, reason: "Transação financeira exige approvalToken humano." };
    }
    return { allowed: true, reason: "Aprovação humana presente." };
  }
  if (!ALLOWED.has(call.name)) {
    return { allowed: false, reason: "Ferramenta fora da allowlist do Hemlock." };
  }
  return { allowed: true, reason: "Ferramenta permitida." };
}
