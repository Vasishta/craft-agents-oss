import type { SessionMeta } from '@/atoms/sessions'

export function matchesWorkspaceSession(
  session: SessionMeta,
  workspaceId?: string | null,
  remoteWorkspaceId?: string | null
): boolean {
  if (session.hidden) return false
  if (!workspaceId) return true
  return session.workspaceId === workspaceId || (!!remoteWorkspaceId && session.workspaceId === remoteWorkspaceId)
}

export function getWorkspaceSessionMetas(
  sessionMetas: Iterable<SessionMeta>,
  workspaceId?: string | null,
  remoteWorkspaceId?: string | null
): SessionMeta[] {
  return Array.from(sessionMetas).filter((session) =>
    matchesWorkspaceSession(session, workspaceId, remoteWorkspaceId)
  )
}

export function getActiveWorkspaceSessionMetas(
  sessionMetas: Iterable<SessionMeta>,
  workspaceId?: string | null,
  remoteWorkspaceId?: string | null
): SessionMeta[] {
  return getWorkspaceSessionMetas(sessionMetas, workspaceId, remoteWorkspaceId).filter(
    (session) => session.isArchived !== true
  )
}

export function buildSessionStatusCounts(
  sessionMetas: Iterable<SessionMeta>,
  statusIds: string[] = []
): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const statusId of statusIds) {
    counts[statusId] = 0
  }

  for (const session of sessionMetas) {
    const statusId = session.sessionStatus || 'todo'
    counts[statusId] = (counts[statusId] || 0) + 1
  }

  return counts
}

export function buildWorkQueueSummary(
  sessionMetas: Iterable<SessionMeta>,
  workspaceId?: string | null,
  remoteWorkspaceId?: string | null
) {
  const workspaceSessionMetas = getWorkspaceSessionMetas(sessionMetas, workspaceId, remoteWorkspaceId)
  const activeSessionMetas = workspaceSessionMetas.filter((session) => session.isArchived !== true)

  return {
    workspaceSessionMetas,
    activeSessionMetas,
    flaggedCount: activeSessionMetas.filter((session) => session.isFlagged).length,
    archivedCount: workspaceSessionMetas.filter((session) => session.isArchived === true).length,
  }
}
