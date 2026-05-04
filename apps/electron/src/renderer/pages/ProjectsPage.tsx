import * as React from 'react'
import { BriefcaseBusiness, FileText, Layers, Loader2, MessageSquareText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useCreateProject, useDeleteProject, useProjectList } from '@/hooks/useProjects'
import { navigate, routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import type { ProjectIndexEntry } from '../../shared/types'

interface ProjectsPageProps {
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

function getProjectCountSummary(project: ProjectIndexEntry): string {
  const counts = project.linkCounts
  const parts = [
    counts.workItemCount > 0 ? `${counts.workItemCount} work items` : null,
    counts.sessionCount > 0 ? `${counts.sessionCount} chats` : null,
    counts.docCount > 0 ? `${counts.docCount} docs` : null,
    counts.outputCount > 0 ? `${counts.outputCount} outputs` : null,
    counts.decisionCount > 0 ? `${counts.decisionCount} decisions` : null,
    counts.notebookCount > 0 ? `${counts.notebookCount} notebooks` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'No linked objects yet'
}

export default function ProjectsPage({ workspaceId }: ProjectsPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { projects, isLoading, refresh } = useProjectList(workspaceId)
  const createProject = useCreateProject(workspaceId)
  const deleteProject = useDeleteProject(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)

  const handleCreate = React.useCallback(async () => {
    const name = window.prompt('Project name')
    if (!name?.trim()) return
    setIsCreating(true)
    try {
      const project = await createProject({ name: name.trim() })
      if (project) {
        toast.success('Project created')
        navigate(routes.view.project(project.id))
      }
    } finally {
      setIsCreating(false)
    }
  }, [createProject])

  const handleDelete = React.useCallback(async (event: React.MouseEvent, project: ProjectIndexEntry) => {
    event.preventDefault()
    event.stopPropagation()

    const confirmed = window.confirm(`Delete "${project.name}"? Linked docs, outputs, chats, and work items will not be deleted.`)
    if (!confirmed) return

    setDeletingId(project.id)
    try {
      await deleteProject(project.id)
      toast.success('Project deleted')
      refresh()
    } finally {
      setDeletingId(null)
    }
  }, [deleteProject, refresh])

  const actions = (
    <Button type="button" size="sm" onClick={() => { void handleCreate() }} disabled={isCreating}>
      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      New Project
    </Button>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Projects"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {projects.length}
          </span>
        )}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          {isLoading && projects.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </section>
          ) : projects.length === 0 ? (
            <section className="flex min-h-[calc(100vh-180px)] items-center justify-center">
              <div className="max-w-[400px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">No projects yet</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Projects are optional workspace organizers for linked chats, docs, outputs, work items, decisions, and notebooks.
                </p>
                <Button type="button" className="mt-4" onClick={() => { void handleCreate() }} disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  New Project
                </Button>
              </div>
            </section>
          ) : (
            <section aria-label="Projects list" className="flex flex-col gap-2">
              {projects.map((project) => {
                const isDeleting = deletingId === project.id

                return (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(routes.view.project(project.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(routes.view.project(project.id))
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
                        <BriefcaseBusiness className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {project.name}
                        </span>
                        {project.description && (
                          <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                            {project.description}
                          </span>
                        )}
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Updated {formatUpdatedTime(project.updatedAt)}</span>
                          <span>{project.status}</span>
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {getProjectCountSummary(project)}
                          </span>
                        </span>
                      </span>
                    </span>

                    <span className="flex items-start gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {project.linkCounts.sessionCount > 0 && <MessageSquareText className="mt-2 h-4 w-4 text-muted-foreground" />}
                      {project.linkCounts.docCount > 0 && <FileText className="mt-2 h-4 w-4 text-muted-foreground" />}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${project.name}`}
                        disabled={isDeleting}
                        onClick={(event) => { void handleDelete(event, project) }}
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
