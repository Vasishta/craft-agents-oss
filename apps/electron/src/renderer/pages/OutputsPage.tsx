import * as React from 'react'
import { Archive, Box, FileText, Loader2, MessageSquareText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDeleteOutput, useOutputList } from '@/hooks/useOutputs'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import type { OutputIndexEntry } from '../../shared/types'

interface OutputsPageProps {
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

function formatKind(kind: OutputIndexEntry['kind']): string {
  return kind.split('_').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

function getProvenance(output: OutputIndexEntry): { label: string; icon: React.ElementType } {
  if (output.sourceSessionId || output.sourceMessageId) {
    return { label: 'From assistant response', icon: MessageSquareText }
  }
  return { label: 'Saved manually', icon: Archive }
}

export default function OutputsPage({ workspaceId }: OutputsPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { outputs, isLoading, refresh } = useOutputList(workspaceId)
  const deleteOutput = useDeleteOutput(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = React.useCallback(async (event: React.MouseEvent, output: OutputIndexEntry) => {
    event.preventDefault()
    event.stopPropagation()

    const confirmed = window.confirm(`Delete "${output.title || 'Untitled Output'}"?`)
    if (!confirmed) return

    setDeletingId(output.id)
    try {
      await deleteOutput(output.id)
      toast.success('Output deleted')
      refresh()
    } finally {
      setDeletingId(null)
    }
  }, [deleteOutput, refresh])

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Outputs"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {outputs.length}
          </span>
        )}
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          {isLoading && outputs.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </section>
          ) : outputs.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <div className="max-w-[380px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  <Box className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">No outputs yet</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Save useful assistant responses from chat so they can be reviewed or promoted to docs.
                </p>
              </div>
            </section>
          ) : (
            <section aria-label="Outputs list" className="flex flex-col gap-2">
              {outputs.map((output) => {
                const provenance = getProvenance(output)
                const ProvenanceIcon = provenance.icon
                const isDeleting = deletingId === output.id

                return (
                  <div
                    key={output.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(routes.view.savedOutput(output.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(routes.view.savedOutput(output.id))
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
                        <Box className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {output.title || 'Untitled Output'}
                        </span>
                        <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                          {output.preview || 'Empty output'}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Updated {formatUpdatedTime(output.updatedAt)}</span>
                          <span>{formatKind(output.kind)}</span>
                          <span>{output.status}</span>
                          <span className="inline-flex items-center gap-1">
                            <ProvenanceIcon className="h-3.5 w-3.5" />
                            {provenance.label}
                          </span>
                        </span>
                      </span>
                    </span>

                    <span className="flex items-start gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {output.promotedDocId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label="Open promoted doc"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            navigate(routes.view.savedPage(output.promotedDocId!))
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${output.title || 'Untitled Output'}`}
                        disabled={isDeleting}
                        onClick={(event) => { void handleDelete(event, output) }}
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
