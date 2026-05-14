import * as React from 'react'
import { FileText, Loader2, MessageSquareText, PencilLine, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useCreatePage, useDeletePage, usePageList } from '@/hooks/usePages'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import { stripMarkdown } from '@/utils/text'
import type { PageListEntry } from '../../shared/types'

interface DocsHomeProps {
  workspaceId: string
}

function formatUpdatedTime(timestamp: number): string {
  const diffMs = timestamp - Date.now()
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

function getProvenance(page: PageListEntry): { label: string; icon: React.ElementType } {
  if (page.outputIdCount > 0) {
    return { label: 'Created from Output', icon: FileText }
  }
  if (page.sourceSessionId || page.sourceMessageId) {
    return { label: 'From chat', icon: MessageSquareText }
  }
  return { label: 'Workspace Doc', icon: PencilLine }
}

function getPreview(content: string | undefined): string {
  const plain = stripMarkdown(content ?? '').replace(/\s+/g, ' ').trim()
  if (!plain) return 'Empty doc'
  return plain.length > 160 ? `${plain.slice(0, 157)}...` : plain
}

export default function DocsHome({ workspaceId }: DocsHomeProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { pages, refresh } = usePageList(workspaceId)
  const { createPage } = useCreatePage(workspaceId)
  const deletePage = useDeletePage(workspaceId)
  const [isCreating, setIsCreating] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [previews, setPreviews] = React.useState<Record<string, string>>({})

  const sortedPages = React.useMemo(
    () => [...pages].sort((a, b) => b.updatedAt - a.updatedAt),
    [pages]
  )

  React.useEffect(() => {
    if (!workspaceId || sortedPages.length === 0) {
      setPreviews({})
      return
    }

    let stale = false
    const visiblePages = sortedPages.slice(0, 50)

    Promise.all(
      visiblePages.map(async (page) => {
        try {
          const fullPage = await window.electronAPI.getPage(workspaceId, page.id)
          return [page.id, getPreview(fullPage?.content)] as const
        } catch {
          return [page.id, 'Preview unavailable'] as const
        }
      })
    ).then((entries) => {
      if (!stale) {
        setPreviews(Object.fromEntries(entries))
      }
    })

    return () => {
      stale = true
    }
  }, [workspaceId, sortedPages])

  const handleNewDoc = React.useCallback(async () => {
    if (!workspaceId || isCreating) return

    setIsCreating(true)
    try {
      const page = await createPage({ title: 'Untitled Doc', content: '' })
      if (page) {
        toast.success('Doc created')
        navigate(routes.view.savedPage(page.id))
      } else {
        toast.error('Failed to create doc')
      }
    } finally {
      setIsCreating(false)
    }
  }, [workspaceId, isCreating, createPage])

  const handleDelete = React.useCallback(async (event: React.MouseEvent, page: PageListEntry) => {
    event.stopPropagation()
    event.preventDefault()

    const confirmed = window.confirm(`Delete "${page.title || 'Untitled Doc'}"?`)
    if (!confirmed) return

    setDeletingId(page.id)
    try {
      const success = await deletePage(page.id)
      if (success) {
        setPreviews((current) => {
          const next = { ...current }
          delete next[page.id]
          return next
        })
        refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }, [deletePage, refresh])

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Docs"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {sortedPages.length}
          </span>
        )}
        leadingAction={leadingAction}
        actions={(
          <Button size="sm" onClick={handleNewDoc} disabled={isCreating || !workspaceId}>
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Doc
          </Button>
        )}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          {sortedPages.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <div className="max-w-[360px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">No docs yet</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Docs can be created manually or captured from chat.
                </p>
                <Button className="mt-5" onClick={handleNewDoc} disabled={isCreating || !workspaceId}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  New Doc
                </Button>
              </div>
            </section>
          ) : (
            <section aria-label="Docs list" className="flex flex-col gap-2">
              {sortedPages.map((page) => {
                const provenance = getProvenance(page)
                const ProvenanceIcon = provenance.icon
                const isDeleting = deletingId === page.id

                return (
                  <div
                    key={page.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(routes.view.savedPage(page.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(routes.view.savedPage(page.id))
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
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {page.title || 'Untitled Doc'}
                        </span>
                        <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                          {previews[page.id] ?? 'Loading preview...'}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Updated {formatUpdatedTime(page.updatedAt)}</span>
                          <span className="inline-flex items-center gap-1">
                            <ProvenanceIcon className="h-3.5 w-3.5" />
                            {provenance.label}
                          </span>
                        </span>
                      </span>
                    </span>

                    <span className="flex items-start pt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${page.title || 'Untitled Doc'}`}
                        onClick={(event) => handleDelete(event, page)}
                        disabled={isDeleting}
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
