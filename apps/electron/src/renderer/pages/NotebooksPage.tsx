import * as React from 'react'
import { BookOpen, Layers, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useCreateNotebook, useDeleteNotebook, useNotebookList } from '@/hooks/useNotebooks'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import type { NotebookIndexEntry } from '../../shared/types'

interface NotebooksPageProps {
  workspaceId: string
}

function formatUpdatedTime(timestamp: number, now: number): string {
  const diffMs = timestamp - now
  const absMs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absMs < 60_000) return 'just now'
  if (absMs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute')
  if (absMs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
  if (absMs < 604_800_000) return rtf.format(Math.round(diffMs / 86_400_000), 'day')

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(timestamp)
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
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { notebooks, isLoading, refresh } = useNotebookList(workspaceId)
  const createNotebook = useCreateNotebook(workspaceId)
  const deleteNotebook = useDeleteNotebook(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = Date.now()

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
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </section>
          ) : notebooks.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <div className="max-w-[400px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">No notebooks yet</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Notebooks curate docs, outputs, decisions, chats, and sources without forcing folder ownership.
                </p>
              </div>
            </section>
          ) : (
            <section aria-label="Notebooks list" className="flex flex-col gap-2">
              {notebooks.map((notebook) => {
                const isDeleting = deletingId === notebook.id

                return (
                  <div
                    key={notebook.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(routes.view.notebook(notebook.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(routes.view.notebook(notebook.id))
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
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{notebook.title}</span>
                        <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                          {notebook.description || getNotebookSummary(notebook)}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Updated {formatUpdatedTime(notebook.updatedAt, now)}</span>
                          <span>{notebook.status}</span>
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {getNotebookSummary(notebook)}
                          </span>
                        </span>
                      </span>
                    </span>

                    <span className="flex items-start gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
