import type { BotGroup } from '../../../../../../shared/bot-group-types'
import type { GroupHeaderRow, Row } from './row-types'

/**
 * Within each section, lift top-level workspaces a bot owns above the rest, keeping each one's
 * lineage descendants attached and preserving the existing order inside both partitions.
 */
export function orderBotOwnedRowsFirst(
  rows: readonly Row[],
  isBotOwned: (worktreeId: string) => boolean
): Row[] {
  const out: Row[] = []
  let cursor = 0
  while (cursor < rows.length) {
    const row = rows[cursor]!
    if (row.type !== 'item') {
      out.push(row)
      cursor++
      continue
    }
    // Collect this section's contiguous run of item rows, as blocks of a top-level row + descendants.
    const sectionKey = row.sectionKey
    const owned: Row[][] = []
    const rest: Row[][] = []
    while (cursor < rows.length) {
      const head = rows[cursor]!
      if (head.type !== 'item' || head.sectionKey !== sectionKey) {
        break
      }
      const block: Row[] = [head]
      cursor++
      while (cursor < rows.length) {
        const next = rows[cursor]!
        if (next.type !== 'item' || next.sectionKey !== sectionKey || next.depth <= head.depth) {
          break
        }
        block.push(next)
        cursor++
      }
      ;(isBotOwned(head.worktree.id) ? owned : rest).push(block)
    }
    for (const block of [...owned, ...rest]) {
      out.push(...block)
    }
  }
  return out
}

function headerProjectId(row: GroupHeaderRow): string | null {
  if (row.repo) {
    return row.repo.id
  }
  return row.projectGroup?.id ? `group:${row.projectGroup.id}` : null
}

/** Lists each project's group chats right under its header, unless the project is collapsed. */
export function insertBotGroupRows(
  rows: readonly Row[],
  groups: readonly Pick<BotGroup, 'id' | 'projectId'>[],
  collapsedKeys: ReadonlySet<string>
): Row[] {
  const out: Row[] = []
  for (const row of rows) {
    out.push(row)
    if (row.type !== 'header' || collapsedKeys.has(row.key)) {
      continue
    }
    const projectId = headerProjectId(row)
    if (!projectId) {
      continue
    }
    for (const group of groups) {
      if (group.projectId === projectId) {
        out.push({
          type: 'bot-group',
          key: `bot-group:${group.id}`,
          groupId: group.id,
          sectionKey: row.key
        })
      }
    }
  }
  return out
}
