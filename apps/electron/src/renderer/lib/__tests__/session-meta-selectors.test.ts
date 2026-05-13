import { describe, expect, it } from 'bun:test'
import type { SessionMeta } from '@/atoms/sessions'
import {
  buildSessionStatusCounts,
  buildWorkQueueSummary,
  getActiveWorkspaceSessionMetas,
  getWorkspaceSessionMetas,
  matchesWorkspaceSession,
} from '../session-meta-selectors'

function meta(overrides: Partial<SessionMeta> & Pick<SessionMeta, 'id' | 'workspaceId'>): SessionMeta {
  return {
    ...overrides,
    id: overrides.id,
    workspaceId: overrides.workspaceId,
  }
}

describe('session-meta-selectors', () => {
  it('matches visible local and remote workspace sessions while excluding hidden ones', () => {
    expect(matchesWorkspaceSession(meta({ id: 'local', workspaceId: 'ws-1' }), 'ws-1', 'remote-1')).toBe(true)
    expect(matchesWorkspaceSession(meta({ id: 'remote', workspaceId: 'remote-1' }), 'ws-1', 'remote-1')).toBe(true)
    expect(matchesWorkspaceSession(meta({ id: 'other', workspaceId: 'ws-2' }), 'ws-1', 'remote-1')).toBe(false)
    expect(matchesWorkspaceSession(meta({ id: 'hidden', workspaceId: 'ws-1', hidden: true }), 'ws-1', 'remote-1')).toBe(false)
  })

  it('returns visible workspace sessions and excludes archived only from active selectors', () => {
    const sessions = [
      meta({ id: 'active', workspaceId: 'ws-1', sessionStatus: 'todo' }),
      meta({ id: 'archived', workspaceId: 'remote-1', isArchived: true, sessionStatus: 'done' }),
      meta({ id: 'hidden', workspaceId: 'ws-1', hidden: true }),
      meta({ id: 'other', workspaceId: 'ws-2' }),
    ]

    expect(getWorkspaceSessionMetas(sessions, 'ws-1', 'remote-1').map((session) => session.id)).toEqual([
      'active',
      'archived',
    ])
    expect(getActiveWorkspaceSessionMetas(sessions, 'ws-1', 'remote-1').map((session) => session.id)).toEqual([
      'active',
    ])
  })

  it('builds work queue summary from the shared archive semantics', () => {
    const sessions = [
      meta({ id: 'todo', workspaceId: 'ws-1', sessionStatus: 'todo' }),
      meta({ id: 'flagged', workspaceId: 'ws-1', sessionStatus: 'in-progress', isFlagged: true }),
      meta({ id: 'archived', workspaceId: 'ws-1', sessionStatus: 'done', isArchived: true }),
      meta({ id: 'hidden', workspaceId: 'ws-1', hidden: true, isArchived: true }),
    ]

    const summary = buildWorkQueueSummary(sessions, 'ws-1')

    expect(summary.workspaceSessionMetas.map((session) => session.id)).toEqual(['todo', 'flagged', 'archived'])
    expect(summary.activeSessionMetas.map((session) => session.id)).toEqual(['todo', 'flagged'])
    expect(summary.flaggedCount).toBe(1)
    expect(summary.archivedCount).toBe(1)
  })

  it('preseeds zero status counts before tallying active sessions', () => {
    const counts = buildSessionStatusCounts(
      [
        meta({ id: 'todo', workspaceId: 'ws-1', sessionStatus: 'todo' }),
        meta({ id: 'custom', workspaceId: 'ws-1', sessionStatus: 'blocked' }),
      ],
      ['todo', 'blocked', 'done']
    )

    expect(counts).toEqual({
      todo: 1,
      blocked: 1,
      done: 0,
    })
  })
})
