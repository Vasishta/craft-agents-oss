import * as React from 'react'
import { ArrowLeft, BookOpen, Box, FileText, GitBranch, Layers, Loader2, MessageSquareText, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { LinkedCountGrid } from '@/components/entity/LinkedCountGrid'
import { EntityNotFoundState } from '@/components/entity/EntityPageState'
import { ProjectLinkDialog } from '@/components/entity/ProjectLinkDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDecision, useDeleteDecision, useUpdateDecision } from '@/hooks/useDecisions'
import { navigate, routes } from '@/lib/navigate'
import type { DecisionDocument, DecisionStatus } from '../../shared/types'

interface DecisionDetailPageProps {
  workspaceId: string
  decisionId: string
}

export default function DecisionDetailPage({ workspaceId, decisionId }: DecisionDetailPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { decision, isLoading } = useDecision(workspaceId, decisionId)
  const deleteDecision = useDeleteDecision(workspaceId)
  const updateDecision = useUpdateDecision(workspaceId)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false)
  const [draft, setDraft] = React.useState({
    title: '',
    status: 'proposed' as DecisionStatus,
    context: '',
    decision: '',
    consequences: '',
  })

  React.useEffect(() => {
    if (!decision) return
    setDraft({
      title: decision.title,
      status: decision.status,
      context: decision.context,
      decision: decision.decision,
      consequences: decision.consequences || '',
    })
  }, [decision])

  const setDraftPatch = React.useCallback((patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

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

  const handleCancelEdit = React.useCallback(() => {
    if (!decision) return
    setDraft({
      title: decision.title,
      status: decision.status,
      context: decision.context,
      decision: decision.decision,
      consequences: decision.consequences || '',
    })
    setIsEditing(false)
  }, [decision])

  const handleSave = React.useCallback(async () => {
    if (!decision || isSaving) return
    const title = draft.title.trim()
    const decisionText = draft.decision.trim()
    if (!title || !decisionText) {
      toast.error('Title and decision are required')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateDecision(decision.id, {
        title,
        status: draft.status,
        context: draft.context.trim(),
        decision: decisionText,
        consequences: draft.consequences.trim() || undefined,
      })
      if (updated) {
        toast.success('Decision updated')
        setIsEditing(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update decision')
    } finally {
      setIsSaving(false)
    }
  }, [decision, draft, isSaving, updateDecision])

  const actions = decision ? (
    <>
      {isEditing ? (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => { void handleSave() }} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setProjectDialogOpen(true)} disabled={isDeleting}>
            <Layers className="h-4 w-4" />
            Attach to Project
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isDeleting}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label="Delete decision"
        onClick={() => { void handleDelete() }}
        disabled={isDeleting || isSaving}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </>
  ) : null

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title={decision?.title || 'Decision'}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      {decision ? (
        <ProjectLinkDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          workspaceId={workspaceId}
          entityKind="decision"
          entityId={decision.id}
          entityTitle={decision.title}
          entityLabel="Decision"
        />
      ) : null}

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
            <EntityNotFoundState title="Decision not found" description="It may have been deleted or moved." />
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

              {isEditing ? (
                <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="decision-title">Title</label>
                      <Input id="decision-title" value={draft.title} onChange={(event) => setDraftPatch({ title: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="decision-status">Status</label>
                      <Select value={draft.status} onValueChange={(value) => setDraftPatch({ status: value as DecisionStatus })}>
                        <SelectTrigger id="decision-status" className="bg-background">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proposed">Proposed</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="superseded">Superseded</SelectItem>
                          <SelectItem value="deprecated">Deprecated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="decision-context">Context</label>
                      <Textarea id="decision-context" value={draft.context} onChange={(event) => setDraftPatch({ context: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="decision-body">Decision</label>
                      <Textarea id="decision-body" value={draft.decision} onChange={(event) => setDraftPatch({ decision: event.target.value })} className="min-h-[140px]" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="decision-consequences">Consequences</label>
                      <Textarea id="decision-consequences" value={draft.consequences} onChange={(event) => setDraftPatch({ consequences: event.target.value })} />
                    </div>
                  </div>
                </section>
              ) : (
                <>
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
                </>
              )}

              <LinkedCountGrid
                items={[
                  { icon: <Layers className="h-4 w-4" />, label: 'Projects', count: decision.links.projectIds.length },
                  { icon: <MessageSquareText className="h-4 w-4" />, label: 'Chats', count: decision.links.sessionIds.length },
                  { icon: <FileText className="h-4 w-4" />, label: 'Docs', count: decision.links.docIds.length },
                  { icon: <Box className="h-4 w-4" />, label: 'Outputs', count: decision.links.outputIds.length },
                  { icon: <BookOpen className="h-4 w-4" />, label: 'Notebooks', count: decision.links.notebookIds.length },
                  { icon: <GitBranch className="h-4 w-4" />, label: 'Supersedes', count: decision.links.supersedesDecisionIds.length },
                ]}
              />
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
