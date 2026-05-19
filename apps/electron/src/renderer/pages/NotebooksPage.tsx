import * as React from 'react'
import { BookOpen, Box, FileText, GitBranch, Layers, ListTodo, Loader2, Search, SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityCollectionPage } from '@/components/entity/EntityCollectionPage'
import { EntityListCard } from '@/components/entity/EntityListCard'
import { RelationshipBadgeRow } from '@/components/entity/RelationshipBadgeRow'
import { Button } from '@/components/ui/button'
import { WorkflowActions } from '@/components/workflow-actions'
import { useAppShellContext } from '@/context/AppShellContext'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useCreateNotebook, useDeleteNotebook, useNotebookList } from '@/hooks/useNotebooks'
import { useRelativeNow } from '@/hooks/useRelativeNow'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'
import type { NotebookIndexEntry } from '../../shared/types'

interface NotebooksPageProps {
  workspaceId: string
}

function getNotebookSummary(notebook: NotebookIndexEntry): string {
  const parts = [
    notebook.sectionCount > 0 ? `${notebook.sectionCount} sections` : null,
    notebook.linkCounts.docCount > 0 ? `${notebook.linkCounts.docCount} docs` : null,
    notebook.linkCounts.outputCount > 0 ? `${notebook.linkCounts.outputCount} outputs` : null,
    notebook.linkCounts.decisionCount > 0 ? `${notebook.linkCounts.decisionCount} decisions` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Curated durable collection'
}

function getNotebookRelationshipItems(notebook: NotebookIndexEntry) {
  return [
    { label: 'Sections', count: notebook.sectionCount, icon: Layers },
    { label: 'Docs', count: notebook.linkCounts.docCount, icon: FileText },
    { label: 'Outputs', count: notebook.linkCounts.outputCount, icon: Box },
    { label: 'Decisions', count: notebook.linkCounts.decisionCount, icon: GitBranch },
  ]
}

export default function NotebooksPage({ workspaceId }: NotebooksPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { openNewChat } = useAppShellContext()
  const { notebooks, isLoading, refresh } = useNotebookList(workspaceId)
  const createNotebook = useCreateNotebook(workspaceId)
  const deleteNotebook = useDeleteNotebook(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = useRelativeNow()

  const hasNotebooks = notebooks.length > 0

  const handleCreate = React.useCallback(async () => {
    const title = window.prompt('Notebook title')
    if (!title?.trim()) return
    setIsCreating(true)
    try {
      const notebook = await createNotebook({
        title: title.trim(),
        description: '',
        status: 'active',
      })
      if (notebook) {
        toast.success('Notebook created')
        navigate(routes.view.notebook(notebook.id))
      }
    } finally {
      setIsCreating(false)
    }
  }, [createNotebook])

  const handleDelete = React.useCallback(async (event: React.MouseEvent, notebook: NotebookIndexEntry) => {
    event.preventDefault()
    event.stopPropagation()

    const confirmed = window.confirm(`Delete "${notebook.title}"? Linked docs, outputs, and decisions will not be deleted.`)
    if (!confirmed) return

    setDeletingId(notebook.id)
    try {
      await deleteNotebook(notebook.id)
      toast.success('Notebook deleted')
      refresh()
    } finally {
      setDeletingId(null)
    }
  }, [deleteNotebook, refresh])

  return (
    <EntityCollectionPage
      title="Notebooks"
      count={notebooks.length}
      items={notebooks}
      isLoading={isLoading}
      isCreating={isCreating}
      createLabel="New Notebook"
      onCreate={handleCreate}
      emptyIcon={<BookOpen className="h-5 w-5" />}
      emptyTitle="No notebooks yet"
      emptyDescription="Notebooks curate docs, outputs, decisions, chats, and sources without forcing folder ownership."
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
            onClick={() => navigate(routes.view.workQueue())}
          >
            <ListTodo className="h-4 w-4" />
            Open Work Queue
          </Button>
        </>
      }
      nextStepArea={hasNotebooks ? (
        <WorkflowActions
          actions={[
            { icon: <Search className="h-4 w-4" />, label: 'Open Library', onClick: () => navigate(routes.view.library()) },
            { icon: <SquarePen className="h-4 w-4" />, label: 'Start a new chat', onClick: () => { void openNewChat?.() } },
          ]}
        />
      ) : undefined}
      leadingAction={leadingAction}
      rightSidebarButton={rightSidebarButton}
      renderItem={(notebook) => {
        const isDeleting = deletingId === notebook.id

        return (
          <EntityListCard
            key={notebook.id}
            title={notebook.title}
            description={notebook.description || getNotebookSummary(notebook)}
            badges={<RelationshipBadgeRow items={getNotebookRelationshipItems(notebook)} emptyLabel="Curated durable workspace collection" />}
            meta={(
              <>
                <span>Updated {formatUpdatedTime(notebook.updatedAt, now)}</span>
                <span>{notebook.status}</span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {getNotebookSummary(notebook)}
                </span>
              </>
            )}
            icon={<BookOpen className="h-4 w-4" />}
            onOpen={() => navigate(routes.view.notebook(notebook.id))}
            trailing={(
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${notebook.title}`}
                disabled={isDeleting}
                onClick={(event) => { void handleDelete(event, notebook) }}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          />
        )
      }}
    />
  )
}
