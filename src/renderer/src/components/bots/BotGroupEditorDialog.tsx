import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { translate } from '@/i18n/i18n'
import { BOT_GROUP_NAME_MAX_LENGTH } from '../../../../shared/bot-group-types'
import type { Bot } from '../../../../shared/bot-types'
import { BotAvatar } from './BotAvatar'

export function BotGroupEditorDialog({
  open,
  onOpenChange,
  bots
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bots: readonly Bot[]
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const canSave = name.trim().length > 0 && selected.length >= 2 && !saving
  const toggle = (id: string, checked: boolean): void =>
    setSelected((current) => (checked ? [...current, id] : current.filter((value) => value !== id)))

  const save = async (): Promise<void> => {
    const first = bots.find((bot) => bot.id === selected[0])
    if (!canSave || !first) {
      return
    }
    setSaving(true)
    try {
      await window.api.botGroups.create({ name, projectId: first.projectId, botIds: selected })
      onOpenChange(false)
    } catch (error) {
      toast.error(
        translate('bots.groups.saveFailed', 'Could not create the group: {{message}}', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate('bots.groups.createTitle', 'New group')}</DialogTitle>
          <DialogDescription>
            {translate(
              'bots.groups.createDescription',
              'Bots in a group read the same conversation and hand work to each other with @mentions.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bot-group-name">{translate('bots.groups.name', 'Name')}</Label>
            <Input
              id="bot-group-name"
              autoFocus
              value={name}
              maxLength={BOT_GROUP_NAME_MAX_LENGTH}
              placeholder={translate('bots.groups.namePlaceholder', 'e.g. Core team')}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{translate('bots.groups.members', 'Members')}</Label>
            {bots.length < 2 ? (
              <p className="text-xs text-muted-foreground">
                {translate('bots.groups.needBots', 'Create at least two bots first.')}
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {bots.map((bot) => (
                  <label
                    key={bot.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.includes(bot.id)}
                      onCheckedChange={(checked) => toggle(bot.id, checked === true)}
                    />
                    <BotAvatar name={bot.name} avatar={bot.avatar} size="sm" />
                    <span className="text-sm font-medium">{bot.name}</span>
                    {bot.role ? (
                      <span className="truncate text-xs text-muted-foreground">{bot.role}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {translate('bots.editor.cancel', 'Cancel')}
          </Button>
          <Button disabled={!canSave} onClick={() => void save()}>
            {translate('bots.groups.create', 'Create group')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
