import { describe, expect, it } from 'bun:test'
import { buildWorkspaceHomeActivityFeed, buildWorkspaceHomeFocusItems, isSparseWorkspace } from '../workspace-home'

describe('buildWorkspaceHomeActivityFeed', () => {
  it('applies weighted scoring so active work outranks pure recency', () => {
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

    // work-1 (290 * 1.5 = 435) now outranks chat-1 (300 * 1.3 = 390)
    expect(feed.map((item) => item.id)).toEqual(['work-1', 'chat-1', 'output-1', 'project-1'])
    expect(feed[0]).toMatchObject({
      kind: 'workItem',
      detail: 'Work item · In Progress',
    })
    expect(feed[2]).toMatchObject({
      kind: 'output',
      detail: 'Output from assistant',
    })
  })

  it('prioritizes active work items over newer reference artifacts', () => {
    const feed = buildWorkspaceHomeActivityFeed({
      recentChats: [],
      recentDocs: [{ id: 'doc-1', title: 'Stale spec', updatedAt: 200, outputIdCount: 0, sourceSessionId: null }],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [],
      recentWorkItems: [{ id: 'work-1', title: 'Active task', updatedAt: 150, status: 'in_progress' }],
    })

    // work-1 (150 * 1.5 = 225) outranks doc-1 (200 * 1.0 = 200)
    expect(feed.map((item) => item.id)).toEqual(['work-1', 'doc-1'])
  })

  it('prioritizes recent chats over newer docs', () => {
    const feed = buildWorkspaceHomeActivityFeed({
      recentChats: [{ id: 'chat-1', name: 'Active discussion', lastMessageAt: 180 }],
      recentDocs: [{ id: 'doc-1', title: 'Slightly newer doc', updatedAt: 200, outputIdCount: 0, sourceSessionId: null }],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [],
      recentWorkItems: [],
    })

    // chat-1: 180 * 1.3 = 234, doc-1: 200 * 1.0 = 200
    expect(feed.map((item) => item.id)).toEqual(['chat-1', 'doc-1'])
  })

  it('does not boost done work items', () => {
    const feed = buildWorkspaceHomeActivityFeed({
      recentChats: [],
      recentDocs: [{ id: 'doc-1', title: 'Reference doc', updatedAt: 200, outputIdCount: 0, sourceSessionId: null }],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [],
      recentWorkItems: [
        { id: 'work-newer-done', title: 'Older active', updatedAt: 190, status: 'done' },
        { id: 'work-older-active', title: 'Newer done', updatedAt: 150, status: 'in_progress' },
      ],
    })

    // work-older-active: 150 * 1.5 = 225, work-newer-done: 190 * 1.0 = 190, doc-1: 200 * 1.0 = 200
    expect(feed.map((item) => item.id)).toEqual(['work-older-active', 'doc-1', 'work-newer-done'])
  })

  it('preserves kind-specific detail strings', () => {
    const feed = buildWorkspaceHomeActivityFeed({
      recentChats: [{ id: 'chat-1', name: 'Sync', lastMessageAt: 300 }],
      recentDocs: [{ id: 'doc-1', title: 'Spec', updatedAt: 250, outputIdCount: 1, sourceSessionId: 'chat-1' }],
      recentOutputs: [{ id: 'output-1', title: 'Log', updatedAt: 280, sourceSessionId: 'chat-1' }],
      recentDecisions: [{ id: 'decision-1', title: 'Use Bun', updatedAt: 200, status: 'accepted' }],
      recentNotebooks: [{ id: 'notebook-1', title: 'Notes', updatedAt: 220 }],
      recentProjects: [{ id: 'project-1', name: 'IA', updatedAt: 260, status: 'active' }],
      recentWorkItems: [{ id: 'work-1', title: 'Polish', updatedAt: 290, status: 'in_progress' }],
    })

    expect(feed.find((i) => i.kind === 'chat')?.detail).toBe('Chat')
    expect(feed.find((i) => i.kind === 'doc')?.detail).toBe('Doc from output')
    expect(feed.find((i) => i.kind === 'output')?.detail).toBe('Output from assistant')
    expect(feed.find((i) => i.kind === 'decision')?.detail).toBe('Decision · accepted')
    expect(feed.find((i) => i.kind === 'notebook')?.detail).toBe('Notebook')
    expect(feed.find((i) => i.kind === 'project')?.detail).toBe('Project · active')
    expect(feed.find((i) => i.kind === 'workItem')?.detail).toBe('Work item · In Progress')
  })

  it('falls back gracefully for legacy project titles and unknown work item statuses', () => {
    const feed = buildWorkspaceHomeActivityFeed({
      recentChats: [],
      recentDocs: [],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [{ id: 'project-1', title: 'Legacy project title', updatedAt: 260, status: 'active' }],
      recentWorkItems: [{ id: 'work-1', title: 'Prep QA pass', updatedAt: 290, status: 'custom_review' }],
    })

    expect(feed.find((i) => i.kind === 'project')?.title).toBe('Legacy project title')
    expect(feed.find((i) => i.kind === 'workItem')?.detail).toBe('Work item · Custom Review')
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

  it('excludes done work items from consideration', () => {
    const focus = buildWorkspaceHomeFocusItems({
      recentChats: [{ id: 'chat-1', preview: 'Hello', lastMessageAt: 400 }],
      recentDocs: [],
      recentOutputs: [{ id: 'output-1', title: 'Result', updatedAt: 300 }],
      recentProjects: [],
      recentWorkItems: [
        { id: 'work-done-1', title: 'Finished', updatedAt: 500, status: 'done' },
        { id: 'work-done-2', title: 'Also done', updatedAt: 450, status: 'done' },
      ],
    })

    // Only chat and output remain — no active work item
    expect(focus).toEqual([
      {
        id: 'chat-1',
        kind: 'chat',
        title: 'Hello',
        detail: 'Resume the latest conversation',
      },
      {
        id: 'output-1',
        kind: 'output',
        title: 'Result',
        detail: 'Review the latest saved output',
      },
    ])
  })

  it('avoids duplicate types when building the focus set', () => {
    const focus = buildWorkspaceHomeFocusItems({
      recentChats: [
        { id: 'chat-1', name: 'First chat', lastMessageAt: 500 },
        { id: 'chat-2', name: 'Second chat', lastMessageAt: 400 },
      ],
      recentDocs: [
        { id: 'doc-1', title: 'Doc A', updatedAt: 300, outputIdCount: 0, sourceSessionId: null },
        { id: 'doc-2', title: 'Doc B', updatedAt: 250, outputIdCount: 0, sourceSessionId: null },
      ],
      recentOutputs: [],
      recentProjects: [],
      recentWorkItems: [],
    })

    // Only 2 categories non-empty → exactly 2 focus items, no duplicate kinds
    expect(focus).toHaveLength(2)
    expect(focus[0].kind).toBe('chat')
    expect(focus[1].kind).toBe('doc')
  })

  it('uses project title fallback and readable work item status labels in focus cards', () => {
    const focus = buildWorkspaceHomeFocusItems({
      recentChats: [],
      recentDocs: [],
      recentOutputs: [],
      recentProjects: [{ id: 'project-1', title: 'Fallback project', updatedAt: 470, status: 'active' }],
      recentWorkItems: [{ id: 'work-1', title: 'Prep QA pass', updatedAt: 490, status: 'custom_review' }],
    })

    expect(focus).toEqual([
      {
        id: 'work-1',
        kind: 'workItem',
        title: 'Prep QA pass',
        detail: 'Move forward in Custom Review',
      },
      {
        id: 'project-1',
        kind: 'project',
        title: 'Fallback project',
        detail: 'Project · active',
      },
    ])
  })
})

describe('isSparseWorkspace', () => {
  it('returns true for an empty workspace', () => {
    expect(isSparseWorkspace({
      recentChats: [],
      recentDocs: [],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [],
      recentWorkItems: [],
      recentSources: [],
    })).toBe(true)
  })

  it('returns true for a low-activity workspace with only light context', () => {
    expect(isSparseWorkspace({
      recentChats: [{ id: 'chat-1', name: 'Intro', lastMessageAt: 100 }],
      recentDocs: [],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [],
      recentWorkItems: [],
      recentSources: [{ id: 'src-1' }],
    })).toBe(true)
  })

  it('returns false once there is durable work in motion', () => {
    expect(isSparseWorkspace({
      recentChats: [{ id: 'chat-1', name: 'Intro', lastMessageAt: 100 }],
      recentDocs: [{ id: 'doc-1', title: 'Plan', updatedAt: 90, outputIdCount: 0, sourceSessionId: null }],
      recentOutputs: [],
      recentDecisions: [],
      recentNotebooks: [],
      recentProjects: [],
      recentWorkItems: [{ id: 'work-1', title: 'Implement', updatedAt: 80, status: 'in_progress' }],
      recentSources: [],
    })).toBe(false)
  })
})
