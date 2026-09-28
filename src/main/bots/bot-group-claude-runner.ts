import { randomUUID } from 'node:crypto'
import type { CanUseTool } from '@anthropic-ai/claude-agent-sdk'
import {
  markClaudeStructuredChildExited,
  markClaudeStructuredChildSpawned
} from '../claude-accounts/live-pty-gate'
import { createClaudeCodeProcessSpawn } from '../claude/claude-agent-sdk-process-spawn'
import { buildClaudeChildProcessEnv } from '../claude/claude-child-process-environment'
import { withoutInheritedClaudeConfigDir } from '../claude/claude-config-dir-pin'
import { CLAUDE_DEFAULT_SETTING_SOURCES } from '../claude/claude-structured-launch-resolution'
import { loadClaudeAgentSdk } from '../claude/claude-stream-json-connection'
import type { BotGroupTurnRunner } from './bot-group-engine'

/** What a group turn borrows from the structured chat runtime: the same workspace and auth resolution. */
export type BotGroupRunnerHost = {
  resolveWorkspacePath: (workspaceId: string) => Promise<string>
  resolveInvocation: () => Promise<{ command: string; env: Record<string, string> }>
}

// Why read-only: nobody can approve an edit mid-group, and a silent write would be worse.
const GROUP_TOOLS = ['Read', 'Glob', 'Grep', 'LS', 'WebSearch', 'WebFetch'] as const
const MAX_TOOL_TURNS = 12

let host: BotGroupRunnerHost | null = null

/** Installed by the structured runtime once its resolvers exist. */
export function registerBotGroupRunnerHost(next: BotGroupRunnerHost | null): void {
  host = next
}

const allowReadOnly: CanUseTool = async (toolName) =>
  GROUP_TOOLS.some((tool) => tool === toolName)
    ? { behavior: 'allow' }
    : {
        behavior: 'deny',
        message: 'Group chat is read-only. Ask the user to run this in your own chat.'
      }

function bareWorkspaceId(value: string): string {
  return value.replace(/^(worktree|folder):/, '')
}

export const runClaudeGroupTurn: BotGroupTurnRunner = async (input) => {
  if (!host) {
    throw new Error(
      'Claude chat is not ready. Turn on the structured native chat in Settings → Experimental.'
    )
  }
  if (!input.bot.workspaceId) {
    throw new Error(`${input.bot.name} has no workspace.`)
  }
  if (input.bot.agent !== 'claude') {
    throw new Error(
      `${input.bot.name} uses ${input.bot.agent}; group chat supports Claude bots only for now.`
    )
  }
  const cwd = await host.resolveWorkspacePath(bareWorkspaceId(input.bot.workspaceId))
  const { command, env } = await host.resolveInvocation()
  const { query } = await loadClaudeAgentSdk()
  const spawner = createClaudeCodeProcessSpawn()
  const gateKey = randomUUID()
  markClaudeStructuredChildSpawned(gateKey)
  try {
    const session = query({
      prompt: input.prompt,
      options: {
        cwd,
        // Why env is never omitted: the SDK would otherwise inherit ambient ANTHROPIC_* auth.
        env: buildClaudeChildProcessEnv(env, {
          inheritedEnv: withoutInheritedClaudeConfigDir(process.env),
          scrubConfiguredChildSessionStamps: true
        }),
        pathToClaudeCodeExecutable: command,
        spawnClaudeCodeProcess: spawner.spawn,
        systemPrompt: { type: 'preset', preset: 'claude_code', append: input.systemPromptAppend },
        settingSources: [...CLAUDE_DEFAULT_SETTING_SOURCES],
        allowedTools: [...GROUP_TOOLS],
        canUseTool: allowReadOnly,
        maxTurns: MAX_TOOL_TURNS,
        ...(input.resumeProviderSessionId ? { resume: input.resumeProviderSessionId } : {})
      }
    })
    let providerSessionId: string | null = null
    for await (const message of session) {
      if ('session_id' in message && typeof message.session_id === 'string') {
        providerSessionId = message.session_id
      }
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          return { text: message.result, providerSessionId }
        }
        throw new Error(`Claude stopped: ${message.subtype}`)
      }
    }
    throw new Error('Claude ended without a reply.')
  } finally {
    markClaudeStructuredChildExited(gateKey)
  }
}
