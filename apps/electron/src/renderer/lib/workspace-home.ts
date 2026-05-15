import { WORK_ITEM_STATUS_LABELS } from './workitem-meta'

type RecentChatLike = {
  id: string
  name?: string | null
  preview?: string | null
  createdAt?: number | null
  lastMessageAt?: number | null
}

type RecentPageLike = {
  id: string
  title?: string | null
  updatedAt: number
  outputIdCount: number
  sourceSessionId?: string | null
}

type RecentOutputLike = {
  id: string
  title?: string | null
  updatedAt: number
  sourceSessionId?: string | null
  sourceMessageId?: string | null
}

type RecentDecisionLike = {
  id: string
  title: string
  updatedAt: number
  status: string
}

type RecentNotebookLike = {
  id: string
  title: string
  updatedAt: number
}

type RecentProjectLike = {
  id: string
  name?: string | null
  updatedAt: number
  status?: string | null
}

type RecentWorkItemLike = {
  id: string
  title: string
  updatedAt: number
  status: keyof typeof WORK_ITEM_STATUS_LABELS
}

export type WorkspaceHomeActivityKind =
  | 'chat'
  | 'doc'
  | 'output'
  | 'decision'
  | 'notebook'
  | 'project'
  | 'workItem'

export interface WorkspaceHomeActivityItem {
  id: string
  kind: WorkspaceHomeActivityKind
  title: string
  timestamp: number
  detail: string
}

export interface WorkspaceHomeFocusItem {
  id: string
  kind: WorkspaceHomeActivityKind
  title: string
  detail: string
}

function resolveChatTimestamp(chat: RecentChatLike): number {
  return chat.lastMessageAt ?? chat.createdAt ?? 0
}

function normalizeTitle(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export function buildWorkspaceHomeActivityFeed({
  recentChats,
  recentDocs,
  recentOutputs,
  recentDecisions,
  recentNotebooks,
  recentProjects,
  recentWorkItems,
  limit = 8,
}: {
  recentChats: RecentChatLike[]
  recentDocs: RecentPageLike[]
  recentOutputs: RecentOutputLike[]
  recentDecisions: RecentDecisionLike[]
  recentNotebooks: RecentNotebookLike[]
  recentProjects: RecentProjectLike[]
  recentWorkItems: RecentWorkItemLike[]
  limit?: number
}): WorkspaceHomeActivityItem[] {
  return [
    ...recentChats.map((chat) => ({
      id: chat.id,
      kind: 'chat' as const,
      title: normalizeTitle(chat.name ?? chat.preview, 'Untitled Chat'),
      timestamp: resolveChatTimestamp(chat),
      detail: 'Chat',
    })),
    ...recentDocs.map((page) => ({
      id: page.id,
      kind: 'doc' as const,
      title: normalizeTitle(page.title, 'Untitled Doc'),
      timestamp: page.updatedAt,
      detail: page.outputIdCount > 0 ? 'Doc from output' : page.sourceSessionId ? 'Doc from chat' : 'Doc',
    })),
    ...recentOutputs.map((output) => ({
      id: output.id,
      kind: 'output' as const,
      title: normalizeTitle(output.title, 'Untitled Output'),
      timestamp: output.updatedAt,
      detail: output.sourceSessionId || output.sourceMessageId ? 'Output from assistant' : 'Saved output',
    })),
    ...recentDecisions.map((decision) => ({
      id: decision.id,
      kind: 'decision' as const,
      title: normalizeTitle(decision.title, 'Untitled Decision'),
      timestamp: decision.updatedAt,
      detail: `Decision · ${decision.status}`,
    })),
    ...recentNotebooks.map((notebook) => ({
      id: notebook.id,
      kind: 'notebook' as const,
      title: normalizeTitle(notebook.title, 'Untitled Notebook'),
      timestamp: notebook.updatedAt,
      detail: 'Notebook',
    })),
    ...recentProjects.map((project) => ({
      id: project.id,
      kind: 'project' as const,
      title: normalizeTitle(project.name, 'Untitled Project'),
      timestamp: project.updatedAt,
      detail: project.status ? `Project · ${project.status}` : 'Project',
    })),
    ...recentWorkItems.map((workItem) => ({
      id: workItem.id,
      kind: 'workItem' as const,
      title: normalizeTitle(workItem.title, 'Untitled Work Item'),
      timestamp: workItem.updatedAt,
      detail: `Work item · ${WORK_ITEM_STATUS_LABELS[workItem.status]}`,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

export function buildWorkspaceHomeFocusItems({
  recentChats,
  recentDocs,
  recentOutputs,
  recentProjects,
  recentWorkItems,
}: {
  recentChats: RecentChatLike[]
  recentDocs: RecentPageLike[]
  recentOutputs: RecentOutputLike[]
  recentProjects: RecentProjectLike[]
  recentWorkItems: RecentWorkItemLike[]
}): WorkspaceHomeFocusItem[] {
  const activeWorkItem = [...recentWorkItems]
    .filter((workItem) => workItem.status !== 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]

  const recentChat = [...recentChats]
    .sort((a, b) => resolveChatTimestamp(b) - resolveChatTimestamp(a))[0]

  const recentProject = [...recentProjects]
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]

  const recentDoc = [...recentDocs]
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]

  const recentOutput = [...recentOutputs]
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]

  const candidates: Array<WorkspaceHomeFocusItem | null> = [
    activeWorkItem ? {
      id: activeWorkItem.id,
      kind: 'workItem' as const,
      title: normalizeTitle(activeWorkItem.title, 'Untitled Work Item'),
      detail: `Move forward in ${WORK_ITEM_STATUS_LABELS[activeWorkItem.status]}`,
    } : null,
    recentChat ? {
      id: recentChat.id,
      kind: 'chat' as const,
      title: normalizeTitle(recentChat.name ?? recentChat.preview, 'Untitled Chat'),
      detail: 'Resume the latest conversation',
    } : null,
    recentProject ? {
      id: recentProject.id,
      kind: 'project' as const,
      title: normalizeTitle(recentProject.name, 'Untitled Project'),
      detail: recentProject.status ? `Project · ${recentProject.status}` : 'Open project workspace',
    } : null,
    recentDoc ? {
      id: recentDoc.id,
      kind: 'doc' as const,
      title: normalizeTitle(recentDoc.title, 'Untitled Doc'),
      detail: recentDoc.outputIdCount > 0 ? 'Continue the derived doc' : 'Open the latest doc',
    } : null,
    recentOutput ? {
      id: recentOutput.id,
      kind: 'output' as const,
      title: normalizeTitle(recentOutput.title, 'Untitled Output'),
      detail: 'Review the latest saved output',
    } : null,
  ]

  return candidates.filter((item): item is WorkspaceHomeFocusItem => item !== null).slice(0, 3)
}
