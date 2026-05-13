import * as React from 'react'
import { Box, ChevronRight, FileText, GitBranch, NotebookTabs } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext } from '@/context/AppShellContext'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import { navigate, routes } from '@/lib/navigate'

interface LibraryPageProps {
  workspaceId: string
}

interface LibraryRowProps {
  icon: React.ReactNode
  title: string
  description: string
  count?: number
  actionLabel?: string
  onClick?: () => void
}

function LibraryRow({ icon, title, description, count, actionLabel, onClick }: LibraryRowProps) {
  const content = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
      <span className="flex items-center gap-3">
        {count !== undefined && (
          <span className="rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {count}
          </span>
        )}
        {actionLabel && (
          <span className="inline-flex items-center gap-1 rounded-[7px] border border-border/55 px-2 py-1 text-xs font-medium text-muted-foreground">
            <span>{actionLabel}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group grid min-h-[82px] w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="grid min-h-[82px] w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left"
    >
      {content}
    </div>
  )
}

export default function LibraryPage({ workspaceId }: LibraryPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { pages } = usePageList(workspaceId)
  const { outputs } = useOutputList(workspaceId)

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Library"
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[920px] flex-col px-5 py-7 sm:px-8">
          <section className="mb-5">
            <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Library</h1>
            <p className="mt-2 max-w-[620px] text-sm leading-6 text-muted-foreground">
              Durable workspace knowledge lives here, with existing docs and outputs kept reachable while decisions and notebooks mature.
            </p>
          </section>

          <section aria-label="Library sections" className="flex flex-col gap-2">
            <LibraryRow
              icon={<FileText className="h-4 w-4" />}
              title="Docs"
              description="Saved pages and markdown documents."
              count={pages.length}
              actionLabel="Open"
              onClick={() => navigate(routes.view.pages())}
            />
            <LibraryRow
              icon={<Box className="h-4 w-4" />}
              title="Outputs"
              description="Saved assistant responses awaiting review, reuse, or promotion."
              count={outputs.length}
              actionLabel="Open"
              onClick={() => navigate(routes.view.outputs())}
            />
            <LibraryRow
              icon={<GitBranch className="h-4 w-4" />}
              title="Decisions"
              description="Decision records are part of the durable model and will get a dedicated browser in a follow-up."
            />
            <LibraryRow
              icon={<NotebookTabs className="h-4 w-4" />}
              title="Notebooks"
              description="Curated collections across docs, outputs, decisions, sources, and chats."
            />
          </section>
        </main>
      </ScrollArea>
    </div>
  )
}
