import * as React from 'react'
import { useAtomValue } from 'jotai'
import { BookOpen, Box, BriefcaseBusiness, DatabaseZap, FileText, GitBranch, ListTodo, MessageSquareText, Search, SquarePen } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SourceAvatar } from '@/components/ui/source-avatar'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { sourcesAtom } from '@/atoms/sources'
import { useActiveWorkspace, useAppShellContext } from '@/context/AppShellContext'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDecisionList } from '@/hooks/useDecisions'
import { useNotebookList } from '@/hooks/useNotebooks'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import { useProjectList } from '@/hooks/useProjects'
import { useWorkItemList } from '@/hooks/useWorkItems'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'
import { getWorkspaceSessionMetas } from '@/lib/session-meta-selectors'
import { buildWorkspaceHomeActivityFeed, buildWorkspaceHomeFocusItems, isSparseWorkspace, type WorkspaceHomeActivityItem, type WorkspaceHomeActivityKind } from '@/lib/workspace-home'
import { LowContextActions } from '@/components/low-context-actions'
import { RecommendedNextStep } from '@/components/recommended-next-step'
import { cn } from '@/lib/utils'
import type { Workspace } from '../../shared/types'

interface WorkspaceHomeProps {
  workspaceId: string
}

function getWorkspaceName(workspaces: Workspace[], workspaceId: string): string {
  const workspace = workspaces.find((item) => item.id === workspaceId)
  return workspace?.name || workspace?.slug || workspaceId || 'Workspace'
}

function getActivityIcon(kind: WorkspaceHomeActivityKind) {
  switch (kind) {
    case 'chat':
      return <MessageSquareText className="h-4 w-4" />
    case 'doc':
      return <FileText className="h-4 w-4" />
    case 'output':
      return <Box className="h-4 w-4" />
    case 'decision':
      return <GitBranch className="h-4 w-4" />
    case 'notebook':
      return <BookOpen className="h-4 w-4" />
    case 'project':
      return <BriefcaseBusiness className="h-4 w-4" />
    case 'workItem':
      return <ListTodo className="h-4 w-4" />
  }
}

function navigateToActivity(item: WorkspaceHomeActivityItem) {
  switch (item.kind) {
    case 'chat':
      navigate(routes.view.allSessions(item.id))
      return
    case 'doc':
      navigate(routes.view.savedPage(item.id))
      return
    case 'output':
      navigate(routes.view.savedOutput(item.id))
      return
    case 'decision':
      navigate(routes.view.decision(item.id))
      return
    case 'notebook':
      navigate(routes.view.notebook(item.id))
      return
    case 'project':
      navigate(routes.view.project(item.id))
      return
    case 'workItem':
      navigate(routes.view.workItem(item.id))
      return
  }
}

function HeroActionButton({
  icon,
  label,
  variant,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  variant: 'default' | 'outline' | 'secondary'
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(
        'h-10 rounded-full px-4',
        variant === 'default' ? 'shadow-[0_10px_30px_rgba(0,0,0,0.18)]' : 'border-border/55 bg-background/80'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  )
}

function SignalButton({
  label,
  value,
  detail,
  onClick,
}: {
  label: string
  value: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start justify-between gap-3 rounded-[16px] border border-border/45 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="text-xl font-semibold tracking-tight text-foreground">{value}</span>
    </button>
  )
}

function FocusCard({
  item,
}: {
  item: WorkspaceHomeActivityItem
}) {
  return (
    <button
      type="button"
      onClick={() => navigateToActivity(item)}
      className="rounded-[18px] border border-border/45 bg-background/75 px-4 py-4 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-foreground/[0.04] text-muted-foreground">
        {getActivityIcon(item.kind)}
      </span>
      <span className="mt-4 block text-sm font-medium text-foreground">{item.title}</span>
      <span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.detail}</span>
    </button>
  )
}

function ActivityRow({
  item,
}: {
  item: WorkspaceHomeActivityItem
}) {
  return (
    <button
      type="button"
      onClick={() => navigateToActivity(item)}
      className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[14px] px-3 py-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
        {getActivityIcon(item.kind)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.detail}</span>
      </span>
      <span className="text-xs text-muted-foreground">{formatUpdatedTime(item.timestamp)}</span>
    </button>
  )
}

function SurfaceButton({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-[14px] border border-border/40 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}

export default function WorkspaceHome({ workspaceId }: WorkspaceHomeProps) {
  const { workspaces, openNewChat } = useAppShellContext()
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const activeWorkspace = useActiveWorkspace()
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const sources = useAtomValue(sourcesAtom)
  const { pages } = usePageList(workspaceId)
  const { outputs } = useOutputList(workspaceId)
  const { projects } = useProjectList(workspaceId)
  const { decisions } = useDecisionList(workspaceId)
  const { notebooks } = useNotebookList(workspaceId)
  const { workItems } = useWorkItemList(workspaceId)

  const workspaceName = getWorkspaceName(workspaces, workspaceId)
  const remoteWorkspaceId = activeWorkspace?.remoteServer?.remoteWorkspaceId

  const recentChats = React.useMemo(
    () => getWorkspaceSessionMetas(sessionMetaMap.values(), workspaceId, remoteWorkspaceId)
      .sort((a, b) => (b.lastMessageAt ?? b.createdAt ?? 0) - (a.lastMessageAt ?? a.createdAt ?? 0))
      .slice(0, 6),
    [sessionMetaMap, workspaceId, remoteWorkspaceId]
  )

  const recentDocs = React.useMemo(
    () => [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [pages]
  )

  const recentOutputs = React.useMemo(
    () => [...outputs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [outputs]
  )

  const recentProjects = React.useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [projects]
  )

  const recentDecisions = React.useMemo(
    () => [...decisions].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [decisions]
  )

  const recentNotebooks = React.useMemo(
    () => [...notebooks].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [notebooks]
  )

  const recentWorkItems = React.useMemo(
    () => [...workItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [workItems]
  )

  const recentSources = React.useMemo(
    () => [...sources].sort((a, b) => a.config.name.localeCompare(b.config.name)).slice(0, 4),
    [sources]
  )

  const focusItems = React.useMemo(
    () => buildWorkspaceHomeFocusItems({
      recentChats,
      recentDocs,
      recentOutputs,
      recentProjects,
      recentWorkItems,
    }).map((item) => ({ ...item, timestamp: 0 })),
    [recentChats, recentDocs, recentOutputs, recentProjects, recentWorkItems]
  )

  const activityFeed = React.useMemo(
    () => buildWorkspaceHomeActivityFeed({
      recentChats,
      recentDocs,
      recentOutputs,
      recentDecisions,
      recentNotebooks,
      recentProjects,
      recentWorkItems,
      limit: 10,
    }),
    [recentChats, recentDocs, recentOutputs, recentDecisions, recentNotebooks, recentProjects, recentWorkItems]
  )

  const isSparse = React.useMemo(
    () => isSparseWorkspace({
      recentChats,
      recentDocs,
      recentOutputs,
      recentDecisions,
      recentNotebooks,
      recentProjects,
      recentWorkItems,
      recentSources,
    }),
    [recentChats, recentDocs, recentOutputs, recentDecisions, recentNotebooks, recentProjects, recentWorkItems, recentSources]
  )

  const libraryCount = pages.length + outputs.length + decisions.length + notebooks.length
  const activeWorkCount = workItems.filter((item) => item.status !== 'done').length

  if (!workspaceId) {
    return (
      <div className="flex h-full flex-col bg-background">
        <PanelHeader
          title="Workspace"
          leadingAction={leadingAction}
          rightSidebarButton={rightSidebarButton}
        />

        <ScrollArea className="min-h-0 flex-1">
          <main className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-[980px] items-center justify-center px-5 py-7 sm:px-8">
            <section className="max-w-[360px] text-center">
              <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Open or create a workspace to begin.</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Workspace Home will surface recent chats, saved work, search, and available context once a workspace is active.
              </p>
            </section>
          </main>
        </ScrollArea>
      </div>
    )
  }

  const shouldRecommendQueue = activeWorkCount > 0

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Workspace"
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-5 py-7 sm:px-8">
          <RecommendedNextStep
            primaryAction={{
              icon: shouldRecommendQueue ? <ListTodo className="h-3.5 w-3.5" /> : <SquarePen className="h-3.5 w-3.5" />,
              label: shouldRecommendQueue ? 'Open Work Queue' : 'Start a new chat',
              onClick: shouldRecommendQueue
                ? () => navigate(routes.view.workQueue())
                : () => { void openNewChat?.() },
            }}
          />
          <section className="relative overflow-hidden rounded-[28px] border border-border/45 bg-background px-6 py-6 sm:px-8">
            <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_62%)]" aria-hidden="true" />
            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_320px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
                <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.03em] text-foreground sm:text-[40px]">{workspaceName}</h1>
                <p className="mt-4 max-w-[680px] text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  Pick up active work, reopen recent artifacts, and move across chats, docs, outputs, decisions, notebooks, and work items without reconstructing the workspace from scratch.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <HeroActionButton
                    icon={<SquarePen className="h-4 w-4" />}
                    label="Start a new chat"
                    variant="default"
                    onClick={() => { void openNewChat?.() }}
                  />
                  <HeroActionButton
                    icon={<ListTodo className="h-4 w-4" />}
                    label="Open Work Queue"
                    variant="secondary"
                    onClick={() => navigate(routes.view.workQueue())}
                  />
                  <HeroActionButton
                    icon={<Search className="h-4 w-4" />}
                    label="Search workspace"
                    variant="outline"
                    onClick={() => navigate(routes.view.search())}
                  />
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <SignalButton
                    label="Active work"
                    value={String(activeWorkCount)}
                    detail={`${workItems.length} total`}
                    onClick={() => navigate(routes.view.workQueue())}
                  />
                  <SignalButton
                    label="Recent chats"
                    value={String(recentChats.length)}
                    detail="Latest conversations"
                    onClick={() => navigate(routes.view.allSessions())}
                  />
                  <SignalButton
                    label="Library"
                    value={String(libraryCount)}
                    detail={`${pages.length} docs, ${outputs.length} outputs, ${decisions.length} decisions`}
                    onClick={() => navigate(routes.view.library())}
                  />
                </div>

                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Resume</p>
                      <p className="mt-1 text-sm text-muted-foreground">The strongest places to continue work right now.</p>
                    </div>
                  </div>

                  {focusItems.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {focusItems.map((item) => (
                        <FocusCard key={`${item.kind}:${item.id}`} item={item} />
                      ))}
                    </div>
                  ) : (
                    <LowContextActions
                      description="Start a chat or save work to build up Home as a place to resume from wherever you left off."
                      actions={[
                        { icon: <SquarePen className="h-4 w-4" />, label: "Start a new chat", detail: "Ask the assistant to help with your work", onClick: () => openNewChat?.() },
                        { icon: <ListTodo className="h-4 w-4" />, label: "Open Work Queue", detail: "Review and manage durable work items", onClick: () => navigate(routes.view.workQueue()) },
                        { icon: <FileText className="h-4 w-4" />, label: "Open Library", detail: "Browse saved docs, outputs, decisions, and notebooks", onClick: () => navigate(routes.view.library()) },
                      ]}
                    />
                  )}
                </div>
              </div>

              {isSparse ? (
                <aside className="rounded-[24px] border border-border/40 bg-foreground/[0.02] p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Start working</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Jump into a conversation, browse saved artifacts, or review queued work.</p>
                  </div>
                  <div className="mt-4">
                    <LowContextActions
                      framed={false}
                      actions={[
                        { icon: <SquarePen className="h-4 w-4" />, label: "Start a new chat", detail: "Ask the assistant to help with your work", onClick: () => openNewChat?.() },
                        { icon: <FileText className="h-4 w-4" />, label: "Open Library", detail: "Browse saved docs, outputs, decisions, and notebooks", onClick: () => navigate(routes.view.library()) },
                        { icon: <ListTodo className="h-4 w-4" />, label: "Open Work Queue", detail: "Review and manage durable work items", onClick: () => navigate(routes.view.workQueue()) },
                      ]}
                    />
                  </div>
                </aside>
              ) : (
                <aside className="rounded-[24px] border border-border/40 bg-foreground/[0.02] p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace signals</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">A compact read on what is active, linked, and reusable here now.</p>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <SignalButton
                      label="Library"
                      value={String(libraryCount)}
                      detail={`${pages.length} docs, ${outputs.length} outputs, ${decisions.length} decisions, ${notebooks.length} notebooks`}
                      onClick={() => navigate(routes.view.library())}
                    />
                    <SignalButton
                      label="Work queue"
                      value={String(activeWorkCount)}
                      detail={`${workItems.length} total work items`}
                      onClick={() => navigate(routes.view.workQueue())}
                    />
                    <SignalButton
                      label="Projects"
                      value={String(projects.length)}
                      detail="Curated work containers"
                      onClick={() => navigate(routes.view.projects())}
                    />
                    <SignalButton
                      label="Context"
                      value={String(sources.length)}
                      detail="Connected files, APIs, MCPs, and folders"
                      onClick={() => navigate(routes.view.sources())}
                    />
                  </div>

                  <div className="mt-5 border-t border-border/45 pt-4">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Available context</p>
                      <p className="mt-1 text-sm text-muted-foreground">Connected sources that can ground the next step.</p>
                    </div>

                    <div className="grid gap-2">
                      {recentSources.length > 0 ? recentSources.map((source) => (
                        <button
                          key={source.config.slug}
                          type="button"
                          onClick={() => navigate(routes.view.sources({ sourceSlug: source.config.slug }))}
                          className="flex items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <SourceAvatar source={source} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{source.config.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{source.config.tagline || source.config.provider || source.config.type}</span>
                          </span>
                        </button>
                      )) : (
                        <p className="text-sm text-muted-foreground">No files or external context connected yet.</p>
                      )}
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
            <div className="rounded-[24px] border border-border/45 bg-background p-4 sm:p-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent activity</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Across the workspace</h2>
                </div>
                <Button type="button" variant="ghost" className="h-8 rounded-full px-3 text-xs" onClick={() => navigate(routes.view.library())}>
                  Open library
                </Button>
              </div>

              {activityFeed.length > 0 ? (
                <div className="grid gap-1">
                  {activityFeed.map((item) => (
                    <ActivityRow key={`${item.kind}:${item.id}`} item={item} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-border/50 bg-foreground/[0.02] px-4 py-6 text-sm text-muted-foreground">
                  No recent durable activity yet. Once you start saving work, Home will surface the freshest artifacts here.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <section className="rounded-[24px] border border-border/45 bg-background p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Surfaces</p>
                  <p className="mt-1 text-sm text-muted-foreground">Jump into the durable views without reopening the whole dashboard.</p>
                </div>
                <div className="grid gap-2">
                  <SurfaceButton
                    icon={<FileText className="h-4 w-4" />}
                    label="Open docs"
                    detail="Review and edit saved documents"
                    onClick={() => navigate(routes.view.pages())}
                  />
                  <SurfaceButton
                    icon={<Box className="h-4 w-4" />}
                    label="Open outputs"
                    detail="Review saved assistant work"
                    onClick={() => navigate(routes.view.outputs())}
                  />
                  <SurfaceButton
                    icon={<GitBranch className="h-4 w-4" />}
                    label="Review decisions"
                    detail="Keep durable decisions visible"
                    onClick={() => navigate(routes.view.decisions())}
                  />
                  <SurfaceButton
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    label="Open projects"
                    detail="Move through linked work containers"
                    onClick={() => navigate(routes.view.projects())}
                  />
                </div>
              </section>

              <section className="rounded-[24px] border border-border/45 bg-background p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Search and context</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use the shell for lookup and grounding, not as another grid of links.</p>
                </div>
                <div className="grid gap-2">
                  <SurfaceButton
                    icon={<Search className="h-4 w-4" />}
                    label="Search workspace"
                    detail="Find the right durable object or chat"
                    onClick={() => navigate(routes.view.search())}
                  />
                  <SurfaceButton
                    icon={<DatabaseZap className="h-4 w-4" />}
                    label="Manage files and context"
                    detail="Inspect connected sources and local folders"
                    onClick={() => navigate(routes.view.sources())}
                  />
                </div>
              </section>
            </div>
          </section>
        </main>
      </ScrollArea>
    </div>
  )
}
