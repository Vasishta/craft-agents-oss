import * as React from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { Archive, Flag, Inbox } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { navigate, routes } from '@/lib/navigate'

interface WorkQueuePageProps {
  workspaceId: string
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

export default function WorkQueuePage({ workspaceId }: WorkQueuePageProps) {
  const { t } = useTranslation()
  const { leadingAction, rightSidebarButton, sessionStatuses } = useAppShellContext()
  const effectiveSessionStatuses = sessionStatuses ?? []
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)

  const workspaceSessions = React.useMemo(
    () => Array.from(sessionMetaMap.values()).filter(session => session.workspaceId === workspaceId && !session.hidden),
    [sessionMetaMap, workspaceId]
  )

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const session of workspaceSessions) {
      const statusId = session.sessionStatus || 'todo'
      counts[statusId] = (counts[statusId] || 0) + 1
    }
    return counts
  }, [workspaceSessions])

  const flaggedCount = workspaceSessions.filter(session => session.isFlagged).length
  const archivedCount = Array.from(sessionMetaMap.values()).filter(session => session.workspaceId === workspaceId && session.hidden).length

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Work Queue"
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[920px] flex-col px-5 py-7 sm:px-8">
          <section className="mb-5">
            <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Work Queue</h1>
            <p className="mt-2 max-w-[640px] text-sm leading-6 text-muted-foreground">
              Actionable work and transitional session-status views are grouped here while WorkItem-backed queues mature.
            </p>
          </section>

          <section aria-label="Work queue sections" className="flex flex-col gap-2">
            <QueueRow
              icon={<Inbox className="h-4 w-4" />}
              title="All Sessions"
              description="Compatibility view for all active chat sessions."
              count={workspaceSessions.length}
              onClick={() => navigate(routes.view.allSessions())}
            />
            {effectiveSessionStatuses.map(status => (
              <QueueRow
                key={status.id}
                icon={status.icon}
                title={t(`status.${status.id}`, status.label)}
                description="Legacy session-status filter."
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
              description="Hidden sessions kept for compatibility and recovery."
              count={archivedCount}
              onClick={() => navigate(routes.view.archived())}
            />
          </section>
        </main>
      </ScrollArea>
    </div>
  )
}
