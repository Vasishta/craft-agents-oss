import * as React from 'react'
import { BookOpen, Layers, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { EntityEmptyState, EntityLoadingState } from '@/components/entity/EntityPageState'
import { EntityListCard } from '@/components/entity/EntityListCard'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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

export default function NotebooksPage({ workspaceId }: NotebooksPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { notebooks, isLoading, refresh } = useNotebookList(workspaceId)
  const createNotebook = useCreateNotebook(workspaceId)
  const deleteNotebook = useDeleteNotebook(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = useRelativeNow()

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

  const actions = (
    <Button type="button" size="sm" onClick={() => { void handleCreate() }} disabled={isCreating}>
      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      New Notebook
    </Button>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Notebooks"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {notebooks.length}
          </span>
        )}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          {isLoading && notebooks.length === 0 ? (
            <EntityLoadingState />
          ) : notebooks.length === 0 ? (
            <EntityEmptyState
              icon={<BookOpen className="h-5 w-5" />}
              title="No notebooks yet"
              description="Notebooks curate docs, outputs, decisions, chats, and sources without forcing folder ownership."
            />
          ) : (
            <section aria-label="Notebooks list" className="flex flex-col gap-2">
              {notebooks.map((notebook) => {
                const isDeleting = deletingId === notebook.id

                return (
                  <EntityListCard
                    key={notebook.id}
                    title={notebook.title}
                    description={notebook.description || getNotebookSummary(notebook)}
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
              })}
            </section>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
