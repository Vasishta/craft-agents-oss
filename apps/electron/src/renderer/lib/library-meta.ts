import type { DecisionIndexEntry, NotebookIndexEntry, OutputIndexEntry, PageListEntry } from '../../shared/types'

export type LibraryItemKind = 'doc' | 'output' | 'decision' | 'notebook'
export type LibraryFilter = 'all' | LibraryItemKind

export interface LibraryItem {
  id: string
  kind: LibraryItemKind
  title: string
  updatedAt: number
  createdAt: number
  description: string
  metaLabel: string
  provenance: string
}

export function normalizeLibraryItems({
  pages,
  outputs,
  decisions,
  notebooks,
}: {
  pages: PageListEntry[]
  outputs: OutputIndexEntry[]
  decisions: DecisionIndexEntry[]
  notebooks: NotebookIndexEntry[]
}): LibraryItem[] {
  return [
    ...pages.map(normalizePageItem),
    ...outputs.map(normalizeOutputItem),
    ...decisions.map(normalizeDecisionItem),
    ...notebooks.map(normalizeNotebookItem),
  ].sort((left, right) => right.updatedAt - left.updatedAt)
}

export function filterLibraryItems(items: LibraryItem[], filter: LibraryFilter): LibraryItem[] {
  if (filter === 'all') return items
  return items.filter((item) => item.kind === filter)
}

export function buildLibraryCounts(items: LibraryItem[]): Record<LibraryFilter, number> {
  return items.reduce<Record<LibraryFilter, number>>((counts, item) => {
    counts.all += 1
    counts[item.kind] += 1
    return counts
  }, {
    all: 0,
    doc: 0,
    output: 0,
    decision: 0,
    notebook: 0,
  })
}

export function formatKindLabel(kind: LibraryItemKind): string {
  switch (kind) {
    case 'doc':
      return 'Docs'
    case 'output':
      return 'Outputs'
    case 'decision':
      return 'Decisions'
    case 'notebook':
      return 'Notebooks'
  }
}

function normalizePageItem(page: PageListEntry): LibraryItem {
  const title = page.title?.trim() || 'Untitled Doc'
  const outputSummary = page.outputIdCount > 0 ? `${page.outputIdCount} linked outputs` : 'Standalone doc'
  return {
    id: page.id,
    kind: 'doc',
    title,
    updatedAt: page.updatedAt,
    createdAt: page.createdAt,
    description: outputSummary,
    metaLabel: 'Doc',
    provenance: getPageProvenance(page),
  }
}

function normalizeOutputItem(output: OutputIndexEntry): LibraryItem {
  return {
    id: output.id,
    kind: 'output',
    title: output.title?.trim() || 'Untitled Output',
    updatedAt: output.updatedAt,
    createdAt: output.createdAt,
    description: output.preview || 'Empty output',
    metaLabel: snakeToTitleCase(output.kind),
    provenance: output.promotedDocId
      ? 'Created from chat and promoted to a doc'
      : output.sourceSessionId || output.sourceMessageId
        ? 'From chat'
        : 'Saved manually',
  }
}

function normalizeDecisionItem(decision: DecisionIndexEntry): LibraryItem {
  return {
    id: decision.id,
    kind: 'decision',
    title: decision.title,
    updatedAt: decision.updatedAt,
    createdAt: decision.createdAt,
    description: buildLinkSummary([
      countLabel(decision.linkCounts.projectCount, 'project'),
      countLabel(decision.linkCounts.docCount, 'doc'),
      countLabel(decision.linkCounts.outputCount, 'output'),
      countLabel(decision.linkCounts.notebookCount, 'notebook'),
    ], 'No linked durable objects'),
    metaLabel: snakeToTitleCase(decision.status),
    provenance: decision.linkCounts.outputCount > 0
      ? 'Created from output or linked durable work'
      : decision.linkCounts.projectCount > 0
        ? 'Linked to a project'
        : 'Captured directly in the workspace',
  }
}

function normalizeNotebookItem(notebook: NotebookIndexEntry): LibraryItem {
  return {
    id: notebook.id,
    kind: 'notebook',
    title: notebook.title,
    updatedAt: notebook.updatedAt,
    createdAt: notebook.createdAt,
    description: notebook.description || buildLinkSummary([
      countLabel(notebook.sectionCount, 'section'),
      countLabel(notebook.linkCounts.docCount, 'doc'),
      countLabel(notebook.linkCounts.outputCount, 'output'),
      countLabel(notebook.linkCounts.decisionCount, 'decision'),
    ], 'Curated durable workspace collection'),
    metaLabel: snakeToTitleCase(notebook.status),
    provenance: notebook.projectIds.length > 0
      ? 'Linked project notebook'
      : 'Curated workspace notebook',
  }
}

function getPageProvenance(page: PageListEntry): string {
  if (page.sourceSessionId || page.sourceMessageId) {
    return page.notebookId ? 'From chat and linked to a notebook' : 'From chat'
  }
  if (page.outputIdCount > 0) {
    return 'Created from output'
  }
  if (page.notebookId) {
    return 'Linked notebook doc'
  }
  return 'Saved directly in the workspace'
}

function countLabel(count: number, label: string): string | null {
  return count > 0 ? `${count} ${label}${count === 1 ? '' : 's'}` : null
}

function buildLinkSummary(parts: Array<string | null>, fallback: string): string {
  const filtered = parts.filter((part): part is string => Boolean(part))
  return filtered.length > 0 ? filtered.join(' · ') : fallback
}

function snakeToTitleCase(value: string): string {
  return value.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}
