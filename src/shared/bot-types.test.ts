import { describe, expect, it } from 'vitest'
import {
  BOT_NAME_MAX_LENGTH,
  buildBotSystemPromptAppend,
  parseStoredBot,
  type Bot
} from './bot-types'

const base: Bot = {
  id: 'b1',
  projectId: 'p1',
  name: 'Sr. Barriga',
  role: 'Arquiteto de Software',
  avatar: 'blue',
  instructions: 'Revise arquitetura antes de codar.',
  agent: 'claude',
  workspaceId: 'w1',
  tokenRipper: true,
  createdAt: 1,
  updatedAt: 2
}

describe('parseStoredBot', () => {
  it('round-trips a valid record', () => {
    expect(parseStoredBot(JSON.parse(JSON.stringify(base)))).toEqual(base)
  })

  it('rejects records without id, project or name', () => {
    expect(parseStoredBot(null)).toBeNull()
    expect(parseStoredBot({ ...base, id: '' })).toBeNull()
    expect(parseStoredBot({ ...base, projectId: 7 })).toBeNull()
    expect(parseStoredBot({ ...base, name: '   ' })).toBeNull()
  })

  it('repairs unknown avatars, long names and missing flags', () => {
    const parsed = parseStoredBot({
      ...base,
      avatar: 'neon',
      name: 'x'.repeat(BOT_NAME_MAX_LENGTH + 10),
      tokenRipper: undefined,
      workspaceId: ''
    })
    expect(parsed?.avatar).toBe('orange')
    expect(parsed?.name).toHaveLength(BOT_NAME_MAX_LENGTH)
    expect(parsed?.tokenRipper).toBe(true)
    expect(parsed?.workspaceId).toBeNull()
  })
})

describe('buildBotSystemPromptAppend', () => {
  it('states identity, instructions and the terse-output directive', () => {
    const text = buildBotSystemPromptAppend(base)
    expect(text).toContain('You are Sr. Barriga, acting as Arquiteto de Software.')
    expect(text).toContain('Revise arquitetura antes de codar.')
    expect(text).toContain('Response style:')
  })

  it('omits the directive when token-ripper is off and the role when empty', () => {
    const text = buildBotSystemPromptAppend({ ...base, role: '', tokenRipper: false })
    expect(text.startsWith('You are Sr. Barriga.')).toBe(true)
    expect(text).not.toContain('Response style:')
  })
})
