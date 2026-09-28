import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BotGroupStore } from './bot-group-store'

let dir: string
let file: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ripperos-groups-'))
  file = join(dir, 'ripperos-bot-groups.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('BotGroupStore', () => {
  it('persists groups, messages and member sessions across reloads', async () => {
    const store = new BotGroupStore(file)
    const group = await store.createGroup({
      name: 'Os Danadinhos',
      projectId: 'p1',
      botIds: ['a', 'b']
    })
    const message = await store.appendMessage(group.id, { kind: 'user' }, 'oi time')
    await store.setMemberSession(group.id, 'a', {
      providerSessionId: 's1',
      lastSeenMessageId: message.id
    })

    const reloaded = new BotGroupStore(file)
    expect(reloaded.getGroup(group.id)?.name).toBe('Os Danadinhos')
    expect(reloaded.listMessages(group.id).map((m) => m.text)).toEqual(['oi time'])
    expect(reloaded.getMemberSession(group.id, 'a')).toEqual({
      providerSessionId: 's1',
      lastSeenMessageId: message.id
    })
  })

  it('refuses groups without a name or with fewer than two bots', async () => {
    const store = new BotGroupStore(file)
    await expect(
      store.createGroup({ name: ' ', projectId: 'p', botIds: ['a', 'b'] })
    ).rejects.toThrow('name')
    await expect(store.createGroup({ name: 'x', projectId: 'p', botIds: ['a'] })).rejects.toThrow(
      'two bots'
    )
  })

  it('returns only the messages a member has not seen', async () => {
    const store = new BotGroupStore(file)
    const group = await store.createGroup({ name: 'g', projectId: 'p', botIds: ['a', 'b'] })
    const first = await store.appendMessage(group.id, { kind: 'user' }, 'um')
    await store.appendMessage(group.id, { kind: 'bot', botId: 'b' }, 'dois')
    expect(store.unseenMessages(group.id, 'a').map((m) => m.text)).toEqual(['um', 'dois'])
    await store.setMemberSession(group.id, 'a', {
      providerSessionId: null,
      lastSeenMessageId: first.id
    })
    expect(store.unseenMessages(group.id, 'a').map((m) => m.text)).toEqual(['dois'])
  })

  it('caps history per group and removes everything with the group', async () => {
    const store = new BotGroupStore(file, Date.now, 3)
    const group = await store.createGroup({ name: 'g', projectId: 'p', botIds: ['a', 'b'] })
    for (let i = 0; i < 5; i++) {
      await store.appendMessage(group.id, { kind: 'user' }, `m${i}`)
    }
    expect(store.listMessages(group.id).map((m) => m.text)).toEqual(['m2', 'm3', 'm4'])
    await store.removeGroup(group.id)
    expect(store.listGroups()).toEqual([])
    expect(store.listMessages(group.id)).toEqual([])
  })
})
