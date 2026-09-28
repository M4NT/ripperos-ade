import type { Bot } from '../../../../shared/bot-types'
import { BotAvatar } from './BotAvatar'

/** Overlapping avatars of a group's first members. */
export function BotGroupAvatarStack({
  bots,
  size = 'sm'
}: {
  bots: readonly Bot[]
  size?: 'xs' | 'sm'
}): React.JSX.Element {
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {bots.slice(0, 3).map((bot) => (
        <BotAvatar
          key={bot.id}
          name={bot.name}
          avatar={bot.avatar}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
    </span>
  )
}
