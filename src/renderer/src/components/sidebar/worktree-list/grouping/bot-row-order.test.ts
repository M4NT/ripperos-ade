import { describe, expect, it } from 'vitest'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { orderBotOwnedRowsFirst } from './bot-row-order'
import type { GroupHeaderRow, Row, WorktreeRow } from './row-types'

function item(id: string, sectionKey: string, depth = 0): WorktreeRow {
  return {
    type: 'item',
    rowKey: id,
    sectionKey,
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: ordering reads only the worktree id.
    worktree: { id } as Worktree,
    repo: undefined,
    depth,
    groupDepth: 0,
    lineageTrail: [],
    isLastLineageChild: false,
    lineageChildCount: 0
  }
}

function header(key: string): GroupHeaderRow {
  return { type: 'header', key, label: key, count: 0, tone: '' }
}

const keys = (rows: Row[]): string[] =>
  rows.map((row) =>
    row.type === 'item' ? row.rowKey : row.type === 'header' ? `#${row.key}` : '?'
  )

describe('orderBotOwnedRowsFirst', () => {
  it('lifts bot-owned workspaces per section and keeps lineage children attached', () => {
    const rows: Row[] = [
      header('a'),
      item('plain', 'a'),
      item('plain-child', 'a', 1),
      item('bot', 'a'),
      item('bot-child', 'a', 1),
      header('b'),
      item('b-plain', 'b'),
      item('b-bot', 'b')
    ]
    const owned = new Set(['bot', 'b-bot'])
    expect(keys(orderBotOwnedRowsFirst(rows, (id) => owned.has(id)))).toEqual([
      '#a',
      'bot',
      'bot-child',
      'plain',
      'plain-child',
      '#b',
      'b-bot',
      'b-plain'
    ])
  })

  it('leaves rows untouched when no bot owns a workspace', () => {
    const rows: Row[] = [header('a'), item('x', 'a'), item('y', 'a')]
    expect(orderBotOwnedRowsFirst(rows, () => false)).toEqual(rows)
  })
})
