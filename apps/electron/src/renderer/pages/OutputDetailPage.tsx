import * as React from 'react'
import { ArrowLeft, FileText, Loader2, MessageSquareText, Trash2 } from 'lucide-react'
import { Markdown } from '@craft-agent/ui'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useDeleteOutput, useOutput, usePromoteOutputToDoc } from '@/hooks/useOutputs'
import { navigate, routes } from '@/lib/navigate'

interface OutputDetailPageProps {
  workspaceId: string
  outputId: string
}

function formatKind(kind?: string): string {
  if (!kind) return 'Output'
  return kind.split('_').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

export default function OutputDetailPage({ workspaceId, outputId }: OutputDetailPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { output, isLoading } = useOutput(workspaceId, outputId)
  const deleteOutput = useDeleteOutput(workspaceId)
  const promoteOutputToDoc = usePromoteOutputToDoc(workspaceId)
  const [isPromoting, setIsPromoting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handlePromote = React.useCallback(async () => {
    if (!output || isPromoting) return
    setIsPromoting(true)
    try {
      const page = await promoteOutputToDoc(output.id)
      if (page) {
        toast.success('Output promoted to doc')
        navigate(routes.view.savedPage(page.id))
      } else {
        toast.error('Failed to promote output')
      }
    } finally {
      setIsPromoting(false)
    }
  }, [isPromoting, output, promoteOutputToDoc])

  const handleDelete = React.useCallback(async () => {
    if (!output || isDeleting) return
    const confirmed = window.confirm(`Delete "${output.title || 'Untitled Output'}"?`)
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteOutput(output.id)
      toast.success('Output deleted')
      navigate(routes.view.outputs())
    } finally {
      setIsDeleting(false)
    }
  }, [deleteOutput, isDeleting, output])

  const actions = output ? (
    <div className="flex items-center gap-2">
      {output.sourceSessionId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(routes.view.allSessions(output.sourceSessionId))}
        >
          <MessageSquareText className="h-4 w-4" />
          Open chat
        </Button>
      )}
      {output.promotedDocId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(routes.view.savedPage(output.promotedDocId!))}
        >
          <FileText className="h-4 w-4" />
          Open doc
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => { void handlePromote() }} disabled={isPromoting}>
          {isPromoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Promote to Doc
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label="Delete output"
        onClick={() => { void handleDelete() }}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  ) : null

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title={output?.title || 'Output'}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[920px] flex-col px-5 py-7 sm:px-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-5 w-fit text-muted-foreground"
            onClick={() => navigate(routes.view.outputs())}
          >
            <ArrowLeft className="h-4 w-4" />
            Outputs
          </Button>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !output ? (
            <section className="flex min-h-[320px] items-center justify-center text-center">
              <div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Output not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
              </div>
            </section>
          ) : (
            <article className="min-w-0">
              <div className="mb-6 border-b border-border/60 pb-4">
                <h1 className="text-[28px] font-semibold tracking-normal text-foreground">{output.title || 'Untitled Output'}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatKind(output.kind)}</span>
                  <span>{output.status}</span>
                  {output.sourceSessionId && <span>From chat</span>}
                </div>
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Markdown mode="full" id={output.id}>
                  {output.content || '*Empty output*'}
                </Markdown>
              </div>
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
