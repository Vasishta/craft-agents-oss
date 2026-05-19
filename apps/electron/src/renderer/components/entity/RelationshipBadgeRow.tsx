import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

export interface RelationshipBadgeItem {
  label: string
  count: number
  icon: LucideIcon
}

interface RelationshipBadgeRowProps {
  items: RelationshipBadgeItem[]
  emptyLabel?: string
  maxVisible?: number
}

export function RelationshipBadgeRow({
  items,
  emptyLabel = 'No linked objects yet',
  maxVisible = 4,
}: RelationshipBadgeRowProps) {
  const visibleItems = items.filter((item) => item.count > 0).slice(0, maxVisible)

  if (visibleItems.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">{emptyLabel}</span>
    )
  }

  return (
    <>
      {visibleItems.map(({ label, count, icon: Icon }) => (
        <span
          key={label}
          className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded bg-foreground/[0.05] px-1.5 text-[10px] font-medium text-muted-foreground"
          title={`${count} linked ${label.toLowerCase()}`}
        >
          <Icon className="h-3 w-3" />
          <span>{count}</span>
          <span>{label}</span>
        </span>
      ))}
    </>
  )
}
