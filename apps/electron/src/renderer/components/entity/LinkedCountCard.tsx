import * as React from 'react'

interface LinkedCountCardProps {
  icon: React.ReactNode
  label: string
  count: number
}

export function LinkedCountCard({ icon, label, count }: LinkedCountCardProps) {
  return (
    <div className="rounded-[8px] border border-border/55 bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
          {icon}
        </span>
        {label}
        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
      </div>
    </div>
  )
}
