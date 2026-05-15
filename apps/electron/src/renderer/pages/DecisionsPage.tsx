import * as React from 'react'
import { GitBranch, Layers, Loader2, MessageSquareText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { EntityEmptyState, EntityLoadingState } from '@/components/entity/EntityPageState'
import { EntityListCard } from '@/components/entity/EntityListCard'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useCreateDecision, useDecisionList, useDeleteDecision } from '@/hooks/useDecisions'
import { useRelativeNow } from '@/hooks/useRelativeNow'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'
import type { DecisionIndexEntry } from '../../shared/types'

interface DecisionsPageProps {
  workspaceId: string
}

function getDecisionSummary(decision: DecisionIndexEntry): string {
  const parts = [
    decision.linkCounts.projectCount > 0 ? `${decision.linkCounts.projectCount} projects` : null,
    decision.linkCounts.docCount > 0 ? `${decision.linkCounts.docCount} docs` : null,
    decision.linkCounts.outputCount > 0 ? `${decision.linkCounts.outputCount} outputs` : null,
    decision.linkCounts.notebookCount > 0 ? `${decision.linkCounts.notebookCount} notebooks` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'No linked durable objects'
}

export default function DecisionsPage({ workspaceId }: DecisionsPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { decisions, isLoading, refresh } = useDecisionList(workspaceId)
  const createDecision = useCreateDecision(workspaceId)
  const deleteDecision = useDeleteDecision(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = useRelativeNow()

  const handleCreate = React.useCallback(async () => {
    const title = window.prompt('Decision title')
    if (!title?.trim()) return
    setIsCreating(true)
    try {
      const decision = await createDecision({
        title: title.trim(),
        decision: 'Decision pending details.',
        context: '',
        status: 'proposed',
      })
      if (decision) {
        toast.success('Decision created')
        navigate(routes.view.decision(decision.id))
      }
    } finally {
      setIsCreating(false)
    }
  }, [createDecision])

  const handleDelete = React.useCallback(async (event: React.MouseEvent, decision: DecisionIndexEntry) => {
    event.preventDefault()
    event.stopPropagation()

    const confirmed = window.confirm(`Delete "${decision.title}"? Linked docs, outputs, and projects will not be deleted.`)
    if (!confirmed) return

    setDeletingId(decision.id)
    try {
      await deleteDecision(decision.id)
      toast.success('Decision deleted')
      refresh()
    } finally {
      setDeletingId(null)
    }
  }, [deleteDecision, refresh])

  const actions = (
    <Button type="button" size="sm" onClick={() => { void handleCreate() }} disabled={isCreating}>
      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      New Decision
    </Button>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Decisions"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {decisions.length}
          </span>
        )}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          {isLoading && decisions.length === 0 ? (
            <EntityLoadingState />
          ) : decisions.length === 0 ? (
            <EntityEmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="No decisions yet"
              description="Decisions capture durable architecture or product choices without forcing docs or projects to own them."
            />
          ) : (
            <section aria-label="Decisions list" className="flex flex-col gap-2">
              {decisions.map((decision) => {
                const isDeleting = deletingId === decision.id

                return (
                  <EntityListCard
                    key={decision.id}
                    title={decision.title}
                    description={getDecisionSummary(decision)}
                    meta={(
                      <>
                        <span>Updated {formatUpdatedTime(decision.updatedAt, now)}</span>
                        <span>{decision.status}</span>
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {getDecisionSummary(decision)}
                        </span>
                      </>
                    )}
                    icon={<GitBranch className="h-4 w-4" />}
                    onOpen={() => navigate(routes.view.decision(decision.id))}
                    trailing={(
                      <>
                      {decision.linkCounts.sessionCount > 0 && <MessageSquareText className="mt-2 h-4 w-4 text-muted-foreground" />}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${decision.title}`}
                        disabled={isDeleting}
                        onClick={(event) => { void handleDelete(event, decision) }}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                      </>
                    )}
                  />
                )
              })}
            </section>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
