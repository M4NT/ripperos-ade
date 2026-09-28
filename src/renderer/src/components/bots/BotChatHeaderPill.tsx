import { useAppStore } from '@/store'
import { botOwnsWorkspace } from '../../../../shared/bot-types'
import { getActiveSidebarWorkspaceId } from '../../../../shared/workspace-scope'
import { BotAvatar } from './BotAvatar'
import { useBots } from './bot-directory'

/** Floating name pill over a chat whose workspace belongs to a bot. */
export function BotChatHeaderPill(): React.JSX.Element | null {
  const bots = useBots()
  const activeWorkspaceKey = useAppStore((s) => s.activeWorkspaceKey)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const workspaceId = getActiveSidebarWorkspaceId(activeWorkspaceKey, activeWorktreeId)
  const bot = workspaceId
    ? bots?.find((candidate) => botOwnsWorkspace(candidate, workspaceId))
    : null
  if (!bot) {
    return null
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-3.5 pl-1 shadow-xs">
        <BotAvatar name={bot.name} avatar={bot.avatar} size="sm" />
        <span className="text-sm font-semibold">{bot.name}</span>
        {bot.role ? <span className="text-xs text-muted-foreground">{bot.role}</span> : null}
      </div>
    </div>
  )
}
