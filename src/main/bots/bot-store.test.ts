import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BotStore } from './bot-store'

let dir: string
let file: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ripperos-bots-'))
  file = join(dir, 'ripperos-bots.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('BotStore', () => {
  it('creates, updates and removes bots, persisting each change', async () => {
    const store = new BotStore(file, () => 100)
    const bot = await store.create({
      projectId: 'p1',
      name: ' Valt ',
      role: 'Financeiro',
      workspaceId: 'w1'
    })
    expect(bot).toMatchObject({
      name: 'Valt',
      avatar: 'orange',
      tokenRipper: true,
      workspaceId: 'w1'
    })

    const updated = await store.update(bot.id, { role: 'Core financeiro', tokenRipper: false })
    expect(updated).toMatchObject({ role: 'Core financeiro', tokenRipper: false, name: 'Valt' })
    expect(new BotStore(file).get(bot.id)).toEqual(updated)

    await store.remove(bot.id)
    expect(new BotStore(file).list()).toEqual([])
  })

  it('refuses a bot without a name or project', async () => {
    const store = new BotStore(file)
    await expect(store.create({ projectId: 'p1', name: '  ', role: '' })).rejects.toThrow('name')
    await expect(store.create({ projectId: '', name: 'Valt', role: '' })).rejects.toThrow('project')
  })

  it('finds the bot that owns a workspace', async () => {
    const store = new BotStore(file)
    const bot = await store.create({ projectId: 'p1', name: 'Donald', role: '', workspaceId: 'w9' })
    expect(store.findByWorkspace('w9')?.id).toBe(bot.id)
    expect(store.findByWorkspace('other')).toBeNull()
  })

  it('matches sidebar folder keys against the bare ids sessions carry', async () => {
    const store = new BotStore(file)
    const bot = await store.create({
      projectId: 'p1',
      name: 'Jurídico',
      role: '',
      workspaceId: 'folder:f1'
    })
    expect(store.findByWorkspace('f1')?.id).toBe(bot.id)
    expect(store.findByWorkspace('folder:f1')?.id).toBe(bot.id)
    expect(store.findByWorkspace('f2')).toBeNull()
  })

  it('notifies listeners after a committed change', async () => {
    const store = new BotStore(file)
    const seen: number[] = []
    store.onChange((bots) => seen.push(bots.length))
    await store.create({ projectId: 'p1', name: 'Donald', role: '' })
    expect(seen).toEqual([1])
  })

  it('prunes bots whose project is gone', async () => {
    const store = new BotStore(file)
    await store.create({ projectId: 'keep', name: 'A', role: '' })
    await store.create({ projectId: 'gone', name: 'B', role: '' })
    await store.pruneProjects(new Set(['keep']))
    expect(store.list().map((bot) => bot.name)).toEqual(['A'])
  })

  it('starts empty from a corrupt file and replaces it on the next write', async () => {
    writeFileSync(file, '{not json')
    const store = new BotStore(file)
    expect(store.list()).toEqual([])
    await store.create({ projectId: 'p1', name: 'Valt', role: '' })
    expect(JSON.parse(readFileSync(file, 'utf8')).bots).toHaveLength(1)
  })
})
