import * as React from 'react'
import { useAtomValue } from 'jotai'
import {
  BookOpen,
  Box,
  BriefcaseBusiness,
  DatabaseZap,
  FileText,
  GitBranch,
  ListTodo,
  MessageSquareText,
  Search,
  SquarePen,
} from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { LowContextActions } from '@/components/low-context-actions'
import { RecommendedNextStep } from '@/components/recommended-next-step'
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
import {
  buildWorkspaceHomeActivityFeed,
  buildWorkspaceHomeFocusItems,
  isSparseWorkspace,
  type WorkspaceHomeActivityItem,
  type WorkspaceHomeActivityKind,
} from '@/lib/workspace-home'
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

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[620px] text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function SummaryButton({
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
      className="grid min-h-[74px] w-full grid-cols-[1fr_auto] gap-3 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">{detail}</span>
      </span>
      <span className="rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground self-start">
        {value}
      </span>
    </button>
  )
}

function HomeListRow({
  item,
  timestamp,
}: {
  item: WorkspaceHomeActivityItem
  timestamp?: number
}) {
  return (
    <button
      type="button"
      onClick={() => navigateToActivity(item)}
      className="grid min-h-[78px] w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
        {getActivityIcon(item.kind)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
        <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">{item.detail}</span>
      </span>
      <span className="flex items-start">
        <span className="rounded-[4px] border border-border/55 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {timestamp ? formatUpdatedTime(timestamp) : item.kind === 'chat' ? 'Chat' : item.kind}
        </span>
      </span>
    </button>
  )
}

function SurfaceRow({
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
      className="grid min-h-[72px] w-full grid-cols-[auto_1fr] items-start gap-3 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">{detail}</span>
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
        <PanelHeader title="Workspace" leadingAction={leadingAction} rightSidebarButton={rightSidebarButton} />
        <ScrollArea className="min-h-0 flex-1">
          <main className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-[980px] items-center justify-center px-5 py-7 sm:px-8">
            <section className="max-w-[360px] text-center">
              <h1 className="text-[22px] font-semibold tracking-normal text-foreground">
                Open or create a workspace to begin.
              </h1>
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
      <PanelHeader title="Workspace" leadingAction={leadingAction} rightSidebarButton={rightSidebarButton} />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          <section className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</p>
            <h1 className="mt-2 text-[22px] font-semibold tracking-normal text-foreground">{workspaceName}</h1>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-muted-foreground">
              Reopen durable work, move between chats and saved artifacts, and keep the next step close without turning Home into a dashboard.
            </p>
          </section>

          <RecommendedNextStep
            primaryAction={{
              icon: shouldRecommendQueue ? <ListTodo className="h-3.5 w-3.5" /> : <SquarePen className="h-3.5 w-3.5" />,
              label: shouldRecommendQueue ? 'Open Work Queue' : 'Start a new chat',
              onClick: shouldRecommendQueue
                ? () => navigate(routes.view.workQueue())
                : () => { void openNewChat?.() },
            }}
          />

          <section className="mb-6 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => { void openNewChat?.() }}>
              <SquarePen className="h-4 w-4" />
              Start a new chat
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => navigate(routes.view.workQueue())}>
              <ListTodo className="h-4 w-4" />
              Open Work Queue
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => navigate(routes.view.search())}>
              <Search className="h-4 w-4" />
              Search workspace
            </Button>
          </section>

          <section aria-label="Workspace summary" className="mb-6 grid gap-2 md:grid-cols-4">
            <SummaryButton
              label="Active work"
              value={String(activeWorkCount)}
              detail={`${workItems.length} total items`}
              onClick={() => navigate(routes.view.workQueue())}
            />
            <SummaryButton
              label="Recent chats"
              value={String(recentChats.length)}
              detail="Latest conversations"
              onClick={() => navigate(routes.view.allSessions())}
            />
            <SummaryButton
              label="Library"
              value={String(libraryCount)}
              detail={`${pages.length} docs, ${outputs.length} outputs`}
              onClick={() => navigate(routes.view.library())}
            />
            <SummaryButton
              label="Context"
              value={String(recentSources.length)}
              detail="Connected sources"
              onClick={() => navigate(routes.view.sources())}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <section className="mb-6">
                <SectionHeading
                  eyebrow="Continue"
                  title="Pick up where work is already moving"
                  description="The strongest items to continue right now across tasks, conversations, and saved artifacts."
                />
                <div className="mt-3 flex flex-col gap-2">
                  {focusItems.length > 0 ? (
                    focusItems.map((item) => (
                      <HomeListRow key={`${item.kind}:${item.id}`} item={item} />
                    ))
                  ) : (
                    <LowContextActions
                      framed={false}
                      description="Start a chat or save work to turn Home into a useful index instead of a static overview."
                      actions={[
                        { icon: <SquarePen className="h-4 w-4" />, label: 'Start a new chat', detail: 'Ask the assistant to help with your work', onClick: () => openNewChat?.() },
                        { icon: <ListTodo className="h-4 w-4" />, label: 'Open Work Queue', detail: 'Review and manage durable work items', onClick: () => navigate(routes.view.workQueue()) },
                        { icon: <FileText className="h-4 w-4" />, label: 'Open Library', detail: 'Browse saved docs, outputs, decisions, and notebooks', onClick: () => navigate(routes.view.library()) },
                      ]}
                    />
                  )}
                </div>
              </section>

              <section>
                <SectionHeading
                  eyebrow="Recent activity"
                  title="Across the workspace"
                  description="A tight activity feed that keeps the newest durable objects visible without another dashboard."
                  action={(
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-[7px] px-2.5 text-xs"
                      onClick={() => navigate(routes.view.library())}
                    >
                      Open library
                    </Button>
                  )}
                />
                <div className="mt-3 flex flex-col gap-2">
                  {activityFeed.length > 0 ? (
                    activityFeed.map((item) => (
                      <HomeListRow key={`${item.kind}:${item.id}`} item={item} timestamp={item.timestamp} />
                    ))
                  ) : (
                    <div className="rounded-[8px] border border-dashed border-border/70 bg-foreground/[0.02] px-4 py-6 text-sm text-muted-foreground">
                      No recent durable activity yet. Once you start saving work, Home will keep the freshest objects here.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="min-w-0">
              <section className="mb-5">
                <SectionHeading
                  eyebrow="Workspace surfaces"
                  title="Move directly into a working view"
                  description="Use Home as an index into the shell, not as a destination."
                />
                <div className="mt-3 flex flex-col gap-2">
                  <SurfaceRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Open docs"
                    detail="Review and edit saved documents."
                    onClick={() => navigate(routes.view.pages())}
                  />
                  <SurfaceRow
                    icon={<Box className="h-4 w-4" />}
                    label="Open outputs"
                    detail="Review saved assistant work."
                    onClick={() => navigate(routes.view.outputs())}
                  />
                  <SurfaceRow
                    icon={<GitBranch className="h-4 w-4" />}
                    label="Review decisions"
                    detail="Keep durable decisions visible."
                    onClick={() => navigate(routes.view.decisions())}
                  />
                  <SurfaceRow
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    label="Open projects"
                    detail="Move through linked work containers."
                    onClick={() => navigate(routes.view.projects())}
                  />
                </div>
              </section>

              <section className="mb-5">
                <SectionHeading
                  eyebrow="Context"
                  title={isSparse ? 'Start connecting context' : 'Available sources'}
                  description={
                    isSparse
                      ? 'Home stays intentionally quiet until files, APIs, and saved work start to accumulate.'
                      : 'Connected files, APIs, MCPs, and folders that can ground the next step.'
                  }
                />
                <div className="mt-3 flex flex-col gap-2">
                  {recentSources.length > 0 ? (
                    recentSources.map((source) => (
                      <button
                        key={source.config.slug}
                        type="button"
                        onClick={() => navigate(routes.view.sources({ sourceSlug: source.config.slug }))}
                        className="grid min-h-[72px] w-full grid-cols-[auto_1fr] items-start gap-3 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <span className="mt-0.5">
                          <SourceAvatar source={source} size="sm" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{source.config.name}</span>
                          <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">
                            {source.config.tagline || source.config.provider || source.config.type}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[8px] border border-dashed border-border/70 bg-foreground/[0.02] px-4 py-6 text-sm text-muted-foreground">
                      No files or external context connected yet.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionHeading
                  eyebrow="Search"
                  title="Lookup and routing"
                  description="Use the shell for navigation and grounding instead of filling Home with decorative modules."
                />
                <div className="mt-3 flex flex-col gap-2">
                  <SurfaceRow
                    icon={<Search className="h-4 w-4" />}
                    label="Search workspace"
                    detail="Find the right durable object or chat."
                    onClick={() => navigate(routes.view.search())}
                  />
                  <SurfaceRow
                    icon={<DatabaseZap className="h-4 w-4" />}
                    label="Manage files and context"
                    detail="Inspect connected sources and local folders."
                    onClick={() => navigate(routes.view.sources())}
                  />
                </div>
              </section>
            </aside>
          </section>
        </main>
      </ScrollArea>
    </div>
  )
}
