import { routes, type Route } from '../../shared/routes'
import type { OutputIndexEntry, PageListEntry } from '../../shared/types'
import { stripMarkdown } from '../utils/text'

export type SearchResultType = 'chat' | 'doc' | 'output'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  snippet: string
  route: Route
  updatedAt: number | null
  meta: string
}

export interface SearchableSessionMeta {
  id: string
  name?: string
  preview?: string
  createdAt?: number
  lastMessageAt?: number
}

interface Match<T> {
  item: T
  snippet: string
  titleMatched: boolean
  updatedAt: number | undefined
}

export function getPageSearchMeta(page: PageListEntry): string {
  if (page.outputIdCount > 0) return 'Created from Output'
  if (page.sourceSessionId || page.sourceMessageId) return 'From chat'
  return 'Workspace Doc'
}

export function getOutputSearchMeta(output: OutputIndexEntry): string {
  if (output.sourceSessionId || output.sourceMessageId) return 'From assistant response'
  return 'Saved manually'
}

export function normalizePageSearchResult(page: PageListEntry, snippet: string): SearchResult {
  return {
    id: page.id,
    type: 'doc',
    title: page.title || 'Untitled Doc',
    snippet,
    route: routes.view.savedPage(page.id),
    updatedAt: page.updatedAt ?? null,
    meta: getPageSearchMeta(page),
  }
}

export function normalizeOutputSearchResult(output: OutputIndexEntry, snippet: string): SearchResult {
  return {
    id: output.id,
    type: 'output',
    title: output.title || 'Untitled Output',
    snippet,
    route: routes.view.savedOutput(output.id),
    updatedAt: output.updatedAt ?? null,
    meta: getOutputSearchMeta(output),
  }
}

export function normalizeChatSearchResult(session: SearchableSessionMeta, snippet: string): SearchResult {
  return {
    id: session.id,
    type: 'chat',
    title: session.name || session.preview || 'Untitled Chat',
    snippet,
    route: routes.view.allSessions(session.id),
    updatedAt: session.lastMessageAt ?? session.createdAt ?? null,
    meta: 'Chat',
  }
}

export function normalizeSearchText(value: string | undefined): string {
  return stripMarkdown(value ?? '')
}

export function makeSearchSnippet(normalizedText: string, query: string, emptyText: string): string {
  if (!normalizedText) return emptyText

  const lowerPlain = normalizedText.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerQuery ? lowerPlain.indexOf(lowerQuery) : -1
  const start = matchIndex > 48 ? matchIndex - 48 : 0
  const sliced = normalizedText.slice(start, start + 180)
  const prefix = start > 0 ? '...' : ''
  const suffix = start + 180 < normalizedText.length ? '...' : ''

  return `${prefix}${sliced}${suffix}`
}

function sortMatches<T>(matches: Match<T>[]): Match<T>[] {
  return [...matches].sort((a, b) => {
    if (a.titleMatched !== b.titleMatched) return a.titleMatched ? -1 : 1
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
}

export function buildDocSearchResults(
  pages: PageListEntry[],
  docContents: Record<string, string>,
  query: string
): SearchResult[] {
  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  if (!lowerQuery) return []

  const matches: Match<PageListEntry>[] = []
  for (const page of pages) {
    const title = page.title || 'Untitled Doc'
    const content = docContents[page.id] ?? ''
    const normalizedContent = normalizeSearchText(content)
    const titleMatched = title.toLowerCase().includes(lowerQuery)
    const contentMatched = normalizedContent.toLowerCase().includes(lowerQuery)
    if (!titleMatched && !contentMatched) continue

    matches.push({
      item: page,
      snippet: normalizedContent ? makeSearchSnippet(normalizedContent, trimmedQuery, 'Empty doc') : 'Title match',
      titleMatched,
      updatedAt: page.updatedAt,
    })
  }

  return sortMatches(matches).map(({ item, snippet }) => normalizePageSearchResult(item, snippet))
}

export function buildOutputSearchResults(
  outputs: OutputIndexEntry[],
  outputContents: Record<string, string>,
  query: string
): SearchResult[] {
  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  if (!lowerQuery) return []

  const matches: Match<OutputIndexEntry>[] = []
  for (const output of outputs) {
    const title = output.title || 'Untitled Output'
    const content = outputContents[output.id] ?? output.preview ?? ''
    const normalizedContent = normalizeSearchText(content)
    const titleMatched = title.toLowerCase().includes(lowerQuery)
    const contentMatched = normalizedContent.toLowerCase().includes(lowerQuery)
    if (!titleMatched && !contentMatched) continue

    matches.push({
      item: output,
      snippet: normalizedContent ? makeSearchSnippet(normalizedContent, trimmedQuery, 'Empty output') : 'Title match',
      titleMatched,
      updatedAt: output.updatedAt,
    })
  }

  return sortMatches(matches).map(({ item, snippet }) => normalizeOutputSearchResult(item, snippet))
}

export function buildChatSearchResults(
  sessions: SearchableSessionMeta[],
  query: string
): SearchResult[] {
  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  if (!lowerQuery) return []

  const matches: Match<SearchableSessionMeta>[] = []
  for (const session of sessions) {
    const title = session.name || session.preview || 'Untitled Chat'
    const preview = session.preview || ''
    const normalizedPreview = normalizeSearchText(preview)
    const titleMatched = title.toLowerCase().includes(lowerQuery)
    const previewMatched = normalizedPreview.toLowerCase().includes(lowerQuery)
    if (!titleMatched && !previewMatched) continue

    const updatedAt = session.lastMessageAt ?? session.createdAt
    matches.push({
      item: session,
      snippet: makeSearchSnippet(normalizedPreview, trimmedQuery, 'No preview available'),
      titleMatched,
      updatedAt,
    })
  }

  return sortMatches(matches).map(({ item, snippet }) => normalizeChatSearchResult(item, snippet))
}
