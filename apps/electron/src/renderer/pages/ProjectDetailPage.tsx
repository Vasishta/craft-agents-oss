import * as React from 'react'
import { useAtomValue } from 'jotai'
import { ArrowLeft, BookOpen, Box, BriefcaseBusiness, FileText, GitPullRequest, LayoutDashboard, Layers, ListTodo, Loader2, MessageSquareText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { EntityNotFoundState } from '@/components/entity/EntityPageState'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDecisionList } from '@/hooks/useDecisions'
import { useNotebookList } from '@/hooks/useNotebooks'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import { useDeleteProject, useProject } from '@/hooks/useProjects'
import { useWorkItemList } from '@/hooks/useWorkItems'
import { WorkflowActions } from '@/components/workflow-actions'
import {
  buildProjectChatLink,
  buildProjectDecisionLink,
  buildProjectDocLink,
  buildProjectLinkedLookups,
  buildProjectNotebookLink,
  buildProjectOutputLink,
  buildProjectWorkItemLink,
  type ProjectLinkedItem,
} from '@/lib/project-links'
import { navigate, routes } from '@/lib/navigate'

interface ProjectDetailPageProps {
  workspaceId: string
  projectId: string
}

function LinkedResourceSection({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: ProjectLinkedItem[]
  empty: string
}) {
  return (
    <section className="rounded-[8px] border border-border/55 bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
          {icon}
        </span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.route)}
              className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-[8px] border border-border/55 bg-foreground/[0.02] px-3 py-2 text-left transition-colors hover:border-border hover:bg-foreground/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                <code className="mt-1 block truncate text-[11px] text-muted-foreground">{item.id}</code>
              </span>
              <span className="self-center text-xs font-medium text-muted-foreground">{item.ctaLabel}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default function ProjectDetailPage({ workspaceId, projectId }: ProjectDetailPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { project, isLoading } = useProject(workspaceId, projectId)
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const { pages } = usePageList(workspaceId)
  const { outputs } = useOutputList(workspaceId)
  const { decisions } = useDecisionList(workspaceId)
  const { notebooks } = useNotebookList(workspaceId)
  const { workItems } = useWorkItemList(workspaceId)
  const deleteProject = useDeleteProject(workspaceId)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const linkedLookups = React.useMemo(() => buildProjectLinkedLookups({
    sessions: Array.from(sessionMetaMap.values()).filter((session) => session.workspaceId === workspaceId),
    docs: pages,
    outputs,
    decisions,
    notebooks,
    workItems,
  }), [decisions, notebooks, outputs, pages, sessionMetaMap, workItems, workspaceId])

  const handleDelete = React.useCallback(async () => {
    if (!project || isDeleting) return
    const confirmed = window.confirm(`Delete "${project.name}"? Linked docs, outputs, chats, and work items will not be deleted.`)
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteProject(project.id)
      toast.success('Project deleted')
      navigate(routes.view.projects())
    } finally {
      setIsDeleting(false)
    }
  }, [deleteProject, isDeleting, project])

  const actions = project ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      aria-label="Delete project"
      onClick={() => { void handleDelete() }}
      disabled={isDeleting}
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  ) : null

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title={project?.name || 'Project'}
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
            onClick={() => navigate(routes.view.projects())}
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Button>

          {project && (
            <WorkflowActions
              actions={[
                { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Go to Workspace Home', onClick: () => navigate(routes.view.home()) },
                { icon: <BriefcaseBusiness className="h-4 w-4" />, label: 'Open Projects', onClick: () => navigate(routes.view.projects()) },
                { icon: <ListTodo className="h-4 w-4" />, label: 'Open Work Queue', onClick: () => navigate(routes.view.workQueue()) },
              ]}
            />
          )}

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !project ? (
            <EntityNotFoundState title="Project not found" description="It may have been deleted or moved." />
          ) : (
            <article className="min-w-0">
              <div className="mb-6 border-b border-border/60 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-foreground/[0.04] text-muted-foreground">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[28px] font-semibold tracking-normal text-foreground">{project.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{project.status}</span>
                      <span>Optional workspace organizer</span>
                    </div>
                    {project.description && (
                      <p className="mt-3 max-w-[720px] text-sm leading-6 text-muted-foreground">{project.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <section className="mb-5">
                <h2 className="mb-3 text-sm font-medium text-foreground">Project-scoped links</h2>
                <p className="max-w-[760px] text-sm leading-6 text-muted-foreground">
                  This view is scoped by explicit Project links. Removing a link from a Project does not delete the linked object from the Workspace.
                </p>
              </section>

              <div className="grid gap-3 md:grid-cols-2">
                <LinkedResourceSection
                  title="Work items"
                  icon={<GitPullRequest className="h-4 w-4" />}
                  items={project.links.workItemIds.map((id) => buildProjectWorkItemLink(id, linkedLookups.workItems.get(id)))}
                  empty="No linked work items"
                />
                <LinkedResourceSection
                  title="Chats"
                  icon={<MessageSquareText className="h-4 w-4" />}
                  items={project.links.sessionIds.map((id) => buildProjectChatLink(id, linkedLookups.sessions.get(id)))}
                  empty="No linked chats"
                />
                <LinkedResourceSection
                  title="Docs"
                  icon={<FileText className="h-4 w-4" />}
                  items={project.links.docIds.map((id) => buildProjectDocLink(id, linkedLookups.docs.get(id)))}
                  empty="No linked docs"
                />
                <LinkedResourceSection
                  title="Outputs"
                  icon={<Box className="h-4 w-4" />}
                  items={project.links.outputIds.map((id) => buildProjectOutputLink(id, linkedLookups.outputs.get(id)))}
                  empty="No linked outputs"
                />
                <LinkedResourceSection
                  title="Decisions"
                  icon={<Layers className="h-4 w-4" />}
                  items={project.links.decisionIds.map((id) => buildProjectDecisionLink(id, linkedLookups.decisions.get(id)))}
                  empty="No linked decisions"
                />
                <LinkedResourceSection
                  title="Notebooks"
                  icon={<BookOpen className="h-4 w-4" />}
                  items={project.links.notebookIds.map((id) => buildProjectNotebookLink(id, linkedLookups.notebooks.get(id)))}
                  empty="No linked notebooks"
                />
              </div>
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
