import { cn } from '@/lib/utils'
import type { BotAvatarPreset } from '../../../../shared/bot-types'

const AVATAR_SURFACE: Record<BotAvatarPreset, string> = {
  orange: 'bg-bot-avatar-orange',
  blue: 'bg-bot-avatar-blue',
  green: 'bg-bot-avatar-green',
  violet: 'bg-bot-avatar-violet',
  rose: 'bg-bot-avatar-rose',
  slate: 'bg-bot-avatar-slate'
}

const SIZE = {
  sm: 'size-6 text-[11px]',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base'
} as const

export function BotAvatar({
  name,
  avatar,
  size = 'md',
  className
}: {
  name: string
  avatar: BotAvatarPreset
  size?: keyof typeof SIZE
  className?: string
}): React.JSX.Element {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
        AVATAR_SURFACE[avatar],
        SIZE[size],
        className
      )}
    >
      {initial}
    </span>
  )
}
