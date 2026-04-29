import * as React from 'react'
import { useAtomValue } from 'jotai'
import { FileText, MessageSquareText, Search } from 'lucide-react'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useAppShellContext } from '@/context/AppShellContext'
import { sessionMetaMapAtom, type SessionMeta } from '@/atoms/sessions'
import { usePageList } from '@/hooks/usePages'
import { navigate, routes } from '@/lib/navigate'
import { stripMarkdown } from '@/utils/text'
import type { PageListEntry } from '../../shared/types'

interface SearchPageProps {
  workspaceId: string
}

interface DocResult {
  page: PageListEntry
  snippet: string
  titleMatched: boolean
}

interface ChatResult {
  session: SessionMeta
  snippet: string
  titleMatched: boolean
}

function formatUpdatedTime(timestamp?: number): string | null {
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

function normalizeText(value: string | undefined): string {
  return stripMarkdown(value ?? '').replace(/\s+/g, ' ').trim()
}

function makeSnippet(text: string | undefined, query: string, emptyText: string): string {
  const plain = normalizeText(text)
  if (!plain) return emptyText

  const lowerPlain = plain.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerQuery ? lowerPlain.indexOf(lowerQuery) : -1
  const start = matchIndex > 48 ? matchIndex - 48 : 0
  const sliced = plain.slice(start, start + 180)
  const prefix = start > 0 ? '...' : ''
  const suffix = start + 180 < plain.length ? '...' : ''

  return `${prefix}${sliced}${suffix}`
}

function sortResults<T extends { titleMatched: boolean }>(
  results: T[],
  getUpdatedAt: (result: T) => number | undefined
): T[] {
  return [...results].sort((a, b) => {
    if (a.titleMatched !== b.titleMatched) return a.titleMatched ? -1 : 1
    return (getUpdatedAt(b) ?? 0) - (getUpdatedAt(a) ?? 0)
  })
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
  onClick,
}: {
  icon: React.ReactNode
  title: string
  snippet: string
  timestamp: string | null
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
        {timestamp && (
          <span className="mt-2 block text-xs text-muted-foreground">Updated {timestamp}</span>
        )}
      </span>
    </button>
  )
}

function ResultGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{title}</h2>
        <span className="rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

export default function SearchPage({ workspaceId }: SearchPageProps) {
  const { leadingAction, rightSidebarButton } = useAppShellContext()
  const { pages } = usePageList(workspaceId)
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [docContents, setDocContents] = React.useState<Record<string, string>>({})
  const docContentsRef = React.useRef<Record<string, string>>({})
  const [isLoadingDocContents, setIsLoadingDocContents] = React.useState(false)

  const workspaceSessions = React.useMemo(
    () => Array.from(sessionMetaMap.values()).filter(session =>
      session.workspaceId === workspaceId && !session.hidden
    ),
    [sessionMetaMap, workspaceId]
  )

  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  const trimmedDebouncedQuery = debouncedQuery.trim()

  React.useEffect(() => {
    docContentsRef.current = docContents
  }, [docContents])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [trimmedQuery])

  React.useEffect(() => {
    if (!workspaceId) {
      setDocContents({})
      setIsLoadingDocContents(false)
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

  const docResults = React.useMemo(() => {
    if (!lowerQuery) return []

    const results: DocResult[] = []
    for (const page of pages) {
      const title = page.title || 'Untitled Doc'
      const content = docContents[page.id] ?? ''
      const titleMatched = title.toLowerCase().includes(lowerQuery)
      const contentMatched = content ? normalizeText(content).toLowerCase().includes(lowerQuery) : false
      if (!titleMatched && !contentMatched) continue

      results.push({
        page,
        snippet: content ? makeSnippet(content, trimmedQuery, 'Empty doc') : 'Title match',
        titleMatched,
      })
    }

    return sortResults(results, result => result.page.updatedAt)
  }, [pages, docContents, lowerQuery, trimmedQuery])

  const chatResults = React.useMemo(() => {
    if (!lowerQuery) return []

    const results: ChatResult[] = []
    for (const session of workspaceSessions) {
      const title = session.name || session.preview || 'Untitled Chat'
      const preview = session.preview || ''
      const titleMatched = title.toLowerCase().includes(lowerQuery)
      const previewMatched = normalizeText(preview).toLowerCase().includes(lowerQuery)
      if (!titleMatched && !previewMatched) continue

      results.push({
        session,
        snippet: makeSnippet(preview, trimmedQuery, 'No preview available'),
        titleMatched,
      })
    }

    return sortResults(results, result => result.session.lastMessageAt ?? result.session.createdAt)
  }, [workspaceSessions, lowerQuery, trimmedQuery])

  const hasQuery = trimmedQuery.length > 0
  const hasResults = docResults.length > 0 || chatResults.length > 0
  const showLoadingOnly = hasQuery && isLoadingDocContents && !hasResults

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
              placeholder="Search docs and chat previews"
              aria-label="Search docs and chat previews"
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
                <h1 className="text-[22px] font-semibold tracking-normal text-foreground">Search docs and chat previews</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Searches doc titles and contents, plus chat titles and previews.
                </p>
              </div>
            </section>
          ) : showLoadingOnly ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <p className="text-sm text-muted-foreground">Searching doc bodies...</p>
            </section>
          ) : !hasResults ? (
            <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
              <p className="text-sm text-muted-foreground">No results for "{trimmedQuery}"</p>
            </section>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              {isLoadingDocContents && (
                <p className="text-sm text-muted-foreground">Searching doc bodies...</p>
              )}
              <ResultGroup title="Docs" count={docResults.length}>
                {docResults.length === 0 ? (
                  <p className="rounded-[8px] border border-border/55 px-4 py-3 text-sm text-muted-foreground">No matching docs</p>
                ) : (
                  docResults.map(({ page, snippet }) => (
                    <ResultRow
                      key={page.id}
                      icon={<FileText className="h-4 w-4" />}
                      title={page.title || 'Untitled Doc'}
                      snippet={snippet}
                      timestamp={formatUpdatedTime(page.updatedAt)}
                      onClick={() => navigate(routes.view.savedPage(page.id))}
                    />
                  ))
                )}
              </ResultGroup>

              <ResultGroup title="Chats" count={chatResults.length}>
                {chatResults.length === 0 ? (
                  <p className="rounded-[8px] border border-border/55 px-4 py-3 text-sm text-muted-foreground">No matching chats</p>
                ) : (
                  chatResults.map(({ session, snippet }) => (
                    <ResultRow
                      key={session.id}
                      icon={<MessageSquareText className="h-4 w-4" />}
                      title={session.name || session.preview || 'Untitled Chat'}
                      snippet={snippet}
                      timestamp={formatUpdatedTime(session.lastMessageAt ?? session.createdAt)}
                      onClick={() => navigate(routes.view.allSessions(session.id))}
                    />
                  ))
                )}
              </ResultGroup>
            </div>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}
