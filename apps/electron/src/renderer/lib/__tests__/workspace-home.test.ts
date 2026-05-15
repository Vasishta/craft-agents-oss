import { describe, expect, it } from 'bun:test'
import { buildWorkspaceHomeActivityFeed, buildWorkspaceHomeFocusItems } from '../workspace-home'

describe('buildWorkspaceHomeActivityFeed', () => {
  it('sorts mixed durable activity by timestamp and preserves kind-specific detail', () => {
    const feed = buildWorkspaceHomeActivityFeed({
      recentChats: [{ id: 'chat-1', name: 'Agent sync', lastMessageAt: 300 }],
      recentDocs: [{ id: 'doc-1', title: 'Spec', updatedAt: 250, outputIdCount: 1, sourceSessionId: 'chat-1' }],
      recentOutputs: [{ id: 'output-1', title: 'Build log', updatedAt: 280, sourceSessionId: 'chat-1' }],
      recentDecisions: [{ id: 'decision-1', title: 'Use Bun', updatedAt: 200, status: 'accepted' }],
      recentNotebooks: [{ id: 'notebook-1', title: 'Research', updatedAt: 220 }],
      recentProjects: [{ id: 'project-1', name: 'Workspace IA', updatedAt: 260, status: 'active' }],
      recentWorkItems: [{ id: 'work-1', title: 'Polish home', updatedAt: 290, status: 'in_progress' }],
      limit: 4,
    })

    expect(feed.map((item) => item.id)).toEqual(['chat-1', 'work-1', 'output-1', 'project-1'])
    expect(feed[1]).toMatchObject({
      kind: 'workItem',
      detail: 'Work item · In Progress',
    })
    expect(feed[2]).toMatchObject({
      kind: 'output',
      detail: 'Output from assistant',
    })
  })
})

describe('buildWorkspaceHomeFocusItems', () => {
  it('prioritizes active work, latest chat, and the strongest durable follow-up', () => {
    const focus = buildWorkspaceHomeFocusItems({
      recentChats: [{ id: 'chat-1', preview: 'Continue the IA pass', lastMessageAt: 500 }],
      recentDocs: [{ id: 'doc-1', title: 'Current state', updatedAt: 450, outputIdCount: 0, sourceSessionId: null }],
      recentOutputs: [{ id: 'output-1', title: 'Notes', updatedAt: 430 }],
      recentProjects: [{ id: 'project-1', name: 'Transition shell', updatedAt: 470, status: 'active' }],
      recentWorkItems: [
        { id: 'work-done', title: 'Closed task', updatedAt: 600, status: 'done' },
        { id: 'work-1', title: 'Declutter Workspace Home', updatedAt: 490, status: 'in_progress' },
      ],
    })

    expect(focus).toEqual([
      {
        id: 'work-1',
        kind: 'workItem',
        title: 'Declutter Workspace Home',
        detail: 'Move forward in In Progress',
      },
      {
        id: 'chat-1',
        kind: 'chat',
        title: 'Continue the IA pass',
        detail: 'Resume the latest conversation',
      },
      {
        id: 'project-1',
        kind: 'project',
        title: 'Transition shell',
        detail: 'Project · active',
      },
    ])
  })
})
