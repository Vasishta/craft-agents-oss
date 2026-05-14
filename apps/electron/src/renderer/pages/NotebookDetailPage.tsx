import * as React from 'react'
import { ArrowLeft, BookOpen, Box, FileText, GitBranch, Layers, Loader2, MessageSquareText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useDeleteNotebook, useNotebook } from '@/hooks/useNotebooks'
import { navigate, routes } from '@/lib/navigate'

interface NotebookDetailPageProps {
  workspaceId: string
  notebookId: string
}

function LinkedCount({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
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

export default function NotebookDetailPage({ workspaceId, notebookId }: NotebookDetailPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { notebook, isLoading } = useNotebook(workspaceId, notebookId)
  const deleteNotebook = useDeleteNotebook(workspaceId)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = React.useCallback(async () => {
    if (!notebook || isDeleting) return
    const confirmed = window.confirm(`Delete "${notebook.title}"? Linked docs, outputs, and decisions will not be deleted.`)
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteNotebook(notebook.id)
      toast.success('Notebook deleted')
      navigate(routes.view.notebooks())
    } finally {
      setIsDeleting(false)
    }
  }, [deleteNotebook, isDeleting, notebook])

  const actions = notebook ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      aria-label="Delete notebook"
      onClick={() => { void handleDelete() }}
      disabled={isDeleting}
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  ) : null

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title={notebook?.title || 'Notebook'}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-5 w-fit text-muted-foreground"
            onClick={() => navigate(routes.view.notebooks())}
          >
            <ArrowLeft className="h-4 w-4" />
            Notebooks
          </Button>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !notebook ? (
            <section className="flex min-h-[320px] items-center justify-center text-center">
              <div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Notebook not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
              </div>
            </section>
          ) : (
            <article className="min-w-0">
              <div className="mb-6 border-b border-border/60 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-foreground/[0.04] text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[28px] font-semibold tracking-normal text-foreground">{notebook.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{notebook.status}</span>
                      <span>Curated durable object collection</span>
                    </div>
                    {notebook.description && (
                      <p className="mt-3 max-w-[720px] text-sm leading-6 text-muted-foreground">{notebook.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {notebook.sections.length > 0 && (
                <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                  <h2 className="mb-3 text-sm font-medium text-foreground">Sections</h2>
                  <div className="flex flex-col gap-3">
                    {notebook.sections.map((section) => (
                      <div key={section.id} className="rounded-[8px] border border-border/55 bg-foreground/[0.02] p-3">
                        <div className="text-sm font-medium text-foreground">{section.title}</div>
                        {section.description && (
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <LinkedCount icon={<Layers className="h-4 w-4" />} label="Projects" count={notebook.links.projectIds.length} />
                <LinkedCount icon={<MessageSquareText className="h-4 w-4" />} label="Chats" count={notebook.links.sessionIds.length} />
                <LinkedCount icon={<FileText className="h-4 w-4" />} label="Docs" count={notebook.links.docIds.length} />
                <LinkedCount icon={<Box className="h-4 w-4" />} label="Outputs" count={notebook.links.outputIds.length} />
                <LinkedCount icon={<GitBranch className="h-4 w-4" />} label="Decisions" count={notebook.links.decisionIds.length} />
                <LinkedCount icon={<BookOpen className="h-4 w-4" />} label="Sources" count={notebook.links.sourceIds.length} />
              </div>
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
