import type {
  CreateDecisionInput,
  CreateWorkItemInput,
  OutputDocument,
  ProjectDocument,
  ProjectIndexEntry,
  ProjectLinks,
} from '../../shared/types'

export type ProjectLinkableKind = 'output' | 'decision' | 'notebook'

type ProjectLike = Pick<ProjectDocument, 'links'> | Pick<ProjectIndexEntry, 'id'> & {
  links?: ProjectLinks
}

function trimOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function buildOutputContextLabel(output: Pick<OutputDocument, 'sourceSessionId' | 'promotedDocId'>): string {
  const parts = ['Created from output']
  if (output.sourceSessionId) {
    parts.push('linked to a source chat')
  }
  if (output.promotedDocId) {
    parts.push('with a promoted doc')
  }
  return parts.join(' and ')
}

function summarizeOutputContent(content: string, maxLength = 1200): string {
  const normalized = content.trim()
  if (!normalized) return ''
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trimEnd()}…`
}

export function buildProjectLinkPatch(kind: ProjectLinkableKind, entityId: string): Partial<ProjectLinks> {
  switch (kind) {
    case 'output':
      return { outputIds: [entityId] }
    case 'decision':
      return { decisionIds: [entityId] }
    case 'notebook':
      return { notebookIds: [entityId] }
  }
}

export function isProjectLinkedToEntity(
  project: ProjectLike,
  kind: ProjectLinkableKind,
  entityId: string,
): boolean {
  const links = project.links
  if (!links) return false

  switch (kind) {
    case 'output':
      return links.outputIds.includes(entityId)
    case 'decision':
      return links.decisionIds.includes(entityId)
    case 'notebook':
      return links.notebookIds.includes(entityId)
  }
}

export function buildWorkItemFromOutput(output: Pick<OutputDocument, 'id' | 'title' | 'content' | 'sourceSessionId' | 'promotedDocId'>): CreateWorkItemInput {
  return {
    title: trimOrFallback(output.title, 'Follow up on output'),
    description: summarizeOutputContent(output.content),
    status: 'backlog',
    type: 'task',
    linkedOutputIds: [output.id],
    linkedSessionIds: output.sourceSessionId ? [output.sourceSessionId] : undefined,
    linkedDocIds: output.promotedDocId ? [output.promotedDocId] : undefined,
  }
}

export function buildDecisionFromOutput(output: Pick<OutputDocument, 'id' | 'title' | 'content' | 'sourceSessionId' | 'sourceMessageId' | 'promotedDocId'>): CreateDecisionInput {
  return {
    title: trimOrFallback(output.title, 'Decision from output'),
    status: 'proposed',
    context: buildOutputContextLabel(output),
    decision: summarizeOutputContent(output.content, 4000) || 'Capture the durable decision here.',
    links: {
      outputIds: [output.id],
      sessionIds: output.sourceSessionId ? [output.sourceSessionId] : undefined,
      docIds: output.promotedDocId ? [output.promotedDocId] : undefined,
    },
    sourceSessionId: output.sourceSessionId,
    sourceMessageId: output.sourceMessageId,
    sourceOutputId: output.id,
  }
}
