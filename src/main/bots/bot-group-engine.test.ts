import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Bot } from '../../shared/bot-types'
import { BOT_GROUP_MAX_HOPS } from '../../shared/bot-group-types'
import { BotGroupEngine, type BotGroupTurnInput } from './bot-group-engine'
import { BotGroupStore } from './bot-group-store'

function bot(id: string, name: string): Bot {
  return {
    id,
    projectId: 'p',
    name,
    role: '',
    avatar: 'orange',
    instructions: '',
    agent: 'claude',
    workspaceId: `w-${id}`,
    tokenRipper: true,
    createdAt: 0,
    updatedAt: 0
  }
}

const bots = [bot('valt', 'Valt'), bot('donald', 'Donald'), bot('barriga', 'Sr. Barriga')]
let dir: string
let store: BotGroupStore

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ripperos-engine-'))
  store = new BotGroupStore(join(dir, 'groups.json'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

async function setup(reply: (input: BotGroupTurnInput) => string) {
  const group = await store.createGroup({
    name: 'Os Danadinhos',
    projectId: 'p',
    botIds: bots.map((b) => b.id)
  })
  const calls: BotGroupTurnInput[] = []
  const engine = new BotGroupEngine(
    store,
    () => bots,
    async (input) => {
      calls.push(input)
      return { text: reply(input), providerSessionId: `s-${input.bot.id}` }
    }
  )
  const transcript = (): string[] =>
    store
      .listMessages(group.id)
      .map((m) => (m.author.kind === 'user' ? `user: ${m.text}` : `${m.author.botId}: ${m.text}`))
  return { group, engine, calls, transcript }
}

describe('BotGroupEngine', () => {
  it('asks every bot when nobody is mentioned and hides the ones that pass', async () => {
    const { group, engine, calls, transcript } = await setup((input) =>
      input.bot.id === 'donald' ? 'Tela é comigo.' : '[pass]'
    )
    await engine.sendUserMessage(group.id, 'precisamos refazer a tela')
    expect(calls.map((c) => c.bot.id).sort()).toEqual(['barriga', 'donald', 'valt'])
    expect(calls[0]!.systemPromptAppend).toContain('reply exactly [pass]')
    expect(transcript()).toEqual(['user: precisamos refazer a tela', 'donald: Tela é comigo.'])
  })

  it('asks only the mentioned bot, which may not pass', async () => {
    const { group, engine, calls, transcript } = await setup(() => '[pass]')
    await engine.sendUserMessage(group.id, '@Donald ajusta a tela')
    expect(calls.map((c) => c.bot.id)).toEqual(['donald'])
    expect(calls[0]!.systemPromptAppend).toContain('You were asked directly')
    expect(transcript().at(-1)).toBe('donald: [pass]')
  })

  it('hands off between bots by mention and gives each only what it has not seen', async () => {
    const { group, engine, calls, transcript } = await setup((input) =>
      input.bot.id === 'valt' ? '@Donald faz a tela, eu cuido do rebase.' : 'Fechado, @Valt.'
    )
    await engine.sendUserMessage(group.id, '@Valt organiza o time')
    expect(transcript()).toEqual([
      'user: @Valt organiza o time',
      'valt: @Donald faz a tela, eu cuido do rebase.',
      'donald: Fechado, @Valt.',
      'valt: @Donald faz a tela, eu cuido do rebase.',
      'donald: Fechado, @Valt.',
      'valt: @Donald faz a tela, eu cuido do rebase.',
      'donald: Fechado, @Valt.',
      'valt: @Donald faz a tela, eu cuido do rebase.'
    ])
    // Valt never receives its own lines, and resumes its session after the first turn.
    const valtTurns = calls.filter((c) => c.bot.id === 'valt')
    expect(valtTurns.every((c) => !c.prompt.includes('[@Valt]'))).toBe(true)
    expect(valtTurns[1]!.resumeProviderSessionId).toBe('s-valt')
  })

  it('stops handoffs after the hop budget', async () => {
    const { group, engine, calls } = await setup((input) =>
      input.bot.id === 'valt' ? '@Donald' : '@Valt'
    )
    await engine.sendUserMessage(group.id, '@Valt começa')
    expect(calls).toHaveLength(1 + BOT_GROUP_MAX_HOPS)
  })

  it('posts a warning when a turn fails and keeps the others going', async () => {
    const group = await store.createGroup({ name: 'g', projectId: 'p', botIds: ['valt', 'donald'] })
    const engine = new BotGroupEngine(
      store,
      () => bots,
      async (input) => {
        if (input.bot.id === 'valt') {
          throw new Error('not logged in')
        }
        return { text: 'ok', providerSessionId: null }
      }
    )
    await engine.sendUserMessage(group.id, 'oi')
    const texts = store.listMessages(group.id).map((m) => m.text)
    expect(texts).toContain('⚠️ not logged in')
    expect(texts).toContain('ok')
  })
})
