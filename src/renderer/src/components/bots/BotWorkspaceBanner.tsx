import { Monitor } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { translate } from '@/i18n/i18n'
import { botOwnsWorkspace } from '../../../../shared/bot-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { BotAvatar } from './BotAvatar'
import { useBots } from './bot-directory'

/** First line of a bot-owned workspace card: the bot, on the card's own status/title grid. */
export function BotWorkspaceBanner({
  worktree
}: {
  worktree: Pick<Worktree, 'id' | 'ephemeralVmCheckoutMode'>
}): React.JSX.Element | null {
  const bots = useBots()
  const bot = bots?.find((candidate) => botOwnsWorkspace(candidate, worktree.id))
  if (!bot) {
    return null
  }
  return (
    <div className="flex w-full min-w-0 items-center gap-0.5 pb-1" data-bot-workspace-banner="">
      <div className="flex w-5 shrink-0 justify-center">
        <BotAvatar name={bot.name} avatar={bot.avatar} size="xs" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[13px] leading-5 font-semibold">{bot.name}</span>
        {bot.role ? (
          <Badge variant="cardMeta" className="min-w-0">
            <span className="truncate">{bot.role}</span>
          </Badge>
        ) : null}
        {worktree.ephemeralVmCheckoutMode !== undefined ? (
          <Badge
            variant="cardMeta"
            className="ml-auto"
            title={translate('bots.sidebar.vmHint', 'This workspace runs on a VM')}
          >
            <Monitor className="size-2.5" aria-hidden />
            {translate('bots.sidebar.vm', 'VM')}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}
