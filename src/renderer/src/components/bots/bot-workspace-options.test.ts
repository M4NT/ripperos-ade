import { describe, expect, it } from 'vitest'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { listBotProjects, listBotWorkspaceOptions } from './bot-workspace-options'

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixtures carry only the fields the options builder reads.
const repo = { id: 'r1', displayName: 'Core financeiro' } as Repo
const worktree = (id: string, extra: Partial<Worktree> = {}): Worktree =>
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixtures carry only the fields the options builder reads.
  ({ id, repoId: 'r1', displayName: id, isArchived: false, ...extra }) as Worktree
// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixtures carry only the fields the options builder reads.
const folder = {
  id: 'f1',
  projectGroupId: 'g1',
  name: 'Jurídico',
  isArchived: false
} as FolderWorkspace
// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: fixtures carry only the fields the options builder reads.
const group = { id: 'g1', name: 'Escritório' } as ProjectGroup

describe('listBotWorkspaceOptions', () => {
  it('lists live worktrees and folder workspaces, one project per repo', () => {
    const options = listBotWorkspaceOptions({
      repos: [repo],
      worktreesByRepo: {
        r1: [
          worktree('main', { projectId: 'p1' }),
          worktree('old', { isArchived: true }),
          worktree('feat')
        ]
      },
      folderWorkspaces: [folder],
      projectGroups: [group]
    })
    expect(options).toEqual([
      { workspaceId: 'main', projectId: 'r1', projectName: 'Core financeiro', label: 'main' },
      { workspaceId: 'feat', projectId: 'r1', projectName: 'Core financeiro', label: 'feat' },
      {
        workspaceId: 'folder:f1',
        projectId: 'group:g1',
        projectName: 'Escritório',
        label: 'Jurídico'
      }
    ])
    expect(listBotProjects(options)).toEqual([
      { id: 'r1', name: 'Core financeiro' },
      { id: 'group:g1', name: 'Escritório' }
    ])
  })
})
