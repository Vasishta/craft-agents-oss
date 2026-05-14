import * as React from 'react'
import { GitBranch, Layers, Loader2, MessageSquareText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useCreateDecision, useDecisionList, useDeleteDecision } from '@/hooks/useDecisions'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
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
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { decisions, isLoading, refresh } = useDecisionList(workspaceId)
  const createDecision = useCreateDecision(workspaceId)
  const deleteDecision = useDeleteDecision(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = Date.now()

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
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </section>
          ) : decisions.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <div className="max-w-[400px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  <GitBranch className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">No decisions yet</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Decisions capture durable architecture or product choices without forcing docs or projects to own them.
                </p>
              </div>
            </section>
          ) : (
            <section aria-label="Decisions list" className="flex flex-col gap-2">
              {decisions.map((decision) => {
                const isDeleting = deletingId === decision.id

                return (
                  <div
                    key={decision.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(routes.view.decision(decision.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(routes.view.decision(decision.id))
                      }
                    }}
                    className={cn(
                      'cursor-pointer',
                      'group grid min-h-[86px] w-full grid-cols-[1fr_auto] gap-4 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors',
                      'hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    )}
                  >
                    <span className="flex min-w-0 gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                        <GitBranch className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{decision.title}</span>
                        <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                          {getDecisionSummary(decision)}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Updated {formatUpdatedTime(decision.updatedAt, now)}</span>
                          <span>{decision.status}</span>
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {getDecisionSummary(decision)}
                          </span>
                        </span>
                      </span>
                    </span>

                    <span className="flex items-start gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
                    </span>
                  </div>
                )
              })}
            </section>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
