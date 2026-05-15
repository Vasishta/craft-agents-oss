import * as React from 'react'
import { LinkedCountCard } from './LinkedCountCard'

interface LinkedCountGridItem {
  icon: React.ReactNode
  label: string
  count: number
}

interface LinkedCountGridProps {
  items: LinkedCountGridItem[]
}

export function LinkedCountGrid({ items }: LinkedCountGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <LinkedCountCard key={item.label} icon={item.icon} label={item.label} count={item.count} />
      ))}
    </div>
  )
}
