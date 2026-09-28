import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp } from 'lucide-react'
import { toast } from 'sonner'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { BotGroup, BotGroupMessage } from '../../../../shared/bot-group-types'
import type { Bot, BotAvatarPreset } from '../../../../shared/bot-types'
import { BotAvatar } from './BotAvatar'
import { BotGroupAvatarStack } from './BotGroupAvatarStack'
import { useBotGroupMessages, useBotGroupThinking } from './bot-group-directory'

const NAME_TEXT: Record<BotAvatarPreset, string> = {
  orange: 'text-bot-avatar-orange',
  blue: 'text-bot-avatar-blue',
  green: 'text-bot-avatar-green',
  violet: 'text-bot-avatar-violet',
  rose: 'text-bot-avatar-rose',
  slate: 'text-bot-avatar-slate'
}

function dayKey(timestamp: number): string {
  return new Date(timestamp).toDateString()
}

function formatDaySeparator(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Bold every @mention of a member so handoffs stand out in the transcript. */
function emphasizeMentions(text: string, members: readonly Bot[]): string {
  return members.reduce(
    (current, bot) =>
      current.replace(
        new RegExp(`@${escapeForRegExp(bot.name)}(?![\\p{L}\\p{N}_])`, 'giu'),
        (match) => `**${match}**`
      ),
    text
  )
}

function MessageBody({
  text,
  members
}: {
  text: string
  members: readonly Bot[]
}): React.JSX.Element {
  return (
    <CommentMarkdown
      content={emphasizeMentions(text, members)}
      variant="document"
      className="text-sm"
    />
  )
}

function GroupMessage({
  message,
  previous,
  members
}: {
  message: BotGroupMessage
  previous: BotGroupMessage | undefined
  members: readonly Bot[]
}): React.JSX.Element {
  if (message.author.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm">
          <MessageBody text={message.text} members={members} />
        </div>
      </div>
    )
  }
  const botId = message.author.botId
  const bot = members.find((member) => member.id === botId)
  const continues =
    previous?.author.kind === 'bot' &&
    previous.author.botId === botId &&
    dayKey(previous.createdAt) === dayKey(message.createdAt)
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 shrink-0">
        {bot ? <BotAvatar name={bot.name} avatar={bot.avatar} size="sm" /> : null}
      </div>
      <div className="flex max-w-[75%] min-w-0 flex-col gap-1">
        {continues ? null : (
          <span
            className={cn(
              'px-1 text-xs font-medium',
              bot ? NAME_TEXT[bot.avatar] : 'text-muted-foreground'
            )}
          >
            {bot?.name ?? translate('bots.groups.removedBot', 'Removed bot')}
          </span>
        )}
        <div className="w-fit max-w-full rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5">
          <MessageBody text={message.text} members={members} />
        </div>
      </div>
    </div>
  )
}

export function BotGroupChat({
  group,
  bots,
  onBack
}: {
  group: BotGroup
  bots: readonly Bot[]
  onBack: () => void
}): React.JSX.Element {
  const messages = useBotGroupMessages(group.id)
  const thinkingIds = useBotGroupThinking(group.id)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const members = useMemo(
    () => group.botIds.flatMap((id) => bots.filter((bot) => bot.id === id)),
    [group.botIds, bots]
  )
  const thinking = members.filter((bot) => thinkingIds.includes(bot.id))

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, thinking.length])

  const send = async (): Promise<void> => {
    const text = draft.trim()
    if (!text) {
      return
    }
    setDraft('')
    try {
      await window.api.botGroups.send({ groupId: group.id, text })
    } catch (error) {
      setDraft(text)
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  const mention = (bot: Bot): void => {
    setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@${bot.name} `)
    inputRef.current?.focus()
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center px-4 py-3">
        <Button
          size="icon-sm"
          variant="ghost"
          className="absolute left-3"
          aria-label={translate('bots.groups.back', 'Back to bots')}
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-3.5 pl-1.5 shadow-xs">
          <BotGroupAvatarStack bots={members} size="xs" />
          <span className="text-sm font-semibold">{group.name}</span>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-6">
          {messages !== null && messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {translate(
                'bots.groups.empty',
                'Say hi. Without a mention every bot decides whether it is for them; @Name asks one directly.'
              )}
            </p>
          ) : null}
          {(messages ?? []).map((message, index) => {
            const previous = index > 0 ? messages![index - 1] : undefined
            const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt)
            return (
              <Fragment key={message.id}>
                {newDay ? (
                  <div className="pt-2 text-center text-xs text-muted-foreground">
                    {formatDaySeparator(message.createdAt)}
                  </div>
                ) : null}
                <GroupMessage message={message} previous={previous} members={members} />
              </Fragment>
            )
          })}
          {thinking.length > 0 ? (
            <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
              <BotGroupAvatarStack bots={thinking} size="xs" />
              {translate('bots.groups.thinking', '{{names}} thinking…', {
                names: thinking.map((bot) => bot.name).join(', ')
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-6 pb-5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {members.map((bot) => (
            <Button key={bot.id} size="xs" variant="outline" onClick={() => mention(bot)}>
              <BotAvatar name={bot.name} avatar={bot.avatar} size="xs" />@{bot.name}
            </Button>
          ))}
        </div>
        {/* Same composer box as the native chat so both conversations read as one product. */}
        <div className="flex items-end gap-2 rounded-lg border border-border bg-muted/50 p-1.5 shadow-xs dark:bg-input/40">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder={translate('bots.groups.placeholder', 'Message {{name}}', {
              name: group.name
            })}
            className="scrollbar-sleek max-h-[calc(8lh+0.5rem)] min-h-9 w-full resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void send()
              }
            }}
          />
          <Button
            size="icon-sm"
            disabled={!draft.trim()}
            aria-label={translate('bots.groups.send', 'Send')}
            onClick={() => void send()}
          >
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  )
}
