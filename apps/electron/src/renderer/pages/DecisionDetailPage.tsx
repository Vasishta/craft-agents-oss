import * as React from 'react'
import { ArrowLeft, BookOpen, Box, FileText, GitBranch, Layers, Loader2, MessageSquareText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useDecision, useDeleteDecision } from '@/hooks/useDecisions'
import { navigate, routes } from '@/lib/navigate'

interface DecisionDetailPageProps {
  workspaceId: string
  decisionId: string
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

export default function DecisionDetailPage({ workspaceId, decisionId }: DecisionDetailPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { decision, isLoading } = useDecision(workspaceId, decisionId)
  const deleteDecision = useDeleteDecision(workspaceId)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = React.useCallback(async () => {
    if (!decision || isDeleting) return
    const confirmed = window.confirm(`Delete "${decision.title}"? Linked docs, outputs, and projects will not be deleted.`)
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteDecision(decision.id)
      toast.success('Decision deleted')
      navigate(routes.view.decisions())
    } finally {
      setIsDeleting(false)
    }
  }, [decision, deleteDecision, isDeleting])

  const actions = decision ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      aria-label="Delete decision"
      onClick={() => { void handleDelete() }}
      disabled={isDeleting}
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  ) : null

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title={decision?.title || 'Decision'}
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
            onClick={() => navigate(routes.view.decisions())}
          >
            <ArrowLeft className="h-4 w-4" />
            Decisions
          </Button>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !decision ? (
            <section className="flex min-h-[320px] items-center justify-center text-center">
              <div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Decision not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
              </div>
            </section>
          ) : (
            <article className="min-w-0">
              <div className="mb-6 border-b border-border/60 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-foreground/[0.04] text-muted-foreground">
                    <GitBranch className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[28px] font-semibold tracking-normal text-foreground">{decision.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{decision.status}</span>
                      <span>Durable workspace decision</span>
                    </div>
                  </div>
                </div>
              </div>

              {decision.context && (
                <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                  <h2 className="mb-2 text-sm font-medium text-foreground">Context</h2>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{decision.context}</p>
                </section>
              )}

              <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                <h2 className="mb-2 text-sm font-medium text-foreground">Decision</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{decision.decision}</p>
              </section>

              {decision.consequences && (
                <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                  <h2 className="mb-2 text-sm font-medium text-foreground">Consequences</h2>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{decision.consequences}</p>
                </section>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <LinkedCount icon={<Layers className="h-4 w-4" />} label="Projects" count={decision.links.projectIds.length} />
                <LinkedCount icon={<MessageSquareText className="h-4 w-4" />} label="Chats" count={decision.links.sessionIds.length} />
                <LinkedCount icon={<FileText className="h-4 w-4" />} label="Docs" count={decision.links.docIds.length} />
                <LinkedCount icon={<Box className="h-4 w-4" />} label="Outputs" count={decision.links.outputIds.length} />
                <LinkedCount icon={<BookOpen className="h-4 w-4" />} label="Notebooks" count={decision.links.notebookIds.length} />
                <LinkedCount icon={<GitBranch className="h-4 w-4" />} label="Supersedes" count={decision.links.supersedesDecisionIds.length} />
              </div>
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
