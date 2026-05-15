import type { SessionMeta } from '@/atoms/sessions'
import { routes } from '@/lib/navigate'
import type { Route } from '../../shared/routes'
import type {
  DecisionIndexEntry,
  NotebookIndexEntry,
  OutputIndexEntry,
  PageListEntry,
  WorkItemIndexEntry,
} from '../../shared/types'

export interface ProjectLinkedItem {
  id: string
  title: string
  description: string
  route: Route
  ctaLabel: string
}

function buildLookup<T extends { id: string }>(entries: readonly T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]))
}

function getSessionTitle(session: SessionMeta | undefined, sessionId: string): string {
  return session?.name?.trim() || session?.preview?.trim() || `Chat ${sessionId}`
}

export function buildProjectLinkedLookups(params: {
  sessions: readonly SessionMeta[]
  docs: readonly PageListEntry[]
  outputs: readonly OutputIndexEntry[]
  decisions: readonly DecisionIndexEntry[]
  notebooks: readonly NotebookIndexEntry[]
  workItems: readonly WorkItemIndexEntry[]
}) {
  return {
    sessions: buildLookup(params.sessions),
    docs: buildLookup(params.docs),
    outputs: buildLookup(params.outputs),
    decisions: buildLookup(params.decisions),
    notebooks: buildLookup(params.notebooks),
    workItems: buildLookup(params.workItems),
  }
}

export function buildProjectChatLink(sessionId: string, session: SessionMeta | undefined): ProjectLinkedItem {
  return {
    id: sessionId,
    title: getSessionTitle(session, sessionId),
    description: session?.lastMessageAt ? 'Open linked chat' : 'Open linked chat by session id',
    route: routes.view.allSessions(sessionId),
    ctaLabel: 'Open chat',
  }
}

export function buildProjectDocLink(docId: string, doc: PageListEntry | undefined): ProjectLinkedItem {
  return {
    id: docId,
    title: doc?.title?.trim() || `Doc ${docId}`,
    description: doc ? 'Open linked doc' : 'Open linked doc by saved id',
    route: routes.view.savedPage(docId),
    ctaLabel: 'Open doc',
  }
}

export function buildProjectOutputLink(outputId: string, output: OutputIndexEntry | undefined): ProjectLinkedItem {
  return {
    id: outputId,
    title: output?.title?.trim() || `Output ${outputId}`,
    description: output ? 'Open linked output' : 'Open linked output by saved id',
    route: routes.view.savedOutput(outputId),
    ctaLabel: 'Open output',
  }
}

export function buildProjectDecisionLink(decisionId: string, decision: DecisionIndexEntry | undefined): ProjectLinkedItem {
  return {
    id: decisionId,
    title: decision?.title?.trim() || `Decision ${decisionId}`,
    description: decision ? 'Open linked decision' : 'Open linked decision by saved id',
    route: routes.view.decision(decisionId),
    ctaLabel: 'Open decision',
  }
}

export function buildProjectNotebookLink(notebookId: string, notebook: NotebookIndexEntry | undefined): ProjectLinkedItem {
  return {
    id: notebookId,
    title: notebook?.title?.trim() || `Notebook ${notebookId}`,
    description: notebook ? 'Open linked notebook' : 'Open linked notebook by saved id',
    route: routes.view.notebook(notebookId),
    ctaLabel: 'Open notebook',
  }
}

export function buildProjectWorkItemLink(workItemId: string, workItem: WorkItemIndexEntry | undefined): ProjectLinkedItem {
  return {
    id: workItemId,
    title: workItem?.title?.trim() || `Work item ${workItemId}`,
    description: workItem ? 'Open linked work item' : 'Open linked work item by saved id',
    route: routes.view.workItem(workItemId),
    ctaLabel: 'Open work item',
  }
}
