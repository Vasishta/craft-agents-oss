import * as React from 'react'
import { useAtomValue } from 'jotai'
import { BookOpen, Box, BriefcaseBusiness, FileText, GitBranch, ListTodo, MessageSquareText, Search } from 'lucide-react'
import { sessionMetaMapAtom } from '@/atoms/sessions'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useActiveWorkspace } from '@/context/AppShellContext'
import { usePanelChrome } from '@/context/PanelChromeContext'
import { useDecisionList } from '@/hooks/useDecisions'
import { useNotebookList } from '@/hooks/useNotebooks'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import { useProjectList } from '@/hooks/useProjects'
import { useWorkItemList } from '@/hooks/useWorkItems'
import { navigate } from '@/lib/navigate'
import { getWorkspaceSessionMetas } from '@/lib/session-meta-selectors'
import { cn } from '@/lib/utils'
import {
  buildChatSearchResults,
  buildDecisionSearchResults,
  buildDocSearchResults,
  buildMixedSearchResults,
  buildNotebookSearchResults,
  buildOutputSearchResults,
  buildProjectSearchResults,
  buildWorkItemSearchResults,
  countSearchResultsByType,
  type SearchResult,
  type SearchResultFilter,
  type SearchResultType,
} from './search-results'

interface SearchPageProps {
  workspaceId: string
}

function getSearchResultIcon(type: SearchResultType): React.ReactNode {
  switch (type) {
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

function formatUpdatedTime(timestamp?: number | null): string | null {
  if (!timestamp) return null
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

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const item = items[currentIndex]
      if (item === undefined) continue
      await worker(item)
    }
  })

  await Promise.all(workers)
}

function useSearchContentMap<T extends { id: string }>({
  workspaceId,
  items,
  query,
  loadContent,
}: {
  workspaceId: string
  items: T[]
  query: string
  loadContent: (workspaceId: string, item: T) => Promise<string>
}) {
  const [contents, setContents] = React.useState<Record<string, string>>({})
  const contentsRef = React.useRef<Record<string, string>>({})
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    contentsRef.current = contents
  }, [contents])

  React.useEffect(() => {
    setContents({})
    setIsLoading(false)
  }, [workspaceId])

  React.useEffect(() => {
    if (!workspaceId || !query || items.length === 0) {
      setIsLoading(false)
      return
    }

    let stale = false
    const itemsToLoad = items.filter((item) => contentsRef.current[item.id] === undefined)
    if (itemsToLoad.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const loadedContents: Record<string, string> = {}

    runWithConcurrency(itemsToLoad, 6, async (item) => {
      try {
        loadedContents[item.id] = await loadContent(workspaceId, item)
      } catch {
        loadedContents[item.id] = ''
      }
    }).finally(() => {
      if (!stale) {
        setContents((current) => ({ ...current, ...loadedContents }))
        setIsLoading(false)
      }
    })

    return () => {
      stale = true
    }
  }, [workspaceId, items, query, loadContent])

  return { contents, isLoading }
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="sm"
      className={cn('h-8 rounded-full px-3', !active && 'border-border/50 bg-background')}
      onClick={onClick}
    >
      {label}
      <span className="text-muted-foreground">{count}</span>
    </Button>
  )
}

function ResultRow({
  result,
  onClick,
}: {
  result: SearchResult
  onClick: () => void
}) {
  const timestamp = formatUpdatedTime(result.updatedAt)

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[88px] w-full grid-cols-[auto_1fr] gap-3 rounded-[16px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[11px] bg-foreground/[0.04] text-muted-foreground">
        {getSearchResultIcon(result.type)}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{result.title}</span>
          <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {result.typeLabel}
          </span>
        </span>
        <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">{result.snippet}</span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {result.meta}{timestamp ? ` · Updated ${timestamp}` : ''}
        </span>
      </span>
    </button>
  )
}

export default function SearchPage({ workspaceId }: SearchPageProps) {
  const { leadingAction, rightSidebarButton } = usePanelChrome()
  const activeWorkspace = useActiveWorkspace()
  const { pages } = usePageList(workspaceId)
  const { outputs } = useOutputList(workspaceId)
  const { decisions } = useDecisionList(workspaceId)
  const { notebooks } = useNotebookList(workspaceId)
  const { projects } = useProjectList(workspaceId)
  const { workItems } = useWorkItemList(workspaceId)
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [activeFilter, setActiveFilter] = React.useState<SearchResultFilter>('all')

  const remoteWorkspaceId = activeWorkspace?.remoteServer?.remoteWorkspaceId
  const workspaceSessions = React.useMemo(
    () => getWorkspaceSessionMetas(sessionMetaMap.values(), workspaceId, remoteWorkspaceId),
    [sessionMetaMap, workspaceId, remoteWorkspaceId],
  )

  const trimmedQuery = query.trim()
  const trimmedDebouncedQuery = debouncedQuery.trim()

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [trimmedQuery])

  const { contents: docContents, isLoading: isLoadingDocContents } = useSearchContentMap({
    workspaceId,
    items: pages,
    query: trimmedDebouncedQuery,
    loadContent: async (activeWorkspaceId, page) => {
      const fullPage = await window.electronAPI.getPage(activeWorkspaceId, page.id)
      return fullPage?.content ?? ''
    },
  })

  const { contents: outputContents, isLoading: isLoadingOutputContents } = useSearchContentMap({
    workspaceId,
    items: outputs,
    query: trimmedDebouncedQuery,
    loadContent: async (activeWorkspaceId, output) => {
      const fullOutput = await window.electronAPI.getOutput(activeWorkspaceId, output.id)
      return fullOutput?.content ?? output.preview ?? ''
    },
  })

  const { contents: decisionContents, isLoading: isLoadingDecisionContents } = useSearchContentMap({
    workspaceId,
    items: decisions,
    query: trimmedDebouncedQuery,
    loadContent: async (activeWorkspaceId, decision) => {
      const fullDecision = await window.electronAPI.getDecision(activeWorkspaceId, decision.id)
      return [fullDecision?.context ?? '', fullDecision?.decision ?? '', fullDecision?.consequences ?? ''].join('\n')
    },
  })

  const { contents: notebookContents, isLoading: isLoadingNotebookContents } = useSearchContentMap({
    workspaceId,
    items: notebooks,
    query: trimmedDebouncedQuery,
    loadContent: async (activeWorkspaceId, notebook) => {
      const fullNotebook = await window.electronAPI.getNotebook(activeWorkspaceId, notebook.id)
      if (!fullNotebook) return notebook.description ?? ''
      return [
        fullNotebook.description ?? '',
        ...fullNotebook.sections.flatMap((section) => [section.title, section.description ?? '']),
      ].join('\n')
    },
  })

  const mixedResults = React.useMemo<SearchResult[]>(() => {
    return buildMixedSearchResults([
      buildDocSearchResults(pages, docContents, trimmedQuery),
      buildOutputSearchResults(outputs, outputContents, trimmedQuery),
      buildDecisionSearchResults(decisions, decisionContents, trimmedQuery),
      buildNotebookSearchResults(notebooks, notebookContents, trimmedQuery),
      buildProjectSearchResults(projects, trimmedQuery),
      buildWorkItemSearchResults(workItems, trimmedQuery),
      buildChatSearchResults(workspaceSessions, trimmedQuery),
    ])
  }, [
    pages,
    docContents,
    outputs,
    outputContents,
    decisions,
    decisionContents,
    notebooks,
    notebookContents,
    projects,
    workItems,
    workspaceSessions,
    trimmedQuery,
  ])

  const resultCounts = React.useMemo(() => countSearchResultsByType(mixedResults), [mixedResults])
  const totalResults = mixedResults.length

  const filteredResults = React.useMemo(
    () => activeFilter === 'all' ? mixedResults : mixedResults.filter((result) => result.type === activeFilter),
    [activeFilter, mixedResults],
  )

  React.useEffect(() => {
    if (activeFilter !== 'all' && resultCounts[activeFilter] === 0) {
      setActiveFilter('all')
    }
  }, [activeFilter, resultCounts])

  const hasQuery = trimmedQuery.length > 0
  const isLoadingBodies = isLoadingDocContents || isLoadingOutputContents || isLoadingDecisionContents || isLoadingNotebookContents
  const showLoadingOnly = hasQuery && isLoadingBodies && filteredResults.length === 0

  const filterOptions = [
    { key: 'all' as const, label: 'All', count: totalResults },
    { key: 'doc' as const, label: 'Docs', count: resultCounts.doc },
    { key: 'output' as const, label: 'Outputs', count: resultCounts.output },
    { key: 'decision' as const, label: 'Decisions', count: resultCounts.decision },
    { key: 'notebook' as const, label: 'Notebooks', count: resultCounts.notebook },
    { key: 'project' as const, label: 'Projects', count: resultCounts.project },
    { key: 'workItem' as const, label: 'Work Items', count: resultCounts.workItem },
    { key: 'chat' as const, label: 'Chats', count: resultCounts.chat },
  ]

  const openResult = React.useCallback((result: SearchResult) => {
    navigate(result.route)
  }, [])

  return (
    <div className="flex h-full flex-col bg-background">
      <PanelHeader
        title="Search"
        leadingAction={leadingAction}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="min-h-0 flex-1">
        <main className="mx-auto flex w-full max-w-[980px] flex-col px-5 py-7 sm:px-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search docs, outputs, decisions, notebooks, projects, work items, and chats"
              aria-label="Search docs, outputs, decisions, notebooks, projects, work items, and chats"
              autoFocus
              className="h-10 pl-9"
            />
          </div>

          {!workspaceId ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <p className="text-sm text-muted-foreground">No active workspace</p>
            </section>
          ) : !hasQuery ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <div className="max-w-[420px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Search across the durable workspace</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Search docs, outputs, decisions, notebooks, projects, work items, and workspace chats from one surface.
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Try searching for a feature name, document title, or past decision to get started.
                </p>
              </div>
            </section>
          ) : showLoadingOnly ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <p className="text-sm text-muted-foreground">Searching durable workspace content...</p>
            </section>
          ) : filteredResults.length === 0 ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <div className="max-w-[420px] text-center">
                <p className="text-sm text-muted-foreground">
                  {activeFilter === 'all'
                    ? `No results for "${trimmedQuery}"`
                    : `No ${filterOptions.find((option) => option.key === activeFilter)?.label.toLowerCase()} matched "${trimmedQuery}"`}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Try a different search term or browse the Library to explore all saved artifacts.
                </p>
              </div>
            </section>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <FilterChip
                    key={option.key}
                    label={option.label}
                    count={option.count}
                    active={activeFilter === option.key}
                    onClick={() => setActiveFilter(option.key)}
                  />
                ))}
              </div>

              {isLoadingBodies && (
                <p className="text-sm text-muted-foreground">Still loading some doc, output, decision, and notebook bodies for deeper matches...</p>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Results</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filteredResults.length} {activeFilter === 'all' ? 'mixed workspace results' : `${filterOptions.find((option) => option.key === activeFilter)?.label.toLowerCase()} results`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <ResultRow
                    key={`${result.type}:${result.id}`}
                    result={result}
                    onClick={() => openResult(result)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
