import * as React from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { Archive, ArrowLeft, Box, FileText, Flag, Inbox, LayoutDashboard, Loader2, MessageSquareText, Plus, Search, SquarePen, Trash2 } from 'lucide-react'
import { LowContextActions } from '@/components/low-context-actions'
import { toast } from 'sonner'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { EntityNotFoundState } from '@/components/entity/EntityPageState'
import { RelationshipBadgeRow } from '@/components/entity/RelationshipBadgeRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useActiveWorkspace, useAppShellContext } from '@/context/AppShellContext'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useRelativeNow } from '@/hooks/useRelativeNow'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { buildSessionStatusCounts, buildWorkQueueSummary } from '@/lib/session-meta-selectors'
import {
  buildWorkItemStatusCounts,
  filterWorkItemsByStatus,
  getWorkItemLinkSummary,
  WORK_ITEM_STATUS_LABELS,
  WORK_ITEM_STATUS_ORDER,
  type WorkItemFilter,
} from '@/lib/workitem-meta'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'
import { RecommendedNextStep } from '@/components/recommended-next-step'
import {
  useCreateWorkItem,
  useDeleteWorkItem,
  useWorkItem,
  useUpdateWorkItem,
  useWorkItemList,
} from '@/hooks/useWorkItems'
import type {
  CreateWorkItemInput,
  WorkItemIndexEntry,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
} from '../../shared/types'

interface WorkQueuePageProps {
  workspaceId: string
  workItemId?: string
}

interface QueueRowProps {
  icon: React.ReactNode
  title: string
  description: string
  count: number
  onClick: () => void
}

function QueueRow({ icon, title, description, count, onClick }: QueueRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[76px] w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
      <span className="rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {count}
      </span>
    </button>
  )
}

function getWorkItemRelationshipItems(workItem: WorkItemIndexEntry) {
  return [
    { label: 'Chats', count: workItem.linkCounts.sessionCount, icon: MessageSquareText },
    { label: 'Docs', count: workItem.linkCounts.docCount, icon: FileText },
    { label: 'Outputs', count: workItem.linkCounts.outputCount, icon: Box },
  ]
}

function getWorkItemTypeLabel(type: WorkItemType | undefined): string {
  if (!type) return 'Task'
  return type.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function StatusFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-8 items-center gap-2 rounded-[7px] border px-2.5 text-xs font-medium transition-colors',
        active
          ? 'border-foreground/15 bg-foreground text-background'
          : 'border-border/55 bg-background text-muted-foreground hover:border-border hover:text-foreground',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className={active ? 'text-background/75' : 'text-muted-foreground'}>{count}</span>
    </button>
  )
}

function WorkItemCard({
  workItem,
  now,
  isUpdating,
  isDeleting,
  onStatusChange,
  onDelete,
}: {
  workItem: WorkItemIndexEntry
  now: number
  isUpdating: boolean
  isDeleting: boolean
  onStatusChange: (status: WorkItemStatus) => void
  onDelete: () => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-medium text-foreground">{workItem.title}</h2>
          <span className="rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {WORK_ITEM_STATUS_LABELS[workItem.status]}
          </span>
          {workItem.priority && (
            <span className="rounded-[4px] border border-border/55 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {workItem.priority}
            </span>
          )}
          <span className="rounded-[4px] border border-border/55 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {getWorkItemTypeLabel(workItem.type)}
          </span>
          {workItem.area && (
            <span className="rounded-[4px] border border-border/55 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {workItem.area}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Updated {formatUpdatedTime(workItem.updatedAt, now)}</span>
        </div>
        {workItem.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{workItem.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select value={workItem.status} onValueChange={(value) => onStatusChange(value as WorkItemStatus)} disabled={isUpdating || isDeleting}>
          <SelectTrigger className="h-8 w-[148px] bg-background text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {WORK_ITEM_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {WORK_ITEM_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${workItem.title}`}
          disabled={isUpdating || isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export default function WorkQueuePage({ workspaceId, workItemId }: WorkQueuePageProps) {
  const { t } = useTranslation()
  const { sessionStatuses, openNewChat } = useAppShellContext()
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const activeWorkspace = useActiveWorkspace()
  const effectiveSessionStatuses = sessionStatuses ?? []
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const remoteWorkspaceId = activeWorkspace?.remoteServer?.remoteWorkspaceId
  const { workItems, isLoading, refresh } = useWorkItemList(workspaceId)
  const { workItem, isLoading: isWorkItemLoading } = useWorkItem(workspaceId, workItemId ?? null)
  const createWorkItem = useCreateWorkItem(workspaceId)
  const updateWorkItem = useUpdateWorkItem(workspaceId)
  const deleteWorkItem = useDeleteWorkItem(workspaceId)
  const [filter, setFilter] = React.useState<WorkItemFilter>('all')
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<CreateWorkItemInput>({
    title: '',
    description: '',
    status: 'backlog',
    priority: 'P2',
    type: 'task',
    area: '',
  })

  const { activeSessionMetas, flaggedCount, archivedCount } = React.useMemo(
    () => buildWorkQueueSummary(sessionMetaMap.values(), workspaceId, remoteWorkspaceId),
    [sessionMetaMap, workspaceId, remoteWorkspaceId]
  )

  const statusCounts = React.useMemo(() => {
    return buildSessionStatusCounts(
      activeSessionMetas,
      effectiveSessionStatuses.map((status) => status.id)
    )
  }, [activeSessionMetas, effectiveSessionStatuses])

  const workItemCounts = React.useMemo(() => buildWorkItemStatusCounts(workItems), [workItems])
  const filteredWorkItems = React.useMemo(() => filterWorkItemsByStatus(workItems, filter), [workItems, filter])
  const now = useRelativeNow()

  const handleDraftChange = React.useCallback((patch: Partial<CreateWorkItemInput>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const resetDraft = React.useCallback(() => {
    setDraft({
      title: '',
      description: '',
      status: 'backlog',
      priority: 'P2',
      type: 'task',
      area: '',
    })
  }, [])

  const handleCreate = React.useCallback(async () => {
    const title = draft.title?.trim()
    if (!workspaceId || !title) return

    setIsCreating(true)
    try {
      const created = await createWorkItem({
        title,
        description: draft.description?.trim() || undefined,
        status: draft.status,
        priority: draft.priority,
        type: draft.type,
        area: draft.area?.trim() || undefined,
      })

      if (created) {
        toast.success('Work item created')
        resetDraft()
        setIsComposerOpen(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create work item')
    } finally {
      setIsCreating(false)
    }
  }, [createWorkItem, draft, resetDraft, workspaceId])

  const handleStatusChange = React.useCallback(async (workItemId: string, status: WorkItemStatus) => {
    setUpdatingId(workItemId)
    try {
      await updateWorkItem(workItemId, { status })
      toast.success(`Moved to ${WORK_ITEM_STATUS_LABELS[status]}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update work item')
    } finally {
      setUpdatingId(null)
    }
  }, [updateWorkItem])

  const handleDelete = React.useCallback(async (workItem: Pick<WorkItemIndexEntry, 'id' | 'title'>) => {
    const confirmed = window.confirm(`Delete "${workItem.title}"?`)
    if (!confirmed) return

    setDeletingId(workItem.id)
    try {
      await deleteWorkItem(workItem.id)
      toast.success('Work item deleted')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete work item')
    } finally {
      setDeletingId(null)
    }
  }, [deleteWorkItem, refresh])

  const actions = (
    <Button
      type="button"
      size="sm"
      onClick={() => setIsComposerOpen((current) => !current)}
      disabled={!workspaceId}
    >
      <Plus className="h-4 w-4" />
      New Work Item
    </Button>
  )

  if (workItemId) {
    const detailActions = workItem ? (
      <div className="flex items-center gap-2">
        <Select value={workItem.status} onValueChange={(value) => { void handleStatusChange(workItem.id, value as WorkItemStatus) }} disabled={updatingId === workItem.id || deletingId === workItem.id}>
          <SelectTrigger className="h-8 w-[148px] bg-background text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {WORK_ITEM_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {WORK_ITEM_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Delete work item"
          disabled={updatingId === workItem.id || deletingId === workItem.id}
          onClick={() => { void handleDelete(workItem) }}
        >
          {deletingId === workItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    ) : null

    return (
      <div className="flex h-full flex-col bg-background">
        <PanelHeader
          title={workItem?.title || 'Work Item'}
          leadingAction={leadingAction}
          actions={detailActions}
          rightSidebarButton={rightSidebarButton}
        />

        <ScrollArea className="min-h-0 flex-1">
          <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-5 w-fit text-muted-foreground"
              onClick={() => navigate(routes.view.workQueue())}
            >
              <ArrowLeft className="h-4 w-4" />
              Work Queue
            </Button>

            {isWorkItemLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : !workItem ? (
              <EntityNotFoundState title="Work item not found" description="It may have been deleted or moved." />
            ) : (
              <article className="min-w-0">
                <div className="mb-6 border-b border-border/60 pb-4">
                  <h1 className="text-[28px] font-semibold tracking-normal text-foreground">{workItem.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{WORK_ITEM_STATUS_LABELS[workItem.status]}</span>
                    {workItem.priority ? <span>{workItem.priority}</span> : null}
                    <span>{getWorkItemTypeLabel(workItem.type)}</span>
                    {workItem.area ? <span>{workItem.area}</span> : null}
                    <span>Updated {formatUpdatedTime(workItem.updatedAt, now)}</span>
                  </div>
                </div>

                {workItem.description ? (
                  <section className="mb-5 rounded-[8px] border border-border/55 bg-background p-4">
                    <h2 className="mb-2 text-sm font-medium text-foreground">Notes</h2>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{workItem.description}</p>
                  </section>
                ) : null}

                <section className="rounded-[8px] border border-border/55 bg-background p-4">
                  <h2 className="mb-2 text-sm font-medium text-foreground">Linked objects</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{getWorkItemLinkSummary(workItem)}</p>
                </section>
              </article>
            )}
          </main>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Work Queue"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {workItems.length}
          </span>
        )}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          <section className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Work Queue</h1>
            <p className="mt-2 max-w-[640px] text-sm leading-6 text-muted-foreground">
              Work items are durable tasks independent of chat sessions. Session views below let you browse conversations alongside work items.
            </p>
          </section>

          {(() => {
            const openItems = workItems.filter((item) => item.status !== 'done')
            if (openItems.length > 0) {
              const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }
              const topItem = [...openItems].sort((a, b) => {
                const pa = a.priority ? (priorityOrder[a.priority] ?? 4) : 4
                const pb = b.priority ? (priorityOrder[b.priority] ?? 4) : 4
                return pa - pb
              })[0]
              return (
                <RecommendedNextStep
                  primaryAction={{
                    label: topItem.title,
                    onClick: () => navigate(routes.view.workItem(topItem.id)),
                  }}
                  secondaryAction={{
                    icon: <SquarePen className="h-3.5 w-3.5" />,
                    label: 'Start a new chat',
                    onClick: () => { void openNewChat?.() },
                  }}
                />
              )
            }
            return (
              <RecommendedNextStep
                primaryAction={{
                  icon: <SquarePen className="h-3.5 w-3.5" />,
                  label: 'Start a new chat',
                  onClick: () => { void openNewChat?.() },
                }}
              />
            )
          })()}

          {!workspaceId ? (
            <section className="flex min-h-[280px] items-center justify-center text-center">
              <div>
                <h2 className="text-lg font-semibold text-foreground">No active workspace</h2>
                <p className="mt-2 max-w-[420px] text-sm leading-6 text-muted-foreground">
                  Select a workspace before creating or reviewing work items.
                </p>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    className="w-[220px] justify-start gap-3"
                    onClick={() => navigate(routes.view.home())}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Workspace Home
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="mb-6 flex flex-col gap-3 rounded-[8px] border border-border/55 bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusFilterButton
                    active={filter === 'all'}
                    label="All"
                    count={workItems.length}
                    onClick={() => setFilter('all')}
                  />
                  {WORK_ITEM_STATUS_ORDER.map((status) => (
                    <StatusFilterButton
                      key={status}
                      active={filter === status}
                      label={WORK_ITEM_STATUS_LABELS[status]}
                      count={workItemCounts[status]}
                      onClick={() => setFilter(status)}
                    />
                  ))}
                </div>

                {(isComposerOpen || workItems.length === 0) && (
                  <div className="grid gap-3 rounded-[8px] border border-dashed border-border/70 bg-foreground/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_180px_140px]">
                    <div className="lg:col-span-3">
                      <Input
                        value={draft.title || ''}
                        placeholder="Work item title"
                        onChange={(event) => handleDraftChange({ title: event.target.value })}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <Textarea
                        value={draft.description || ''}
                        placeholder="Description or acceptance notes"
                        onChange={(event) => handleDraftChange({ description: event.target.value })}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:col-span-3">
                      <Select value={draft.status || 'backlog'} onValueChange={(value) => handleDraftChange({ status: value as WorkItemStatus })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORK_ITEM_STATUS_ORDER.map((status) => (
                            <SelectItem key={status} value={status}>
                              {WORK_ITEM_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={draft.priority || 'none'} onValueChange={(value) => handleDraftChange({ priority: value === 'none' ? undefined : value as WorkItemPriority })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No priority</SelectItem>
                          <SelectItem value="P0">P0</SelectItem>
                          <SelectItem value="P1">P1</SelectItem>
                          <SelectItem value="P2">P2</SelectItem>
                          <SelectItem value="P3">P3</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={draft.type || 'task'} onValueChange={(value) => handleDraftChange({ type: value as WorkItemType })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="tech_debt">Tech Debt</SelectItem>
                          <SelectItem value="spike">Spike</SelectItem>
                          <SelectItem value="story">Story</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="lg:col-span-2">
                      <Input
                        value={draft.area || ''}
                        placeholder="Area or ownership"
                        onChange={(event) => handleDraftChange({ area: event.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          resetDraft()
                          setIsComposerOpen(false)
                        }}
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => { void handleCreate() }} disabled={isCreating || !draft.title?.trim()}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              <section aria-label="Work items" className="flex flex-col gap-2">
                {isLoading && workItems.length === 0 ? (
                  <div className="flex min-h-[180px] items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredWorkItems.length === 0 ? (
                  <div className="rounded-[8px] border border-border/55 bg-background px-4 py-8 text-center">
                    <h2 className="text-sm font-medium text-foreground">No work items in this view</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {filter === 'all'
                        ? 'No queued work yet. Start a new chat to create work, open Home for a quick workspace overview, or browse the Library for saved context.'
                        : `Move an item into ${WORK_ITEM_STATUS_LABELS[filter]} or switch filters.`}
                    </p>
                    {filter === 'all' && (
                      <div className="mt-5 flex flex-col items-center">
                        <div className="w-56">
                          <LowContextActions
                            compact
                            actions={[
                              { icon: <SquarePen className="h-4 w-4" />, label: "Start a new chat", onClick: () => { void openNewChat?.() } },
                              { icon: <LayoutDashboard className="h-4 w-4" />, label: "Go to Workspace Home", onClick: () => navigate(routes.view.home()) },
                              { icon: <FileText className="h-4 w-4" />, label: "Open Library", onClick: () => navigate(routes.view.library()) },
                            ]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredWorkItems.map((workItem) => (
                    <div key={workItem.id} className="rounded-[8px] border border-border/55 bg-background px-4 py-3">
                      <WorkItemCard
                        workItem={workItem}
                        now={now}
                        isUpdating={updatingId === workItem.id}
                        isDeleting={deletingId === workItem.id}
                        onStatusChange={(status) => { void handleStatusChange(workItem.id, status) }}
                        onDelete={() => { void handleDelete(workItem) }}
                      />
                      {(() => {
                        const relItems = getWorkItemRelationshipItems(workItem)
                        const hasLinks = relItems.some((item) => item.count > 0)
                        if (!hasLinks) return null
                        return (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <RelationshipBadgeRow items={relItems} />
                          </div>
                        )
                      })()}
                    </div>
                  ))
                )}
              </section>

              <Separator className="my-6" />

              <section className="mb-3">
                <h2 className="text-sm font-medium text-foreground">Session views</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Browse active sessions, flagged conversations, and archived history alongside work items.
                </p>
              </section>

              <section aria-label="Session views" className="flex flex-col gap-2">
                <QueueRow
                  icon={<Inbox className="h-4 w-4" />}
                  title="All Sessions"
                  description="Browse all active chat sessions."
                  count={activeSessionMetas.length}
                  onClick={() => navigate(routes.view.allSessions())}
                />
                {effectiveSessionStatuses.map(status => (
                  <QueueRow
                    key={status.id}
                    icon={status.icon}
                    title={t(`status.${status.id}`, status.label)}
                    description="Filter sessions by status."
                    count={statusCounts[status.id] || 0}
                    onClick={() => navigate(routes.view.state(status.id))}
                  />
                ))}
                <QueueRow
                  icon={<Flag className="h-4 w-4" />}
                  title="Flagged"
                  description="Sessions marked for follow-up."
                  count={flaggedCount}
                  onClick={() => navigate(routes.view.flagged())}
                />
                <QueueRow
                  icon={<Archive className="h-4 w-4" />}
                  title="Archived"
                  description="Review archived sessions."
                  count={archivedCount}
                  onClick={() => navigate(routes.view.archived())}
                />
              </section>
            </>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
