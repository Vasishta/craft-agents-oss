import * as React from 'react'
import { Box, FileText, GitBranch, Layers, ListTodo, Loader2, MessageSquareText, Search, SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityCollectionPage } from '@/components/entity/EntityCollectionPage'
import { EntityListCard } from '@/components/entity/EntityListCard'
import { RelationshipBadgeRow } from '@/components/entity/RelationshipBadgeRow'
import { Button } from '@/components/ui/button'
import { WorkflowActions } from '@/components/workflow-actions'
import { useAppShellContext } from '@/context/AppShellContext'
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
  return parts.length > 0 ? parts.join(' · ') : 'Durable decision record'
}

function getDecisionRelationshipItems(decision: DecisionIndexEntry) {
  return [
    { label: 'Projects', count: decision.linkCounts.projectCount, icon: Layers },
    { label: 'Docs', count: decision.linkCounts.docCount, icon: FileText },
    { label: 'Outputs', count: decision.linkCounts.outputCount, icon: Box },
    { label: 'Chats', count: decision.linkCounts.sessionCount, icon: MessageSquareText },
  ]
}

export default function DecisionsPage({ workspaceId }: DecisionsPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { openNewChat } = useAppShellContext()
  const { decisions, isLoading, refresh } = useDecisionList(workspaceId)
  const createDecision = useCreateDecision(workspaceId)
  const deleteDecision = useDeleteDecision(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = useRelativeNow()

  const hasDecisions = decisions.length > 0

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

  return (
    <EntityCollectionPage
      title="Decisions"
      count={decisions.length}
      items={decisions}
      isLoading={isLoading}
      isCreating={isCreating}
      createLabel="New Decision"
      onCreate={handleCreate}
      emptyIcon={<GitBranch className="h-5 w-5" />}
      emptyTitle="No decisions yet"
      emptyDescription="Decisions capture durable product and architecture choices so the workspace can remember why a path was chosen."
      emptyActions={
        <>
          <Button
            variant="outline"
            className="w-full max-w-[240px] justify-start gap-3"
            onClick={() => { void openNewChat?.() }}
          >
            <SquarePen className="h-4 w-4" />
            Start a new chat
          </Button>
          <Button
            variant="outline"
            className="w-full max-w-[240px] justify-start gap-3"
            onClick={() => navigate(routes.view.library())}
          >
            <Search className="h-4 w-4" />
            Open Library
          </Button>
        </>
      }
      nextStepArea={hasDecisions ? (
        <WorkflowActions
          actions={[
            { icon: <Search className="h-4 w-4" />, label: 'Open Library', onClick: () => navigate(routes.view.library()) },
            { icon: <ListTodo className="h-4 w-4" />, label: 'Open Work Queue', onClick: () => navigate(routes.view.workQueue()) },
          ]}
        />
      ) : undefined}
      leadingAction={leadingAction}
      rightSidebarButton={rightSidebarButton}
      renderItem={(decision) => {
        const isDeleting = deletingId === decision.id

        return (
          <EntityListCard
            key={decision.id}
            title={decision.title}
            description={getDecisionSummary(decision)}
            badges={<RelationshipBadgeRow items={getDecisionRelationshipItems(decision)} emptyLabel="Durable decision record" />}
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
      }}
    />
  )
}
