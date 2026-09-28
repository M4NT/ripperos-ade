import { describe, expect, it } from 'vitest'
import {
  isPassReply,
  parseBotMentions,
  parseStoredBotGroupMessage,
  routeBotReply,
  routeUserMessage
} from './bot-group-types'

const members = [
  { id: 'valt', name: 'Valt' },
  { id: 'donald', name: 'Donald' },
  { id: 'barriga', name: 'Sr. Barriga' }
]

describe('parseBotMentions', () => {
  it('finds mentions in order, case-insensitively, including names with spaces', () => {
    expect(parseBotMentions('@donald e @Sr. Barriga, vejam com @Valt', members)).toEqual([
      'donald',
      'barriga',
      'valt'
    ])
  })

  it('needs a word boundary after the name and ignores plain names', () => {
    expect(parseBotMentions('@Valteiro e Valt sem arroba', members)).toEqual([])
    expect(parseBotMentions('fala @Valt!', members)).toEqual(['valt'])
  })

  it('does not read "@Sr. Barriga" as a shorter overlapping name', () => {
    const withSr = [...members, { id: 'sr', name: 'Sr' }]
    expect(parseBotMentions('@Sr. Barriga', withSr)).toEqual(['barriga'])
  })
})

describe('routeUserMessage', () => {
  it('sends an unmentioned message to everyone, who may pass', () => {
    expect(routeUserMessage('bom dia time', members)).toEqual({
      recipients: ['valt', 'donald', 'barriga'],
      mayPass: true
    })
  })

  it('sends a mentioned message only to the mentioned bots, who must answer', () => {
    expect(routeUserMessage('@Donald ajusta a tela', members)).toEqual({
      recipients: ['donald'],
      mayPass: false
    })
  })
})

describe('routeBotReply', () => {
  it('hands off to mentioned members but never back to the author', () => {
    expect(routeBotReply('@Donald fecha isso, @Valt eu sigo', 'valt', members)).toEqual(['donald'])
  })
})

describe('isPassReply', () => {
  it('accepts the pass token with surrounding whitespace only', () => {
    expect(isPassReply('  [PASS] \n')).toBe(true)
    expect(isPassReply('[pass] mas...')).toBe(false)
  })
})

describe('parseStoredBotGroupMessage', () => {
  it('keeps user and bot authors and drops malformed ones', () => {
    const base = { id: 'm1', groupId: 'g1', text: 'oi', createdAt: 1 }
    expect(parseStoredBotGroupMessage({ ...base, author: { kind: 'user' } })?.author).toEqual({
      kind: 'user'
    })
    expect(
      parseStoredBotGroupMessage({ ...base, author: { kind: 'bot', botId: 'valt' } })?.author
    ).toEqual({ kind: 'bot', botId: 'valt' })
    expect(parseStoredBotGroupMessage({ ...base, author: { kind: 'bot' } })).toBeNull()
  })
})
