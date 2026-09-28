import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot as BotIcon, MessageSquare, MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { activateAndRevealWorkspace } from '@/lib/worktree-activation'
import { useAppStore } from '@/store'
import type { Bot } from '../../../../shared/bot-types'
import { BotAvatar } from './BotAvatar'
import { BotEditorDialog } from './BotEditorDialog'
import { listBotProjects, listBotWorkspaceOptions } from './bot-workspace-options'
import { useBots } from './bot-directory'

function openBotChat(bot: Bot): void {
  if (!bot.workspaceId || activateAndRevealWorkspace(bot.workspaceId) === false) {
    toast.error(
      translate('bots.chat.workspaceMissing', "{{name}}'s workspace is not available.", {
        name: bot.name
      })
    )
    return
  }
  const result = launchAgentInNewTab({
    agent: bot.agent,
    worktreeId: bot.workspaceId,
    launchSource: 'tab_bar_quick_launch'
  })
  if (!result) {
    toast.error(
      translate('bots.chat.launchFailed', 'Could not start a chat with {{name}}.', {
        name: bot.name
      })
    )
  }
}

function BotRow({
  bot,
  workspaceLabel,
  onEdit,
  onDelete
}: {
  bot: Bot
  workspaceLabel: string | null
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent">
      <BotAvatar name={bot.name} avatar={bot.avatar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{bot.name}</span>
          {bot.role ? (
            <Badge variant="cardMeta" className="min-w-0">
              <span className="truncate">{bot.role}</span>
            </Badge>
          ) : null}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {workspaceLabel ?? translate('bots.row.noWorkspace', 'No workspace')}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={() => openBotChat(bot)}>
        <MessageSquare />
        {translate('bots.row.chat', 'Chat')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={translate('bots.row.more', 'More actions for {{name}}', { name: bot.name })}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            {translate('bots.row.edit', 'Edit')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            {translate('bots.row.delete', 'Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function BotsPage(): React.JSX.Element {
  useTranslation()
  const bots = useBots()
  const repos = useAppStore((s) => s.repos)
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)
  const folderWorkspaces = useAppStore((s) => s.folderWorkspaces)
  const projectGroups = useAppStore((s) => s.projectGroups)
  const [editing, setEditing] = useState<{ bot: Bot | null } | null>(null)
  const [deleting, setDeleting] = useState<Bot | null>(null)

  const workspaceOptions = useMemo(
    () => listBotWorkspaceOptions({ repos, worktreesByRepo, folderWorkspaces, projectGroups }),
    [repos, worktreesByRepo, folderWorkspaces, projectGroups]
  )
  const workspaceLabels = useMemo(
    () => new Map(workspaceOptions.map((o) => [o.workspaceId, o.label])),
    [workspaceOptions]
  )
  const projects = useMemo(() => {
    const known = listBotProjects(workspaceOptions)
    const knownIds = new Set(known.map((p) => p.id))
    // Bots whose project is gone still show, under a fallback heading.
    const orphaned = (bots ?? []).some((bot) => !knownIds.has(bot.projectId))
    return orphaned
      ? [...known, { id: '', name: translate('bots.page.otherProjects', 'Other') }]
      : known
  }, [workspaceOptions, bots])

  const confirmDelete = async (): Promise<void> => {
    if (!deleting) {
      return
    }
    try {
      await window.api.bots.remove({ id: deleting.id })
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  const knownProjectIds = new Set(projects.map((p) => p.id))
  const botsIn = (projectId: string): Bot[] =>
    (bots ?? []).filter((bot) =>
      projectId ? bot.projectId === projectId : !knownProjectIds.has(bot.projectId)
    )

  return (
    <div className="scrollbar-sleek flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{translate('bots.page.title', 'Bots')}</h1>
            <p className="text-sm text-muted-foreground">
              {translate(
                'bots.page.subtitle',
                'Personas that work inside your projects, each in its own workspace.'
              )}
            </p>
          </div>
          <Button onClick={() => setEditing({ bot: null })}>
            <Plus />
            {translate('bots.page.new', 'New bot')}
          </Button>
        </div>

        {bots !== null && bots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <BotIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium">
                {translate('bots.page.emptyTitle', 'No bots yet')}
              </p>
              <p className="text-sm text-muted-foreground">
                {translate(
                  'bots.page.emptyDescription',
                  'Create a bot, give it a role and instructions, and chat with it in its workspace.'
                )}
              </p>
            </div>
            <Button variant="outline" onClick={() => setEditing({ bot: null })}>
              <Plus />
              {translate('bots.page.new', 'New bot')}
            </Button>
          </div>
        ) : null}

        {projects.map((project) => {
          const projectBots = botsIn(project.id)
          if (projectBots.length === 0) {
            return null
          }
          return (
            <section key={project.id || 'other'} className="flex flex-col gap-1">
              <h2 className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {project.name}
              </h2>
              {projectBots.map((bot) => (
                <BotRow
                  key={bot.id}
                  bot={bot}
                  workspaceLabel={
                    bot.workspaceId ? (workspaceLabels.get(bot.workspaceId) ?? null) : null
                  }
                  onEdit={() => setEditing({ bot })}
                  onDelete={() => setDeleting(bot)}
                />
              ))}
            </section>
          )
        })}
      </div>

      <BotEditorDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
        bot={editing?.bot ?? null}
        workspaceOptions={workspaceOptions}
      />

      <Dialog open={deleting !== null} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {translate('bots.delete.title', 'Delete {{name}}?', { name: deleting?.name ?? '' })}
            </DialogTitle>
            <DialogDescription>
              {translate(
                'bots.delete.description',
                'The bot and its instructions are removed. Its workspace and files stay untouched.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {translate('bots.editor.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              {translate('bots.row.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
