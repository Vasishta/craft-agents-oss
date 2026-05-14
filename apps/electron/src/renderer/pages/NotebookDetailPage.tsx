import * as React from 'react'
import { ArrowLeft, BookOpen, Box, FileText, GitBranch, Layers, Loader2, MessageSquareText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAppShellContext } from '@/context/AppShellContext'
import { useDeleteNotebook, useNotebook, useUpdateNotebook } from '@/hooks/useNotebooks'
import { navigate, routes } from '@/lib/navigate'
import type { NotebookSection, NotebookStatus } from '../../shared/types'

interface NotebookDetailPageProps {
  workspaceId: string
  notebookId: string
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

export default function NotebookDetailPage({ workspaceId, notebookId }: NotebookDetailPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { notebook, isLoading } = useNotebook(workspaceId, notebookId)
  const deleteNotebook = useDeleteNotebook(workspaceId)
  const updateNotebook = useUpdateNotebook(workspaceId)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    title: '',
    description: '',
    status: 'active' as NotebookStatus,
    sections: [] as Array<{ id: string; title: string; description: string }>,
  })

  React.useEffect(() => {
    if (!notebook) return
    setDraft({
      title: notebook.title,
      description: notebook.description || '',
      status: notebook.status,
      sections: notebook.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
      })),
    })
  }, [notebook])

  const setDraftPatch = React.useCallback((patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const updateSection = React.useCallback((sectionId: string, patch: Partial<{ title: string; description: string }>) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section),
    }))
  }, [])

  const handleDelete = React.useCallback(async () => {
    if (!notebook || isDeleting) return
    const confirmed = window.confirm(`Delete "${notebook.title}"? Linked docs, outputs, and decisions will not be deleted.`)
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteNotebook(notebook.id)
      toast.success('Notebook deleted')
      navigate(routes.view.notebooks())
    } finally {
      setIsDeleting(false)
    }
  }, [deleteNotebook, isDeleting, notebook])

  const handleCancelEdit = React.useCallback(() => {
    if (!notebook) return
    setDraft({
      title: notebook.title,
      description: notebook.description || '',
      status: notebook.status,
      sections: notebook.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
      })),
    })
    setIsEditing(false)
  }, [notebook])

  const handleAddSection = React.useCallback(() => {
    setDraft((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: globalThis.crypto?.randomUUID?.() || `section-${Date.now()}`,
          title: '',
          description: '',
        },
      ],
    }))
  }, [])

  const handleRemoveSection = React.useCallback((sectionId: string) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }))
  }, [])

  const handleSave = React.useCallback(async () => {
    if (!notebook || isSaving) return
    const title = draft.title.trim()
    if (!title) {
      toast.error('Title is required')
      return
    }

    const sections: NotebookSection[] = draft.sections
      .map((section) => ({
        id: section.id,
        title: section.title.trim(),
        description: section.description.trim() || undefined,
        links: {},
      }))
      .filter((section) => section.title)

    setIsSaving(true)
    try {
      const updated = await updateNotebook(notebook.id, {
        title,
        description: draft.description.trim() || undefined,
        status: draft.status,
        sections,
      })
      if (updated) {
        toast.success('Notebook updated')
        setIsEditing(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notebook')
    } finally {
      setIsSaving(false)
    }
  }, [draft, isSaving, notebook, updateNotebook])

  const actions = notebook ? (
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
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isDeleting}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label="Delete notebook"
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
        title={notebook?.title || 'Notebook'}
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
            onClick={() => navigate(routes.view.notebooks())}
          >
            <ArrowLeft className="h-4 w-4" />
            Notebooks
          </Button>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !notebook ? (
            <section className="flex min-h-[320px] items-center justify-center text-center">
              <div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Notebook not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
              </div>
            </section>
          ) : (
            <article className="min-w-0">
              <div className="mb-6 border-b border-border/60 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-foreground/[0.04] text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[28px] font-semibold tracking-normal text-foreground">{notebook.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{notebook.status}</span>
                      <span>Curated durable object collection</span>
                    </div>
                    {!isEditing && notebook.description && (
                      <p className="mt-3 max-w-[720px] text-sm leading-6 text-muted-foreground">{notebook.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="notebook-title">Title</label>
                      <Input id="notebook-title" value={draft.title} onChange={(event) => setDraftPatch({ title: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="notebook-status">Status</label>
                      <Select value={draft.status} onValueChange={(value) => setDraftPatch({ status: value as NotebookStatus })}>
                        <SelectTrigger id="notebook-status" className="bg-background">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="notebook-description">Description</label>
                      <Textarea id="notebook-description" value={draft.description} onChange={(event) => setDraftPatch({ description: event.target.value })} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-medium text-foreground">Sections</h2>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddSection}>
                        <Plus className="h-4 w-4" />
                        Add Section
                      </Button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {draft.sections.length === 0 ? (
                        <div className="rounded-[8px] border border-dashed border-border/70 bg-foreground/[0.02] px-4 py-6 text-sm text-muted-foreground">
                          Add sections to curate docs, outputs, or decisions into a durable notebook flow.
                        </div>
                      ) : draft.sections.map((section) => (
                        <div key={section.id} className="rounded-[8px] border border-border/55 bg-foreground/[0.02] p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-foreground">Section</div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveSection(section.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3">
                            <Input value={section.title} placeholder="Section title" onChange={(event) => updateSection(section.id, { title: event.target.value })} />
                            <Textarea value={section.description} placeholder="Section description" onChange={(event) => updateSection(section.id, { description: event.target.value })} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : notebook.sections.length > 0 ? (
                <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                  <h2 className="mb-3 text-sm font-medium text-foreground">Sections</h2>
                  <div className="flex flex-col gap-3">
                    {notebook.sections.map((section) => (
                      <div key={section.id} className="rounded-[8px] border border-border/55 bg-foreground/[0.02] p-3">
                        <div className="text-sm font-medium text-foreground">{section.title}</div>
                        {section.description && (
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <LinkedCount icon={<Layers className="h-4 w-4" />} label="Projects" count={notebook.links.projectIds.length} />
                <LinkedCount icon={<MessageSquareText className="h-4 w-4" />} label="Chats" count={notebook.links.sessionIds.length} />
                <LinkedCount icon={<FileText className="h-4 w-4" />} label="Docs" count={notebook.links.docIds.length} />
                <LinkedCount icon={<Box className="h-4 w-4" />} label="Outputs" count={notebook.links.outputIds.length} />
                <LinkedCount icon={<GitBranch className="h-4 w-4" />} label="Decisions" count={notebook.links.decisionIds.length} />
                <LinkedCount icon={<BookOpen className="h-4 w-4" />} label="Sources" count={notebook.links.sourceIds.length} />
              </div>
            </article>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
