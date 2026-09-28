import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import {
  BOT_AVATAR_PRESETS,
  BOT_INSTRUCTIONS_MAX_LENGTH,
  BOT_NAME_MAX_LENGTH,
  BOT_ROLE_MAX_LENGTH,
  type Bot,
  type BotAvatarPreset
} from '../../../../shared/bot-types'
import { BotAvatar } from './BotAvatar'
import { listBotProjects, type BotWorkspaceOption } from './bot-workspace-options'

type Draft = {
  name: string
  role: string
  avatar: BotAvatarPreset
  instructions: string
  workspaceId: string
  tokenRipper: boolean
}

function draftFrom(bot: Bot | null, defaultWorkspaceId: string | null): Draft {
  return {
    name: bot?.name ?? '',
    role: bot?.role ?? '',
    avatar: bot?.avatar ?? 'orange',
    instructions: bot?.instructions ?? '',
    workspaceId: bot?.workspaceId ?? defaultWorkspaceId ?? '',
    tokenRipper: bot?.tokenRipper ?? true
  }
}

export function BotEditorDialog({
  open,
  onOpenChange,
  bot,
  workspaceOptions
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Null creates a new bot. */
  bot: Bot | null
  workspaceOptions: readonly BotWorkspaceOption[]
}): React.JSX.Element {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(bot, null))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(draftFrom(bot, workspaceOptions[0]?.workspaceId ?? null))
    }
  }, [open, bot, workspaceOptions])

  const selectedWorkspace = workspaceOptions.find((o) => o.workspaceId === draft.workspaceId)
  const canSave = draft.name.trim().length > 0 && Boolean(selectedWorkspace) && !saving
  const projects = listBotProjects(workspaceOptions)

  const save = async (): Promise<void> => {
    if (!canSave || !selectedWorkspace) {
      return
    }
    setSaving(true)
    try {
      const fields = {
        name: draft.name,
        role: draft.role,
        avatar: draft.avatar,
        instructions: draft.instructions,
        workspaceId: selectedWorkspace.workspaceId,
        tokenRipper: draft.tokenRipper
      }
      await (bot
        ? window.api.bots.update({ id: bot.id, patch: fields })
        : window.api.bots.create({ ...fields, projectId: selectedWorkspace.projectId }))
      onOpenChange(false)
    } catch (error) {
      toast.error(
        translate('bots.editor.saveFailed', 'Could not save the bot: {{message}}', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {bot
              ? translate('bots.editor.editTitle', 'Edit bot')
              : translate('bots.editor.createTitle', 'New bot')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'bots.editor.description',
              'A bot is a persona with its own workspace. Its instructions apply to every chat opened there.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <BotAvatar name={draft.name} avatar={draft.avatar} size="lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="bot-name">{translate('bots.editor.name', 'Name')}</Label>
              <Input
                id="bot-name"
                autoFocus
                value={draft.name}
                maxLength={BOT_NAME_MAX_LENGTH}
                placeholder={translate('bots.editor.namePlaceholder', 'e.g. Valt')}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{translate('bots.editor.color', 'Color')}</Label>
            <div className="flex gap-2">
              {BOT_AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={preset}
                  aria-pressed={draft.avatar === preset}
                  onClick={() => setDraft({ ...draft, avatar: preset })}
                  className={cn(
                    'rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    draft.avatar === preset && 'ring-2 ring-ring'
                  )}
                >
                  <BotAvatar name={draft.name} avatar={preset} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bot-role">{translate('bots.editor.role', 'Role')}</Label>
            <Input
              id="bot-role"
              value={draft.role}
              maxLength={BOT_ROLE_MAX_LENGTH}
              placeholder={translate('bots.editor.rolePlaceholder', 'e.g. Software architect')}
              onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{translate('bots.editor.workspace', 'Workspace')}</Label>
            {workspaceOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {translate(
                  'bots.editor.noWorkspaces',
                  'Add a project and create a workspace first; the bot works inside one.'
                )}
              </p>
            ) : (
              <Select
                value={draft.workspaceId}
                onValueChange={(workspaceId) => setDraft({ ...draft, workspaceId })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectGroup key={project.id}>
                      <SelectLabel>{project.name}</SelectLabel>
                      {workspaceOptions
                        .filter((option) => option.projectId === project.id)
                        .map((option) => (
                          <SelectItem key={option.workspaceId} value={option.workspaceId}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bot-instructions">
              {translate('bots.editor.instructions', 'Instructions')}
            </Label>
            <Textarea
              id="bot-instructions"
              rows={6}
              value={draft.instructions}
              maxLength={BOT_INSTRUCTIONS_MAX_LENGTH}
              placeholder={translate(
                'bots.editor.instructionsPlaceholder',
                'How this bot should work, what it owns, what it must never do.'
              )}
              onChange={(event) => setDraft({ ...draft, instructions: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {translate(
                'bots.editor.instructionsHint',
                'Sent to Claude with every chat. Never put passwords or API keys here.'
              )}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <Label htmlFor="bot-token-ripper">
                {translate('bots.editor.tokenRipper', 'Ripper mode')}
              </Label>
              <span className="text-xs text-muted-foreground">
                {translate(
                  'bots.editor.tokenRipperHint',
                  'Answers lead with the action and skip filler, saving tokens.'
                )}
              </span>
            </div>
            <Switch
              id="bot-token-ripper"
              checked={draft.tokenRipper}
              onCheckedChange={(tokenRipper) => setDraft({ ...draft, tokenRipper })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {translate('bots.editor.cancel', 'Cancel')}
          </Button>
          <Button disabled={!canSave} onClick={() => void save()}>
            {bot
              ? translate('bots.editor.save', 'Save')
              : translate('bots.editor.create', 'Create bot')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
