import * as React from 'react'
import { cn } from '@/lib/utils'

interface EntityListCardProps {
  title: string
  description: React.ReactNode
  badges?: React.ReactNode
  meta: React.ReactNode
  icon: React.ReactNode
  trailing?: React.ReactNode
  onOpen: () => void
}

export function EntityListCard({ title, description, badges, meta, icon, trailing, onOpen }: EntityListCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'cursor-pointer',
        'group grid min-h-[96px] w-full grid-cols-[1fr_auto] gap-4 rounded-[14px] border border-border/55 bg-background px-4 py-3.5 text-left transition-colors',
        'hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      <span className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{title}</span>
          <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">{description}</span>
          {badges ? (
            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{badges}</span>
          ) : null}
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</span>
        </span>
      </span>

      {trailing ? (
        <span className="flex items-start gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {trailing}
        </span>
      ) : null}
    </div>
  )
}
