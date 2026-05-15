import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateProject, useLinkProjectObjects, useProjectList } from '@/hooks/useProjects'
import { buildProjectLinkPatch, type ProjectLinkableKind } from '@/lib/cross-object-linking'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProjectLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  entityKind: ProjectLinkableKind
  entityId: string
  entityTitle: string
  entityLabel: string
}

export function ProjectLinkDialog({
  open,
  onOpenChange,
  workspaceId,
  entityKind,
  entityId,
  entityTitle,
  entityLabel,
}: ProjectLinkDialogProps) {
  const { projects, isLoading } = useProjectList(workspaceId)
  const createProject = useCreateProject(workspaceId)
  const linkProjectObjects = useLinkProjectObjects(workspaceId)
  const [mode, setMode] = React.useState<'existing' | 'new'>('existing')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('')
  const [newProjectName, setNewProjectName] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setMode(projects.length > 0 ? 'existing' : 'new')
    setSelectedProjectId(projects[0]?.id || '')
    setNewProjectName(entityTitle.trim())
  }, [entityTitle, open, projects])

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (mode === 'existing') {
        if (!selectedProjectId) {
          toast.error('Select a project first')
          return
        }
        const linked = await linkProjectObjects(selectedProjectId, buildProjectLinkPatch(entityKind, entityId))
        if (linked) {
          toast.success(`${entityLabel} linked to ${linked.name}`)
          onOpenChange(false)
        } else {
          toast.error(`Failed to link ${entityLabel.toLowerCase()} to project`)
        }
        return
      }

      const name = newProjectName.trim()
      if (!name) {
        toast.error('Project name is required')
        return
      }
      const created = await createProject({
        name,
        links: buildProjectLinkPatch(entityKind, entityId),
      })
      if (created) {
        toast.success(`${entityLabel} linked to new project`)
        onOpenChange(false)
      } else {
        toast.error('Failed to create project')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    createProject,
    entityId,
    entityKind,
    entityLabel,
    isSubmitting,
    linkProjectObjects,
    mode,
    newProjectName,
    onOpenChange,
    selectedProjectId,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach to Project</DialogTitle>
          <DialogDescription>
            Link this {entityLabel.toLowerCase()} to an existing project or create a new one around it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {projects.length > 0 ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="project-link-mode">Link mode</label>
              <Select value={mode} onValueChange={(value) => setMode(value as 'existing' | 'new')}>
                <SelectTrigger id="project-link-mode" className="bg-background">
                  <SelectValue placeholder="Choose how to attach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Attach to existing project</SelectItem>
                  <SelectItem value="new">Create new project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {mode === 'existing' && projects.length > 0 ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="project-link-target">Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-link-target" className="bg-background">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new-project-name">Project name</label>
              <Input
                id="new-project-name"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => { void handleSubmit() }} disabled={isSubmitting || isLoading}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {mode === 'existing' ? 'Attach' : 'Create & Attach'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
