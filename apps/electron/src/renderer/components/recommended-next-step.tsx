/**
 * RecommendedNextStep — compact, context-aware next-step recommendation.
 *
 * Renders a single narrow bar with a "Next step" label, one primary action
 * button, and an optional secondary escape hatch. Designed to sit near the
 * top of a page's content area and complement (not replace) existing action
 * bars.
 *
 * Uses existing Button & design tokens — no new design system, no framing.
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'

export interface RecommendedAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
}

export interface RecommendedNextStepProps {
  primaryAction: RecommendedAction
  secondaryAction?: RecommendedAction
}

export function RecommendedNextStep({ primaryAction, secondaryAction }: RecommendedNextStepProps) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-[10px] border border-border/40 bg-foreground/[0.02] px-3 py-2">
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Next step
      </span>
      <Button
        size="sm"
        variant="default"
        className="gap-1.5 text-xs"
        onClick={primaryAction.onClick}
      >
        {primaryAction.icon}
        {primaryAction.label}
      </Button>
      {secondaryAction && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.icon}
          {secondaryAction.label}
        </Button>
      )}
    </div>
  )
}
