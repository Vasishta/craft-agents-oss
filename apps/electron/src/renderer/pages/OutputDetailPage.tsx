import * as React from 'react'
import { ArrowLeft, Archive, FileText, GitBranch, GitPullRequest, LayoutDashboard, Layers, Loader2, MessageSquareText, Search, Trash2 } from 'lucide-react'
import { Markdown } from '@craft-agent/ui'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ProjectLinkDialog } from '@/components/entity/ProjectLinkDialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useCreateDecision } from '@/hooks/useDecisions'
import { useDeleteOutput, useOutput, usePromoteOutputToDoc } from '@/hooks/useOutputs'
import { useCreateWorkItem } from '@/hooks/useWorkItems'
import { buildDecisionFromOutput, buildWorkItemFromOutput } from '@/lib/cross-object-linking'
import { navigate, routes } from '@/lib/navigate'
import { WorkflowActions } from '@/components/workflow-actions'

interface OutputDetailPageProps {
  workspaceId: string
  outputId: string
}

function formatKind(kind?: string): string {
  if (!kind) return 'Output'
  return kind.split('_').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

export default function OutputDetailPage({ workspaceId, outputId }: OutputDetailPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { output, isLoading } = useOutput(workspaceId, outputId)
  const deleteOutput = useDeleteOutput(workspaceId)
  const promoteOutputToDoc = usePromoteOutputToDoc(workspaceId)
  const createDecision = useCreateDecision(workspaceId)
  const createWorkItem = useCreateWorkItem(workspaceId)
  const [isPromoting, setIsPromoting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)
  const [isCreatingDecision, setIsCreatingDecision] = React.useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false)

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

  const handleCreateTask = React.useCallback(async () => {
    if (!output || isCreatingTask) return
    setIsCreatingTask(true)
    try {
      const workItem = await createWorkItem(buildWorkItemFromOutput(output))
      if (workItem) {
        toast.success('Work item created from output')
        navigate(routes.view.workQueue())
      } else {
        toast.error('Failed to create work item')
      }
    } finally {
      setIsCreatingTask(false)
    }
  }, [createWorkItem, isCreatingTask, output])

  const handleRecordDecision = React.useCallback(async () => {
    if (!output || isCreatingDecision) return
    setIsCreatingDecision(true)
    try {
      const decision = await createDecision(buildDecisionFromOutput(output))
      if (decision) {
        toast.success('Decision created from output')
        navigate(routes.view.decision(decision.id))
      } else {
        toast.error('Failed to create decision')
      }
    } finally {
      setIsCreatingDecision(false)
    }
  }, [createDecision, isCreatingDecision, output])

  const sourceLabel = output?.sourceSessionId || output?.sourceMessageId
    ? 'From assistant response'
    : 'Saved manually'

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
      <Button type="button" variant="outline" size="sm" onClick={() => setProjectDialogOpen(true)}>
        <Layers className="h-4 w-4" />
        Attach to Project
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => { void handleCreateTask() }} disabled={isCreatingTask}>
        {isCreatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />}
        Create Task
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => { void handleRecordDecision() }} disabled={isCreatingDecision}>
        {isCreatingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
        Record Decision
      </Button>
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

      {output ? (
        <ProjectLinkDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          workspaceId={workspaceId}
          entityKind="output"
          entityId={output.id}
          entityTitle={output.title || 'Output'}
          entityLabel="Output"
        />
      ) : null}

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

          {output && (
            <WorkflowActions
              actions={[
                { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Go to Workspace Home', onClick: () => navigate(routes.view.home()) },
                { icon: <Search className="h-4 w-4" />, label: 'Open Library', onClick: () => navigate(routes.view.library()) },
              ]}
            />
          )}

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
                  <span className="inline-flex items-center gap-1">
                    {output.sourceSessionId || output.sourceMessageId ? (
                      <MessageSquareText className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                    {sourceLabel}
                  </span>
                  {output.promotedDocId && <span>Promoted to Doc</span>}
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
