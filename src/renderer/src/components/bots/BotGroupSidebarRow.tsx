import { useAppStore } from '@/store'
import { BotGroupAvatarStack } from './BotGroupAvatarStack'
import { useBots } from './bot-directory'
import { useBotGroups } from './bot-group-directory'
import { requestBotsNavigation } from './bots-navigation'

/** A group chat under its project header, aligned with the workspace cards below it. */
export function BotGroupSidebarRow({ groupId }: { groupId: string }): React.JSX.Element | null {
  const groups = useBotGroups()
  const bots = useBots()
  const openBotsPage = useAppStore((s) => s.openBotsPage)
  const group = groups?.find((candidate) => candidate.id === groupId)
  if (!group) {
    return null
  }
  const members = group.botIds.flatMap((id) => (bots ?? []).filter((bot) => bot.id === id))
  return (
    <div className="pb-0.5 pl-3 pr-2">
      <button
        type="button"
        onClick={() => {
          requestBotsNavigation({ kind: 'open-group', groupId })
          openBotsPage()
        }}
        className="worktree-sidebar-card-hover flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left"
      >
        <BotGroupAvatarStack bots={members} size="xs" />
        <span className="min-w-0 truncate text-[13px] leading-5 font-semibold">{group.name}</span>
        <span className="ml-auto shrink-0 text-[11px] text-worktree-sidebar-foreground/50">
          {members.length}
        </span>
      </button>
    </div>
  )
}
