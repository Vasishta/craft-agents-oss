import * as React from 'react'
import { Box, BriefcaseBusiness, FileText, Layers, ListTodo, Loader2, MessageSquareText, SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityCollectionPage } from '@/components/entity/EntityCollectionPage'
import { EntityListCard } from '@/components/entity/EntityListCard'
import { RelationshipBadgeRow } from '@/components/entity/RelationshipBadgeRow'
import { Button } from '@/components/ui/button'
import { WorkflowActions } from '@/components/workflow-actions'
import { useAppShellContext } from '@/context/AppShellContext'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useCreateProject, useDeleteProject, useProjectList } from '@/hooks/useProjects'
import { useRelativeNow } from '@/hooks/useRelativeNow'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'
import type { ProjectIndexEntry } from '../../shared/types'

interface ProjectsPageProps {
  workspaceId: string
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

function getProjectRelationshipItems(project: ProjectIndexEntry) {
  return [
    { label: 'Work', count: project.linkCounts.workItemCount, icon: ListTodo },
    { label: 'Chats', count: project.linkCounts.sessionCount, icon: MessageSquareText },
    { label: 'Docs', count: project.linkCounts.docCount, icon: FileText },
    { label: 'Outputs', count: project.linkCounts.outputCount, icon: Box },
  ]
}

export default function ProjectsPage({ workspaceId }: ProjectsPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { openNewChat } = useAppShellContext()
  const { projects, isLoading, refresh } = useProjectList(workspaceId)
  const createProject = useCreateProject(workspaceId)
  const deleteProject = useDeleteProject(workspaceId)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const now = useRelativeNow()

  const hasProjects = projects.length > 0

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

  return (
    <EntityCollectionPage
      title="Projects"
      count={projects.length}
      items={projects}
      isLoading={isLoading}
      isCreating={isCreating}
      createLabel="New Project"
      onCreate={handleCreate}
      emptyIcon={<BriefcaseBusiness className="h-5 w-5" />}
      emptyTitle="No projects yet"
      emptyDescription="Projects are optional workspace organizers for linked chats, docs, outputs, work items, decisions, and notebooks."
      emptyActions={
        <>
          <Button
            variant="outline"
            className="w-full max-w-[240px] justify-start gap-3"
            onClick={() => { void openNewChat?.() }}
          >
            <SquarePen className="h-4 w-4" />
            Start a new chat
          </Button>
          <Button
            variant="outline"
            className="w-full max-w-[240px] justify-start gap-3"
            onClick={() => navigate(routes.view.workQueue())}
          >
            <ListTodo className="h-4 w-4" />
            Open Work Queue
          </Button>
        </>
      }
      nextStepArea={hasProjects ? (
        <WorkflowActions
          actions={[
            { icon: <ListTodo className="h-4 w-4" />, label: 'Open Work Queue', onClick: () => navigate(routes.view.workQueue()) },
            { icon: <SquarePen className="h-4 w-4" />, label: 'Start a new chat', onClick: () => { void openNewChat?.() } },
          ]}
        />
      ) : undefined}
      leadingAction={leadingAction}
      rightSidebarButton={rightSidebarButton}
      renderItem={(project) => {
        const isDeleting = deletingId === project.id

        return (
          <EntityListCard
            key={project.id}
            title={project.name}
            description={project.description || getProjectCountSummary(project)}
            badges={<RelationshipBadgeRow items={getProjectRelationshipItems(project)} />}
            meta={(
              <>
                <span>Updated {formatUpdatedTime(project.updatedAt, now)}</span>
                <span>{project.status}</span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {getProjectCountSummary(project)}
                </span>
              </>
            )}
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            onOpen={() => navigate(routes.view.project(project.id))}
            trailing={(
              <>
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
              </>
            )}
          />
        )
      }}
    />
  )
}
