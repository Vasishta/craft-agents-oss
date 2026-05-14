import * as React from 'react'
import { ArrowLeft, BookOpen, Box, BriefcaseBusiness, FileText, GitPullRequest, Layers, Loader2, MessageSquareText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDeleteProject, useProject } from '@/hooks/useProjects'
import { navigate, routes } from '@/lib/navigate'

interface ProjectDetailPageProps {
  workspaceId: string
  projectId: string
}

function LinkedIdsSection({
  title,
  icon,
  ids,
  empty,
}: {
  title: string
  icon: React.ReactNode
  ids: string[]
  empty: string
}) {
  return (
    <section className="rounded-[8px] border border-border/55 bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
          {icon}
        </span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{ids.length}</span>
      </div>
      {ids.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {ids.map(id => (
            <code key={id} className="truncate rounded-[6px] bg-foreground/[0.035] px-2 py-1.5 text-xs text-muted-foreground">
              {id}
            </code>
          ))}
        </div>
      )}
    </section>
  )
}

export default function ProjectDetailPage({ workspaceId, projectId }: ProjectDetailPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { project, isLoading } = useProject(workspaceId, projectId)
  const deleteProject = useDeleteProject(workspaceId)
  const [isDeleting, setIsDeleting] = React.useState(false)

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

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !project ? (
            <section className="flex min-h-[320px] items-center justify-center text-center">
              <div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Project not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
              </div>
            </section>
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
                <LinkedIdsSection title="Work items" icon={<GitPullRequest className="h-4 w-4" />} ids={project.links.workItemIds} empty="No linked work items" />
                <LinkedIdsSection title="Chats" icon={<MessageSquareText className="h-4 w-4" />} ids={project.links.sessionIds} empty="No linked chats" />
                <LinkedIdsSection title="Docs" icon={<FileText className="h-4 w-4" />} ids={project.links.docIds} empty="No linked docs" />
                <LinkedIdsSection title="Outputs" icon={<Box className="h-4 w-4" />} ids={project.links.outputIds} empty="No linked outputs" />
                <LinkedIdsSection title="Decisions" icon={<Layers className="h-4 w-4" />} ids={project.links.decisionIds} empty="No linked decisions" />
                <LinkedIdsSection title="Notebooks" icon={<BookOpen className="h-4 w-4" />} ids={project.links.notebookIds} empty="No linked notebooks" />
              </div>
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
