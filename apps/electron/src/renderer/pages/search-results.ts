import { routes, type Route } from '../../shared/routes'
import type {
  DecisionIndexEntry,
  NotebookIndexEntry,
  OutputIndexEntry,
  PageListEntry,
  ProjectIndexEntry,
  WorkItemIndexEntry,
} from '../../shared/types'
import { WORK_ITEM_STATUS_LABELS } from '../lib/workitem-meta'
import { stripMarkdown } from '../utils/text'

export type SearchResultType =
  | 'chat'
  | 'doc'
  | 'output'
  | 'decision'
  | 'notebook'
  | 'project'
  | 'workItem'

export type SearchResultFilter = 'all' | SearchResultType

export interface SearchResult {
  id: string
  type: SearchResultType
  typeLabel: string
  title: string
  snippet: string
  route: Route
  updatedAt: number | null
  meta: string
  score: number
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
  score: number
  updatedAt: number | undefined
}

interface SearchBuilderConfig<T> {
  items: T[]
  query: string
  getTitle: (item: T) => string
  getContent: (item: T) => string
  getUpdatedAt: (item: T) => number | undefined
  getRankWeight?: (item: T) => number
  normalizeResult: (item: T, snippet: string) => SearchResult
  emptySnippet: string
}

function clampScore(value: number, max: number): number {
  return Math.min(value, max)
}

function sumCounts(counts: number[]): number {
  return counts.reduce((total, count) => total + count, 0)
}

function buildMatchScore(titleMatched: boolean, contentMatched: boolean, rankWeight: number): number {
  let score = rankWeight
  if (titleMatched) score += 200
  if (contentMatched) score += 80
  if (titleMatched && contentMatched) score += 40
  return score
}

function getCountSummary(parts: Array<string | null>, emptyText: string): string {
  const filtered = parts.filter(Boolean)
  return filtered.length > 0 ? filtered.join(' · ') : emptyText
}

export function getPageSearchMeta(page: PageListEntry): string {
  if (page.outputIdCount > 0) return 'Created from Output'
  if (page.sourceSessionId || page.sourceMessageId) return 'From chat'
  return 'Workspace doc'
}

export function getOutputSearchMeta(output: OutputIndexEntry): string {
  if (output.sourceSessionId || output.sourceMessageId) return 'From assistant response'
  return 'Saved manually'
}

export function getDecisionSearchMeta(decision: DecisionIndexEntry): string {
  return getCountSummary([
    decision.status,
    decision.linkCounts.projectCount > 0 ? `${decision.linkCounts.projectCount} projects` : null,
    decision.linkCounts.docCount > 0 ? `${decision.linkCounts.docCount} docs` : null,
    decision.linkCounts.outputCount > 0 ? `${decision.linkCounts.outputCount} outputs` : null,
    decision.linkCounts.notebookCount > 0 ? `${decision.linkCounts.notebookCount} notebooks` : null,
  ], decision.status)
}

export function getNotebookSearchMeta(notebook: NotebookIndexEntry): string {
  return getCountSummary([
    notebook.status,
    notebook.sectionCount > 0 ? `${notebook.sectionCount} sections` : null,
    notebook.linkCounts.docCount > 0 ? `${notebook.linkCounts.docCount} docs` : null,
    notebook.linkCounts.outputCount > 0 ? `${notebook.linkCounts.outputCount} outputs` : null,
    notebook.linkCounts.decisionCount > 0 ? `${notebook.linkCounts.decisionCount} decisions` : null,
  ], notebook.status)
}

export function getProjectSearchMeta(project: ProjectIndexEntry): string {
  return getCountSummary([
    project.status,
    project.linkCounts.workItemCount > 0 ? `${project.linkCounts.workItemCount} work items` : null,
    project.linkCounts.sessionCount > 0 ? `${project.linkCounts.sessionCount} chats` : null,
    project.linkCounts.docCount > 0 ? `${project.linkCounts.docCount} docs` : null,
    project.linkCounts.outputCount > 0 ? `${project.linkCounts.outputCount} outputs` : null,
  ], project.status)
}

export function getWorkItemSearchMeta(workItem: WorkItemIndexEntry): string {
  return getCountSummary([
    WORK_ITEM_STATUS_LABELS[workItem.status],
    workItem.priority ?? null,
    workItem.type ? workItem.type.replace(/_/g, ' ') : null,
    workItem.area ?? null,
  ], WORK_ITEM_STATUS_LABELS[workItem.status])
}

export function normalizePageSearchResult(page: PageListEntry, snippet: string): SearchResult {
  return {
    id: page.id,
    type: 'doc',
    typeLabel: 'Doc',
    title: page.title || 'Untitled Doc',
    snippet,
    route: routes.view.savedPage(page.id),
    updatedAt: page.updatedAt ?? null,
    meta: getPageSearchMeta(page),
    score: 0,
  }
}

export function normalizeOutputSearchResult(output: OutputIndexEntry, snippet: string): SearchResult {
  return {
    id: output.id,
    type: 'output',
    typeLabel: 'Output',
    title: output.title || 'Untitled Output',
    snippet,
    route: routes.view.savedOutput(output.id),
    updatedAt: output.updatedAt ?? null,
    meta: getOutputSearchMeta(output),
    score: 0,
  }
}

export function normalizeChatSearchResult(session: SearchableSessionMeta, snippet: string): SearchResult {
  return {
    id: session.id,
    type: 'chat',
    typeLabel: 'Chat',
    title: session.name || session.preview || 'Untitled Chat',
    snippet,
    route: routes.view.allSessions(session.id),
    updatedAt: session.lastMessageAt ?? session.createdAt ?? null,
    meta: 'Recent workspace chat',
    score: 0,
  }
}

export function normalizeDecisionSearchResult(decision: DecisionIndexEntry, snippet: string): SearchResult {
  return {
    id: decision.id,
    type: 'decision',
    typeLabel: 'Decision',
    title: decision.title || 'Untitled Decision',
    snippet,
    route: routes.view.decision(decision.id),
    updatedAt: decision.updatedAt ?? null,
    meta: getDecisionSearchMeta(decision),
    score: 0,
  }
}

export function normalizeNotebookSearchResult(notebook: NotebookIndexEntry, snippet: string): SearchResult {
  return {
    id: notebook.id,
    type: 'notebook',
    typeLabel: 'Notebook',
    title: notebook.title || 'Untitled Notebook',
    snippet,
    route: routes.view.notebook(notebook.id),
    updatedAt: notebook.updatedAt ?? null,
    meta: getNotebookSearchMeta(notebook),
    score: 0,
  }
}

export function normalizeProjectSearchResult(project: ProjectIndexEntry, snippet: string): SearchResult {
  return {
    id: project.id,
    type: 'project',
    typeLabel: 'Project',
    title: project.name || 'Untitled Project',
    snippet,
    route: routes.view.project(project.id),
    updatedAt: project.updatedAt ?? null,
    meta: getProjectSearchMeta(project),
    score: 0,
  }
}

export function normalizeWorkItemSearchResult(workItem: WorkItemIndexEntry, snippet: string): SearchResult {
  return {
    id: workItem.id,
    type: 'workItem',
    typeLabel: 'Work Item',
    title: workItem.title || 'Untitled Work Item',
    snippet,
    route: routes.view.workItem(workItem.id),
    updatedAt: workItem.updatedAt ?? null,
    meta: getWorkItemSearchMeta(workItem),
    score: 0,
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
    if (a.score !== b.score) return b.score - a.score
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
}

function buildSearchResults<T>({
  items,
  query,
  getTitle,
  getContent,
  getUpdatedAt,
  getRankWeight,
  normalizeResult,
  emptySnippet,
}: SearchBuilderConfig<T>): SearchResult[] {
  const trimmedQuery = query.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  if (!lowerQuery) return []

  const matches: Match<T>[] = []
  for (const item of items) {
    const title = getTitle(item)
    const normalizedContent = normalizeSearchText(getContent(item))
    const titleMatched = title.toLowerCase().includes(lowerQuery)
    const contentMatched = normalizedContent.toLowerCase().includes(lowerQuery)
    if (!titleMatched && !contentMatched) continue

    matches.push({
      item,
      snippet: normalizedContent ? makeSearchSnippet(normalizedContent, trimmedQuery, emptySnippet) : 'Title match',
      score: buildMatchScore(titleMatched, contentMatched, getRankWeight?.(item) ?? 0),
      updatedAt: getUpdatedAt(item),
    })
  }

  return sortMatches(matches).map(({ item, snippet, score }) => ({
    ...normalizeResult(item, snippet),
    score,
  }))
}

function getPageRankWeight(page: PageListEntry): number {
  return clampScore(
    page.outputIdCount * 18
      + (page.sourceSessionId || page.sourceMessageId ? 24 : 0)
      + (page.notebookId ? 10 : 0),
    70,
  )
}

function getOutputRankWeight(output: OutputIndexEntry): number {
  return clampScore(
    (output.sourceSessionId || output.sourceMessageId ? 24 : 0)
      + (output.promotedDocId ? 18 : 0)
      + (output.status === 'promoted' ? 10 : 0),
    70,
  )
}

function getDecisionRankWeight(decision: DecisionIndexEntry): number {
  return clampScore(
    decision.linkCounts.projectCount * 10
      + decision.linkCounts.outputCount * 12
      + decision.linkCounts.docCount * 8
      + decision.linkCounts.notebookCount * 8
      + decision.linkCounts.sessionCount * 5
      + decision.linkCounts.workItemCount * 4
      + (decision.status === 'accepted' ? 12 : decision.status === 'proposed' ? 4 : 0),
    95,
  )
}

function getNotebookRankWeight(notebook: NotebookIndexEntry): number {
  return clampScore(
    notebook.sectionCount * 3
      + notebook.linkCounts.projectCount * 10
      + notebook.linkCounts.decisionCount * 10
      + notebook.linkCounts.docCount * 8
      + notebook.linkCounts.outputCount * 8
      + notebook.linkCounts.sessionCount * 4,
    95,
  )
}

function getProjectRankWeight(project: ProjectIndexEntry): number {
  return clampScore(
    sumCounts([
      project.linkCounts.workItemCount * 9,
      project.linkCounts.sessionCount * 7,
      project.linkCounts.docCount * 7,
      project.linkCounts.outputCount * 7,
      project.linkCounts.decisionCount * 8,
      project.linkCounts.notebookCount * 8,
    ]),
    95,
  )
}

function getWorkItemRankWeight(workItem: WorkItemIndexEntry): number {
  const priorityWeight = workItem.priority === 'P0'
    ? 18
    : workItem.priority === 'P1'
      ? 12
      : workItem.priority === 'P2'
        ? 6
        : 0

  return clampScore(
    priorityWeight
      + workItem.linkCounts.docCount * 8
      + workItem.linkCounts.outputCount * 8
      + workItem.linkCounts.sessionCount * 5
      + (workItem.status === 'in_progress' ? 10 : workItem.status === 'in_review' ? 7 : 0),
    80,
  )
}

export function buildDocSearchResults(
  pages: PageListEntry[],
  docContents: Record<string, string>,
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: pages,
    query,
    getTitle: (page) => page.title || 'Untitled Doc',
    getContent: (page) => docContents[page.id] ?? '',
    getUpdatedAt: (page) => page.updatedAt,
    getRankWeight: getPageRankWeight,
    normalizeResult: normalizePageSearchResult,
    emptySnippet: 'Empty doc',
  })
}

export function buildOutputSearchResults(
  outputs: OutputIndexEntry[],
  outputContents: Record<string, string>,
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: outputs,
    query,
    getTitle: (output) => output.title || 'Untitled Output',
    getContent: (output) => outputContents[output.id] ?? output.preview ?? '',
    getUpdatedAt: (output) => output.updatedAt,
    getRankWeight: getOutputRankWeight,
    normalizeResult: normalizeOutputSearchResult,
    emptySnippet: 'Empty output',
  })
}

export function buildChatSearchResults(
  sessions: SearchableSessionMeta[],
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: sessions,
    query,
    getTitle: (session) => session.name || session.preview || 'Untitled Chat',
    getContent: (session) => session.preview || '',
    getUpdatedAt: (session) => session.lastMessageAt ?? session.createdAt,
    getRankWeight: () => 6,
    normalizeResult: normalizeChatSearchResult,
    emptySnippet: 'No preview available',
  })
}

export function buildDecisionSearchResults(
  decisions: DecisionIndexEntry[],
  decisionContents: Record<string, string>,
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: decisions,
    query,
    getTitle: (decision) => decision.title || 'Untitled Decision',
    getContent: (decision) => decisionContents[decision.id] ?? '',
    getUpdatedAt: (decision) => decision.updatedAt,
    getRankWeight: getDecisionRankWeight,
    normalizeResult: normalizeDecisionSearchResult,
    emptySnippet: 'Decision matched by title',
  })
}

export function buildNotebookSearchResults(
  notebooks: NotebookIndexEntry[],
  notebookContents: Record<string, string>,
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: notebooks,
    query,
    getTitle: (notebook) => notebook.title || 'Untitled Notebook',
    getContent: (notebook) => notebookContents[notebook.id] ?? notebook.description ?? '',
    getUpdatedAt: (notebook) => notebook.updatedAt,
    getRankWeight: getNotebookRankWeight,
    normalizeResult: normalizeNotebookSearchResult,
    emptySnippet: 'Notebook matched by title',
  })
}

export function buildProjectSearchResults(
  projects: ProjectIndexEntry[],
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: projects,
    query,
    getTitle: (project) => project.name || 'Untitled Project',
    getContent: (project) => project.description ?? '',
    getUpdatedAt: (project) => project.updatedAt,
    getRankWeight: getProjectRankWeight,
    normalizeResult: normalizeProjectSearchResult,
    emptySnippet: 'Project matched by title',
  })
}

export function buildWorkItemSearchResults(
  workItems: WorkItemIndexEntry[],
  query: string,
): SearchResult[] {
  return buildSearchResults({
    items: workItems,
    query,
    getTitle: (workItem) => workItem.title || 'Untitled Work Item',
    getContent: (workItem) => workItem.description ?? [workItem.area, workItem.type].filter(Boolean).join(' '),
    getUpdatedAt: (workItem) => workItem.updatedAt,
    getRankWeight: getWorkItemRankWeight,
    normalizeResult: normalizeWorkItemSearchResult,
    emptySnippet: 'Work item matched by title',
  })
}

export function buildMixedSearchResults(
  resultGroups: SearchResult[][],
): SearchResult[] {
  return resultGroups
    .flat()
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })
}

export function countSearchResultsByType(results: SearchResult[]): Record<SearchResultType, number> {
  return results.reduce<Record<SearchResultType, number>>((counts, result) => {
    counts[result.type] += 1
    return counts
  }, {
    chat: 0,
    doc: 0,
    output: 0,
    decision: 0,
    notebook: 0,
    project: 0,
    workItem: 0,
  })
}
