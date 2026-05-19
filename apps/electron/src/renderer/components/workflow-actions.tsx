/**
 * WorkflowActions — compact action row for detail-page workflow recovery.
 *
 * Renders a small horizontal row of outline buttons. Designed narrow:
 * just takes an actions array and renders consistently. No variants,
 * no framing, no design‑system creep.
 *
 * Exists because five detail pages need the same lightweight pattern:
 * a "back to workflow" block that is visually tucked below the back
 * button / hero area and above the content body.
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface WorkflowAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

interface WorkflowActionsProps {
  actions: WorkflowAction[]
  className?: string
}

export function WorkflowActions({ actions, className }: WorkflowActionsProps) {
  if (actions.length === 0) return null
  return (
    <div className={cn('mb-5 flex flex-wrap items-center gap-2', className)}>
      {actions.map((action, i) => (
        <Button key={i} variant="outline" size="sm" className="gap-2" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  )
}
