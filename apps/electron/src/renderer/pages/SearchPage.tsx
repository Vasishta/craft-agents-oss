import * as React from 'react'
import { useAtomValue } from 'jotai'
import { Box, FileText, MessageSquareText, Search } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useActiveWorkspace, useAppShellContext } from '@/context/AppShellContext'
import { sessionMetaMapAtom, type SessionMeta } from '@/atoms/sessions'
import { useOutputList } from '@/hooks/useOutputs'
import { usePageList } from '@/hooks/usePages'
import { navigate } from '@/lib/navigate'
import { getWorkspaceSessionMetas } from '@/lib/session-meta-selectors'
import {
  buildChatSearchResults,
  buildDocSearchResults,
  buildOutputSearchResults,
  type SearchResult,
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
  worker: (item: T) => Promise<void>
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

function ResultRow({
  icon,
  title,
  snippet,
  timestamp,
  meta,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  snippet: string
  timestamp: string | null
  meta?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[78px] w-full grid-cols-[auto_1fr] gap-3 rounded-[8px] border border-border/55 bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-foreground/[0.025] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-muted-foreground">{snippet}</span>
        {(timestamp || meta) && (
          <span className="mt-2 block text-xs text-muted-foreground">
            {timestamp ? `Updated ${timestamp}` : null}{timestamp && meta ? ' · ' : ''}{meta}
          </span>
        )}
      </span>
    </button>
  )
}

function SearchResultGroup({
  title,
  results,
  onOpen,
}: {
  title: string
  results: SearchResult[]
  onOpen: (result: SearchResult) => void
}) {
  if (results.length === 0) return null

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{title}</h2>
        <span className="rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {results.length}
        </span>
      </div>
      <div className="space-y-2">
        {results.map(result => (
          <ResultRow
            key={`${result.type}:${result.id}`}
            icon={getSearchResultIcon(result.type)}
            title={result.title}
            snippet={result.snippet}
            timestamp={formatUpdatedTime(result.updatedAt)}
            meta={result.meta}
            onClick={() => onOpen(result)}
          />
        ))}
      </div>
    </section>
  )
}

export default function SearchPage({ workspaceId }: SearchPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const activeWorkspace = useActiveWorkspace()
  const { pages } = usePageList(workspaceId)
  const { outputs } = useOutputList(workspaceId)
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [docContents, setDocContents] = React.useState<Record<string, string>>({})
  const docContentsRef = React.useRef<Record<string, string>>({})
  const [outputContents, setOutputContents] = React.useState<Record<string, string>>({})
  const outputContentsRef = React.useRef<Record<string, string>>({})
  const [isLoadingDocContents, setIsLoadingDocContents] = React.useState(false)
  const [isLoadingOutputContents, setIsLoadingOutputContents] = React.useState(false)

  const remoteWorkspaceId = activeWorkspace?.remoteServer?.remoteWorkspaceId

  const workspaceSessions = React.useMemo(
    () => getWorkspaceSessionMetas(sessionMetaMap.values(), workspaceId, remoteWorkspaceId),
    [sessionMetaMap, workspaceId, remoteWorkspaceId]
  )

  const trimmedQuery = query.trim()
  const trimmedDebouncedQuery = debouncedQuery.trim()

  React.useEffect(() => {
    docContentsRef.current = docContents
  }, [docContents])

  React.useEffect(() => {
    outputContentsRef.current = outputContents
  }, [outputContents])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [trimmedQuery])

  React.useEffect(() => {
    if (!workspaceId) {
      setDocContents({})
      setOutputContents({})
      setIsLoadingDocContents(false)
      setIsLoadingOutputContents(false)
      return
    }

    if (!trimmedDebouncedQuery || pages.length === 0) {
      setIsLoadingDocContents(false)
      return
    }

    let stale = false
    const pagesToLoad = pages.filter(page => docContentsRef.current[page.id] === undefined)
    if (pagesToLoad.length === 0) {
      setIsLoadingDocContents(false)
      return
    }

    setIsLoadingDocContents(true)

    runWithConcurrency(pagesToLoad, 6, async (page) => {
      let content = ''
      try {
        const fullPage = await window.electronAPI.getPage(workspaceId, page.id)
        content = fullPage?.content ?? ''
      } catch {
        content = ''
      }

      if (!stale) {
        setDocContents(current => ({ ...current, [page.id]: content }))
      }
    }).finally(() => {
      if (!stale) setIsLoadingDocContents(false)
    })

    return () => {
      stale = true
    }
  }, [workspaceId, pages, trimmedDebouncedQuery])

  React.useEffect(() => {
    if (!workspaceId) {
      setOutputContents({})
      setIsLoadingOutputContents(false)
      return
    }

    if (!trimmedDebouncedQuery || outputs.length === 0) {
      setIsLoadingOutputContents(false)
      return
    }

    let stale = false
    const outputsToLoad = outputs.filter(output => outputContentsRef.current[output.id] === undefined)
    if (outputsToLoad.length === 0) {
      setIsLoadingOutputContents(false)
      return
    }

    setIsLoadingOutputContents(true)
    const loadedContents: Record<string, string> = {}

    runWithConcurrency(outputsToLoad, 6, async (output) => {
      let content = ''
      try {
        const fullOutput = await window.electronAPI.getOutput(workspaceId, output.id)
        content = fullOutput?.content ?? ''
      } catch {
        content = ''
      }

      loadedContents[output.id] = content
    }).finally(() => {
      if (!stale) {
        setOutputContents(current => ({ ...current, ...loadedContents }))
        setIsLoadingOutputContents(false)
      }
    })

    return () => {
      stale = true
    }
  }, [workspaceId, outputs, trimmedDebouncedQuery])

  const docResults = React.useMemo<SearchResult[]>(() => {
    return buildDocSearchResults(pages, docContents, trimmedQuery)
  }, [pages, docContents, trimmedQuery])

  const outputResults = React.useMemo<SearchResult[]>(() => {
    return buildOutputSearchResults(outputs, outputContents, trimmedQuery)
  }, [outputs, outputContents, trimmedQuery])

  const chatResults = React.useMemo<SearchResult[]>(() => {
    return buildChatSearchResults(workspaceSessions, trimmedQuery)
  }, [workspaceSessions, trimmedQuery])

  const hasQuery = trimmedQuery.length > 0
  const hasResults = docResults.length > 0 || outputResults.length > 0 || chatResults.length > 0
  const isLoadingBodies = isLoadingDocContents || isLoadingOutputContents
  const showLoadingOnly = hasQuery && isLoadingBodies && !hasResults

  const openResult = React.useCallback((result: SearchResult) => {
    navigate(result.route)
  }, [navigate])

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
              placeholder="Search docs, outputs, and chat previews"
              aria-label="Search docs, outputs, and chat previews"
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
              <div className="max-w-[360px] text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Search docs, outputs, and chat previews</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Searches doc and output titles and contents, plus chat titles and previews.
                </p>
              </div>
            </section>
          ) : showLoadingOnly ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <p className="text-sm text-muted-foreground">Searching doc and output bodies...</p>
            </section>
          ) : !hasResults ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <p className="text-sm text-muted-foreground">No results for "{trimmedQuery}"</p>
            </section>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              {isLoadingBodies && (
                <p className="text-sm text-muted-foreground">Searching doc and output bodies...</p>
              )}
              <SearchResultGroup title="Docs" results={docResults} onOpen={openResult} />
              <SearchResultGroup title="Outputs" results={outputResults} onOpen={openResult} />
              <SearchResultGroup title="Chats" results={chatResults} onOpen={openResult} />
            </div>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
