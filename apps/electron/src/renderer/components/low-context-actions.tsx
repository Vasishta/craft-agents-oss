/**
 * LowContextActions — reusable workflow handoff for empty / low-context states.
 *
 * Designed narrow: renders a small heading, one explanatory line, and 1-3 action
 * buttons. The `compact` variant uses plain outline buttons (for management
 * surfaces); the default uses richer cards with optional detail text (for
 * orientation surfaces like Home).
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'

export interface LowContextAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  /** Detail line — only shown in the non‑compact (rich) card style. */
  detail?: string
}

interface LowContextActionsProps {
  title?: string
  description?: string
  actions: LowContextAction[]
  /** Compact outline‑button layout for tighter management surfaces. */
  compact?: boolean
  /** Render rich action rows without the outer framed card container. */
  framed?: boolean
}

export function LowContextActions({
  title,
  description,
  actions,
  compact,
  framed = true,
}: LowContextActionsProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        {title && <p className="text-sm font-medium text-foreground">{title}</p>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {actions.map((action, i) => (
          <Button
            key={i}
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    )
  }

  const content = (
    <>
      {title && <p className="text-sm text-muted-foreground">{title}</p>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {actions.map((action, i) => (
        <button
          key={i}
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-3 rounded-[14px] border border-border/40 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
            {action.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{action.label}</span>
            {action.detail && (
              <span className="mt-0.5 block text-xs text-muted-foreground">{action.detail}</span>
            )}
          </span>
        </button>
      ))}
    </>
  )

  if (!framed) {
    return <div className="grid gap-2">{content}</div>
  }

  return (
    <div className="grid gap-2 rounded-[18px] border border-dashed border-border/50 bg-foreground/[0.02] p-4">
      {content}
    </div>
  )
}
