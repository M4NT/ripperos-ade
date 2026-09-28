import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { folderWorkspaceKey } from '../../../../shared/workspace-scope'

export type BotWorkspaceOption = {
  /** Sidebar workspace key: a worktree id or `folder:<id>`. */
  workspaceId: string
  projectId: string
  projectName: string
  label: string
}

export type BotProjectRef = { id: string; name: string }

/** Every workspace a bot can live in, with the project it rolls up to. */
export function listBotWorkspaceOptions(input: {
  repos: readonly Repo[]
  worktreesByRepo: Readonly<Record<string, readonly Worktree[] | undefined>>
  folderWorkspaces: readonly FolderWorkspace[]
  projectGroups: readonly ProjectGroup[]
}): BotWorkspaceOption[] {
  const options: BotWorkspaceOption[] = []
  for (const repo of input.repos) {
    for (const worktree of input.worktreesByRepo[repo.id] ?? []) {
      if (worktree.isArchived) {
        continue
      }
      options.push({
        workspaceId: worktree.id,
        // Why repo id: legacy worktrees lack projectId, and mixing both would split one project in two.
        projectId: repo.id,
        projectName: repo.displayName,
        label: worktree.displayName
      })
    }
  }
  const groupNames = new Map(input.projectGroups.map((group) => [group.id, group.name]))
  for (const folder of input.folderWorkspaces) {
    if (folder.isArchived) {
      continue
    }
    options.push({
      workspaceId: folderWorkspaceKey(folder.id),
      projectId: `group:${folder.projectGroupId}`,
      projectName: groupNames.get(folder.projectGroupId) ?? folder.name,
      label: folder.name
    })
  }
  return options
}

/** Distinct projects in first-seen order, for grouping bots on the page. */
export function listBotProjects(options: readonly BotWorkspaceOption[]): BotProjectRef[] {
  const seen = new Map<string, string>()
  for (const option of options) {
    if (!seen.has(option.projectId)) {
      seen.set(option.projectId, option.projectName)
    }
  }
  return [...seen].map(([id, name]) => ({ id, name }))
}
