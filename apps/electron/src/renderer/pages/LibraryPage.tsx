import * as React from 'react'
import { BookOpen, Box, FileText, GitBranch, Loader2 } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDecisionList } from '@/hooks/useDecisions'
import { useNotebookList } from '@/hooks/useNotebooks'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import {
  buildLibraryCounts,
  filterLibraryItems,
  formatKindLabel,
  normalizeLibraryItems,
  type LibraryFilter,
  type LibraryItem,
} from '@/lib/library-meta'
import { formatUpdatedTime } from '@/lib/format-updated-time'
import { navigate, routes } from '@/lib/navigate'

interface LibraryPageProps {
  workspaceId: string
}

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'All',
  doc: 'Docs',
  output: 'Outputs',
  decision: 'Decisions',
  notebook: 'Notebooks',
}

function FilterButton({
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

function LibrarySummaryCard({
  title,
  description,
  count,
  icon,
  onClick,
}: {
  title: string
  description: string
  count: number
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[86px] w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

function getItemIcon(kind: LibraryItem['kind']) {
  switch (kind) {
    case 'doc':
      return <FileText className="h-4 w-4" />
    case 'output':
      return <Box className="h-4 w-4" />
    case 'decision':
      return <GitBranch className="h-4 w-4" />
    case 'notebook':
      return <BookOpen className="h-4 w-4" />
  }
}

function openLibraryItem(item: LibraryItem) {
  switch (item.kind) {
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
  }
}

export default function LibraryPage({ workspaceId }: LibraryPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const { pages } = usePageList(workspaceId)
  const { outputs, isLoading: outputsLoading } = useOutputList(workspaceId)
  const { decisions, isLoading: decisionsLoading } = useDecisionList(workspaceId)
  const { notebooks, isLoading: notebooksLoading } = useNotebookList(workspaceId)
  const [filter, setFilter] = React.useState<LibraryFilter>('all')
  const now = Date.now()

  const items = React.useMemo(() => normalizeLibraryItems({
    pages,
    outputs,
    decisions,
    notebooks,
  }), [decisions, notebooks, outputs, pages])
  const counts = React.useMemo(() => buildLibraryCounts(items), [items])
  const filteredItems = React.useMemo(() => filterLibraryItems(items, filter), [filter, items])
  const isLoading = outputsLoading || decisionsLoading || notebooksLoading

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Library"
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {items.length}
          </span>
        )}
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          <section className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Library</h1>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-muted-foreground">
              Durable workspace knowledge lives here across docs, outputs, decisions, and notebooks, without forcing Project or Notebook to be the hard parent of everything.
            </p>
          </section>

          <section aria-label="Library object summaries" className="mb-6 grid gap-2 md:grid-cols-2">
            <LibrarySummaryCard
              title="Docs"
              description="Saved pages and durable markdown documents."
              count={counts.doc}
              icon={<FileText className="h-4 w-4" />}
              onClick={() => navigate(routes.view.pages())}
            />
            <LibrarySummaryCard
              title="Outputs"
              description="Saved responses ready for review, reuse, or promotion."
              count={counts.output}
              icon={<Box className="h-4 w-4" />}
              onClick={() => navigate(routes.view.outputs())}
            />
            <LibrarySummaryCard
              title="Decisions"
              description="Durable architecture and product choices with provenance."
              count={counts.decision}
              icon={<GitBranch className="h-4 w-4" />}
              onClick={() => navigate(routes.view.decisions())}
            />
            <LibrarySummaryCard
              title="Notebooks"
              description="Curated collections across docs, outputs, decisions, and chats."
              count={counts.notebook}
              icon={<BookOpen className="h-4 w-4" />}
              onClick={() => navigate(routes.view.notebooks())}
            />
          </section>

          <section className="mb-4 flex flex-wrap items-center gap-2">
            {(Object.keys(FILTER_LABELS) as LibraryFilter[]).map((key) => (
              <FilterButton
                key={key}
                active={filter === key}
                label={FILTER_LABELS[key]}
                count={counts[key]}
                onClick={() => setFilter(key)}
              />
            ))}
          </section>

          <section aria-label="Library items" className="flex flex-col gap-2">
            {isLoading && items.length === 0 ? (
              <div className="flex min-h-[180px] items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[8px] border border-border/55 bg-background px-4 py-8 text-center">
                <h2 className="text-sm font-medium text-foreground">No library items in this view</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {filter === 'all'
                    ? 'Save docs, outputs, decisions, or notebooks to build durable workspace memory.'
                    : `No ${FILTER_LABELS[filter].toLowerCase()} match this filter yet.`}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={`${item.kind}:${item.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLibraryItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openLibraryItem(item)
                    }
                  }}
                  className="group grid min-h-[92px] cursor-pointer grid-cols-[1fr_auto] gap-4 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                      {getItemIcon(item.kind)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                      <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">{item.description}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Updated {formatUpdatedTime(item.updatedAt, now)}</span>
                        <span>{item.metaLabel}</span>
                        <span>{item.provenance}</span>
                      </span>
                    </span>
                  </span>
                  <span className="flex items-start">
                    <span className="rounded-[4px] border border-border/55 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {formatKindLabel(item.kind)}
                    </span>
                  </span>
                </div>
              ))
            )}
          </section>
        </main>
      </ScrollArea>
    </div>
  )
}
