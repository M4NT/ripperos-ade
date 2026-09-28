import React from 'react'
import {
  Bot,
  CircleX,
  Ellipsis,
  Eye,
  FolderInput,
  FolderTree,
  Plus,
  // `Shapes` is lucide-react's own export name; exempted in config/oxlint-anti-slop.json.
  Shapes,
  SlidersHorizontal,
  Trash2,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import {
  requestBotsNavigation,
  type BotsNavigationRequest
} from '@/components/bots/bots-navigation'
import { getRepositoryIconSectionId } from '@/components/settings/repository-settings-targets'
import type { ProjectGroup } from '../../../../../../shared/project-group-types'
import type { Repo } from '../../../../../../shared/repo-types'
import type { WorktreeVisibilityDefaults } from '../../../../../../shared/global-settings-types'
import { isGitRepoKind } from '../../../../../../shared/repo-kind'
import {
  effectiveExternalWorktreeVisibility,
  isLegacyRepoForExternalWorktreeVisibility
} from '../../../../../../shared/worktree/ownership'
import {
  REPO_HEADER_ACTION_BUTTON_CLASS,
  REPO_HEADER_ACTION_REVEAL_CLASS
} from '../../repo-header-action-button-class'
import type { getRepoHeaderCreateState } from '../../repo-header-create-state'
import {
  handleRepoHeaderActionPointerDown,
  stopRepoHeaderKeyboardToggle,
  stopRepoHeaderMenuEvent
} from './header-event-guards'

function getWorktreeVisibilityMenuLabel(
  repo: Repo,
  visibilityDefaults?: WorktreeVisibilityDefaults
): string {
  const visibility = effectiveExternalWorktreeVisibility(
    repo,
    isLegacyRepoForExternalWorktreeVisibility(repo),
    visibilityDefaults
  )
  return visibility === 'show' ? 'Hide non-RipperOS worktrees' : 'Show hidden worktrees'
}

export type RepoHeaderProjectActions = {
  getWorktreeVisibilityDefaults: (repo: Repo) => WorktreeVisibilityDefaults | undefined
  onOpenRepoSettings: (projectId: string, sectionId?: string) => void
  onOpenWorktreeVisibility: (repo: Repo) => void
  onCreateGroupFromRepo: (repo: Repo) => void
  onMoveProjectToGroup: (repo: Repo, groupId: string) => void
  onRemoveProjectFromGroup: (repo: Repo) => void
  onRemoveProject: (repo: Repo) => void
  onCreateForRepo: (projectId: string) => void
}

export function RepoHeaderProjectActionsMenu({
  repo,
  label,
  projectGroups,
  actions
}: {
  repo: Repo
  label: string
  projectGroups: readonly ProjectGroup[]
  actions: RepoHeaderProjectActions
}): React.JSX.Element {
  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={REPO_HEADER_ACTION_BUTTON_CLASS}
              data-repo-header-action=""
              aria-label={translate(
                'auto.components.sidebar.WorktreeList.609633a9e6',
                'Project actions for {{value0}}',
                { value0: label }
              )}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={stopRepoHeaderKeyboardToggle}
              onPointerDown={handleRepoHeaderActionPointerDown}
            >
              <Ellipsis className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {translate('auto.components.sidebar.WorktreeList.2ef41bf9a7', 'Project actions')}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        // Why: Radix portals keep React bubbling through the project header; block menu events from arming row drag/collapse.
        onPointerDown={stopRepoHeaderMenuEvent}
        onMouseDown={stopRepoHeaderMenuEvent}
        onPointerUp={stopRepoHeaderMenuEvent}
        onMouseUp={stopRepoHeaderMenuEvent}
        onClick={stopRepoHeaderMenuEvent}
        onKeyDown={stopRepoHeaderMenuEvent}
      >
        <DropdownMenuItem onSelect={() => actions.onOpenRepoSettings(repo.id)}>
          <SlidersHorizontal className="size-3.5" />
          {translate('auto.components.sidebar.WorktreeList.2cdffbc728', 'Project Settings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => actions.onOpenRepoSettings(repo.id, getRepositoryIconSectionId(repo.id))}
        >
          <Shapes className="size-3.5" />
          {translate('auto.components.sidebar.WorktreeList.e82d3589a1', 'Change Project Icon')}
        </DropdownMenuItem>
        {isGitRepoKind(repo) ? (
          <DropdownMenuItem onSelect={() => actions.onOpenWorktreeVisibility(repo)}>
            <Eye className="size-3.5" />
            {getWorktreeVisibilityMenuLabel(repo, actions.getWorktreeVisibilityDefaults(repo))}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => actions.onCreateGroupFromRepo(repo)}>
          {/* Not FolderPlus: that now means "Add project" in the sidebar header above. */}
          <FolderTree className="size-3.5" />
          {translate('auto.components.sidebar.WorktreeList.cbfd565f83', 'New group from project')}
        </DropdownMenuItem>
        {projectGroups.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="size-3.5" />
              {translate('auto.components.sidebar.WorktreeList.4a08fb55f2', 'Move to group')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {projectGroups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  disabled={repo.projectGroupId === group.id}
                  onSelect={() => actions.onMoveProjectToGroup(repo, group.id)}
                >
                  <span className="max-w-48 truncate">{group.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {repo.projectGroupId ? (
          <DropdownMenuItem onSelect={() => actions.onRemoveProjectFromGroup(repo)}>
            <CircleX className="size-3.5" />
            {translate('auto.components.sidebar.WorktreeList.64e55f7f01', 'Remove from group')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => actions.onRemoveProject(repo)}>
          <Trash2 className="size-3.5" />
          {translate('auto.components.sidebar.WorktreeList.c83968f87f', 'Remove Project')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RepoHeaderCreateWorkspaceButton({
  repo,
  label,
  createState,
  onCreateForRepo
}: {
  repo: Repo
  label: string
  createState: ReturnType<typeof getRepoHeaderCreateState> | null
  onCreateForRepo: (projectId: string) => void
}): React.JSX.Element {
  const fallbackLabel = translate(
    'auto.components.sidebar.WorktreeList.bb85cd86ba',
    'Create workspace for {{value0}}',
    { value0: label }
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {createState?.disabled ? (
          <span
            className={cn(
              'inline-flex cursor-not-allowed transition-[margin,max-width,opacity]',
              REPO_HEADER_ACTION_REVEAL_CLASS
            )}
            data-repo-header-action=""
            tabIndex={0}
            aria-label={createState.ariaLabel}
            onKeyDown={stopRepoHeaderKeyboardToggle}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={handleRepoHeaderActionPointerDown}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="pointer-events-none size-5 shrink-0 rounded-md text-muted-foreground transition-opacity opacity-60"
              aria-label={createState.ariaLabel}
              disabled
            >
              <Plus className="size-3" />
            </Button>
          </span>
        ) : (
          <span className="inline-flex">
            <RepoHeaderAddMenu
              repo={repo}
              ariaLabel={createState?.ariaLabel ?? fallbackLabel}
              onCreateForRepo={onCreateForRepo}
            />
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {createState?.tooltip ?? fallbackLabel}
      </TooltipContent>
    </Tooltip>
  )
}

/** The project "+": a workspace as before, plus a bot or a group chat scoped to this project. */
function RepoHeaderAddMenu({
  repo,
  ariaLabel,
  onCreateForRepo
}: {
  repo: Repo
  ariaLabel: string
  onCreateForRepo: (projectId: string) => void
}): React.JSX.Element {
  const openBotsPage = useAppStore((s) => s.openBotsPage)
  const openFromBots = (request: BotsNavigationRequest): void => {
    requestBotsNavigation(request)
    openBotsPage()
  }
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={REPO_HEADER_ACTION_BUTTON_CLASS}
          data-repo-header-action=""
          aria-label={ariaLabel}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={stopRepoHeaderKeyboardToggle}
          onPointerDown={handleRepoHeaderActionPointerDown}
        >
          <Plus className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        // Why: Radix portals keep React bubbling through the project header; block menu events from arming row drag/collapse.
        onPointerDown={stopRepoHeaderMenuEvent}
        onMouseDown={stopRepoHeaderMenuEvent}
        onPointerUp={stopRepoHeaderMenuEvent}
        onMouseUp={stopRepoHeaderMenuEvent}
        onClick={stopRepoHeaderMenuEvent}
        onKeyDown={stopRepoHeaderMenuEvent}
      >
        <DropdownMenuItem onSelect={() => onCreateForRepo(repo.id)}>
          <FolderTree className="size-3.5" />
          {translate('bots.projectMenu.newWorkspace', 'New workspace')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openFromBots({ kind: 'new-bot', projectId: repo.id })}>
          <Bot className="size-3.5" />
          {translate('bots.projectMenu.newBot', 'New bot')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openFromBots({ kind: 'new-group', projectId: repo.id })}>
          <Users className="size-3.5" />
          {translate('bots.projectMenu.newGroup', 'New group')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
