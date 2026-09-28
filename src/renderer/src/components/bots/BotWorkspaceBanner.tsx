import { Monitor } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { botOwnsWorkspace } from '../../../../shared/bot-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { BotAvatar } from './BotAvatar'
import { useBots } from './bot-directory'

/** Bot identity above the workspace card it owns: the sidebar reads bot-first, workspace second. */
export function BotWorkspaceBanner({
  worktree,
  indent,
  onActivate
}: {
  worktree: Pick<Worktree, 'id' | 'ephemeralVmCheckoutMode'>
  indent: number
  onActivate: () => void
}): React.JSX.Element | null {
  const bots = useBots()
  const bot = bots?.find((candidate) => botOwnsWorkspace(candidate, worktree.id))
  if (!bot) {
    return null
  }
  const onVm = worktree.ephemeralVmCheckoutMode !== undefined
  return (
    <button
      type="button"
      onClick={onActivate}
      className="flex w-full items-center gap-2 pt-1.5 pb-0.5 pr-2 text-left"
      style={{ paddingLeft: `${indent + 8}px` }}
    >
      <BotAvatar name={bot.name} avatar={bot.avatar} size="sm" />
      <span className="min-w-0 truncate text-[13px] font-semibold text-worktree-sidebar-foreground">
        {bot.name}
      </span>
      {bot.role ? (
        <span className="min-w-0 truncate rounded-md border border-worktree-sidebar-border px-1.5 text-[11px] text-worktree-sidebar-foreground/60">
          {bot.role}
        </span>
      ) : null}
      {onVm ? (
        <span
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-worktree-sidebar-foreground/8 px-1.5 text-[11px] text-worktree-sidebar-foreground/70"
          title={translate('bots.sidebar.vmHint', 'This workspace runs on a VM')}
        >
          <Monitor className="size-3" aria-hidden />
          {translate('bots.sidebar.vm', 'VM')}
        </span>
      ) : null}
    </button>
  )
}
