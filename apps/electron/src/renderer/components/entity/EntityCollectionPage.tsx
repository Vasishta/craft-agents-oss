import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EntityEmptyState, EntityLoadingState } from './EntityPageState'

interface EntityCollectionPageProps<T> {
  title: string
  count: number
  items: T[]
  isLoading: boolean
  isCreating?: boolean
  createLabel: string
  onCreate: () => void | Promise<void>
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyDescription: React.ReactNode
  /** Extra actions shown below the create button in the empty state. */
  emptyActions?: React.ReactNode
  /** Compact action area shown above the list when items exist. */
  nextStepArea?: React.ReactNode
  leadingAction?: React.ReactNode
  rightSidebarButton?: React.ReactNode
  renderItem: (item: T) => React.ReactNode
}

export function EntityCollectionPage<T>({
  title,
  count,
  items,
  isLoading,
  isCreating = false,
  createLabel,
  onCreate,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActions,
  nextStepArea,
  leadingAction,
  rightSidebarButton,
  renderItem,
}: EntityCollectionPageProps<T>) {
  const createAction = (
    <Button type="button" size="sm" onClick={() => { void onCreate() }} disabled={isCreating}>
      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {createLabel}
    </Button>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title={title}
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {count}
          </span>
        )}
        leadingAction={leadingAction}
        actions={createAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          {isLoading && items.length === 0 ? (
            <EntityLoadingState />
          ) : items.length === 0 ? (
            <EntityEmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              action={createAction}
            >
              {emptyActions ? <div className="mt-5 flex flex-col items-center gap-2">{emptyActions}</div> : null}
            </EntityEmptyState>
          ) : (
            <section aria-label={`${title} list`} className="flex flex-col gap-2">
              {nextStepArea ? <div className="mb-4">{nextStepArea}</div> : null}
              {items.map(renderItem)}
            </section>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
