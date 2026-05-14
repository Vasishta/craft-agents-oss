import * as React from 'react'
import { useAtomValue } from 'jotai'
import { BookOpen, Box, BriefcaseBusiness, DatabaseZap, FileText, GitBranch, ListTodo, MessageSquareText, Search, SquarePen } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SourceAvatar } from '@/components/ui/source-avatar'
import { useActiveWorkspace, useAppShellContext } from '@/context/AppShellContext'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { sourcesAtom } from '@/atoms/sources'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import { useProjectList } from '@/hooks/useProjects'
import { useDecisionList } from '@/hooks/useDecisions'
import { useNotebookList } from '@/hooks/useNotebooks'
import { useWorkItemList } from '@/hooks/useWorkItems'
import { navigate, routes } from '@/lib/navigate'
import { getWorkspaceSessionMetas } from '@/lib/session-meta-selectors'
import { cn } from '@/lib/utils'
import type { Workspace } from '../../shared/types'

interface WorkspaceHomeProps {
  workspaceId: string
}

function getWorkspaceName(workspaces: Workspace[], workspaceId: string): string {
  const workspace = workspaces.find((item) => item.id === workspaceId)
  return workspace?.name || workspace?.slug || workspaceId || 'Workspace'
}

function formatUpdatedTime(timestamp?: number): string {
  if (!timestamp) return 'No recent activity'
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

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 justify-start gap-2 rounded-[8px] px-3"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  )
}

function SnapshotCard({
  label,
  value,
  detail,
  icon,
  onClick,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[10px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
          {icon}
        </span>
      </span>
      <span className="mt-3 block text-2xl font-semibold tracking-normal text-foreground">{value}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
    </button>
  )
}

function RecentRow({
  icon,
  title,
  meta,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  meta: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[54px] w-full grid-cols-[auto_1fr] gap-3 rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-foreground/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {meta}{detail ? ` · ${detail}` : ''}
        </span>
      </span>
    </button>
  )
}

function RecentSection({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const hasChildren = React.Children.count(children) > 0
  return (
    <section className="min-w-0">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{title}</h2>
      <div className={cn(
        'rounded-[8px] border border-border/55 bg-background p-1',
        !hasChildren && 'px-3 py-3'
      )}>
        {hasChildren ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  )
}

export default function WorkspaceHome({ workspaceId }: WorkspaceHomeProps) {
  const { leadingAction, rightSidebarButton, workspaces, openNewChat } = useAppShellContext()
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
      .slice(0, 5),
    [sessionMetaMap, workspaceId, remoteWorkspaceId]
  )

  const recentDocs = React.useMemo(
    () => [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [pages]
  )

  const recentOutputs = React.useMemo(
    () => [...outputs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [outputs]
  )

  const recentProjects = React.useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [projects]
  )

  const recentDecisions = React.useMemo(
    () => [...decisions].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [decisions]
  )

  const recentSources = React.useMemo(
    () => [...sources]
      .sort((a, b) => a.config.name.localeCompare(b.config.name))
      .slice(0, 5),
    [sources]
  )

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
                Workspace Home will show chats, docs, search, and available context once a workspace is active.
              </p>
            </section>
          </main>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Workspace"
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-8 px-5 py-7 sm:px-8">
          <section>
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Workspace</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-normal text-foreground">{workspaceName}</h1>
            <p className="mt-3 max-w-[680px] text-sm leading-6 text-muted-foreground">
              Durable work now lives across docs, outputs, decisions, notebooks, and work items. Use Home as the quickest way to orient, resume, and jump into the right surface.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-foreground">At a glance</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SnapshotCard
                label="Library"
                value={String(pages.length + outputs.length + decisions.length + notebooks.length)}
                detail={`${pages.length} docs, ${outputs.length} outputs, ${decisions.length} decisions, ${notebooks.length} notebooks`}
                icon={<BookOpen className="h-4 w-4" />}
                onClick={() => navigate(routes.view.library())}
              />
              <SnapshotCard
                label="Work Queue"
                value={String(workItems.length)}
                detail={`${workItems.filter((item) => item.status !== 'done').length} active durable items`}
                icon={<ListTodo className="h-4 w-4" />}
                onClick={() => navigate(routes.view.workQueue())}
              />
              <SnapshotCard
                label="Chats"
                value={String(recentChats.length)}
                detail={`${workspaceName} sessions with recent activity`}
                icon={<MessageSquareText className="h-4 w-4" />}
                onClick={() => navigate(routes.view.allSessions())}
              />
              <SnapshotCard
                label="Context"
                value={String(sources.length)}
                detail="Connected files, APIs, MCPs, and local folders"
                icon={<DatabaseZap className="h-4 w-4" />}
                onClick={() => navigate(routes.view.sources())}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-foreground">What do you want to do?</h2>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              <ActionButton
                icon={<SquarePen className="h-4 w-4" />}
                label="Start chat"
                onClick={() => { void openNewChat?.() }}
              />
              <ActionButton
                icon={<FileText className="h-4 w-4" />}
                label="Open docs"
                onClick={() => navigate(routes.view.pages())}
              />
              <ActionButton
                icon={<Box className="h-4 w-4" />}
                label="Open outputs"
                onClick={() => navigate(routes.view.outputs())}
              />
              <ActionButton
                icon={<GitBranch className="h-4 w-4" />}
                label="Review decisions"
                onClick={() => navigate(routes.view.decisions())}
              />
              <ActionButton
                icon={<ListTodo className="h-4 w-4" />}
                label="Open work queue"
                onClick={() => navigate(routes.view.workQueue())}
              />
              <ActionButton
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Open projects"
                onClick={() => navigate(routes.view.projects())}
              />
              <ActionButton
                icon={<Search className="h-4 w-4" />}
                label="Search workspace"
                onClick={() => navigate(routes.view.search())}
              />
              <ActionButton
                icon={<DatabaseZap className="h-4 w-4" />}
                label="Manage files & context"
                onClick={() => navigate(routes.view.sources())}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-foreground">Recent</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <RecentSection title="Recent chats" empty="No recent chats">
                {recentChats.map((session) => (
                  <RecentRow
                    key={session.id}
                    icon={<MessageSquareText className="h-4 w-4" />}
                    title={session.name || session.preview || 'Untitled Chat'}
                    meta={formatUpdatedTime(session.lastMessageAt ?? session.createdAt)}
                    onClick={() => navigate(routes.view.allSessions(session.id))}
                  />
                ))}
              </RecentSection>

              <RecentSection title="Recent docs" empty="No recent docs">
                {recentDocs.map((page) => (
                  <RecentRow
                    key={page.id}
                    icon={<FileText className="h-4 w-4" />}
                    title={page.title || 'Untitled Doc'}
                    meta={formatUpdatedTime(page.updatedAt)}
                    detail={page.outputIdCount > 0 ? 'Created from Output' : page.sourceSessionId ? 'From chat' : undefined}
                    onClick={() => navigate(routes.view.savedPage(page.id))}
                  />
                ))}
              </RecentSection>

              <RecentSection title="Recent outputs" empty="No recent outputs">
                {recentOutputs.map((output) => (
                  <RecentRow
                    key={output.id}
                    icon={<Box className="h-4 w-4" />}
                    title={output.title || 'Untitled Output'}
                    meta={formatUpdatedTime(output.updatedAt)}
                    detail={output.sourceSessionId || output.sourceMessageId ? 'From assistant response' : 'Saved manually'}
                    onClick={() => navigate(routes.view.savedOutput(output.id))}
                  />
                ))}
              </RecentSection>

              <RecentSection title="Recent decisions" empty="No recent decisions">
                {recentDecisions.map((decision) => (
                  <RecentRow
                    key={decision.id}
                    icon={<GitBranch className="h-4 w-4" />}
                    title={decision.title}
                    meta={formatUpdatedTime(decision.updatedAt)}
                    detail={decision.status}
                    onClick={() => navigate(routes.view.decision(decision.id))}
                  />
                ))}
              </RecentSection>

              <RecentSection title="Recent projects" empty="No recent projects">
                {recentProjects.map((project) => (
                  <RecentRow
                    key={project.id}
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    title={project.name || 'Untitled Project'}
                    meta={formatUpdatedTime(project.updatedAt)}
                    detail={project.status}
                    onClick={() => navigate(routes.view.project(project.id))}
                  />
                ))}
              </RecentSection>

              <RecentSection title="Available context" empty="No files or context yet">
                {recentSources.map((source) => (
                  <RecentRow
                    key={source.config.slug}
                    icon={<SourceAvatar source={source} size="sm" />}
                    title={source.config.name}
                    meta={source.config.tagline || source.config.provider || source.config.type}
                    onClick={() => navigate(routes.view.sources({ sourceSlug: source.config.slug }))}
                  />
                ))}
              </RecentSection>
            </div>
          </section>
        </main>
      </ScrollArea>
    </div>
  )
}
