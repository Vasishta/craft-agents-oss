import { describe, expect, it } from 'bun:test'
import {
  buildProjectChatLink,
  buildProjectDecisionLink,
  buildProjectDocLink,
  buildProjectLinkedLookups,
  buildProjectNotebookLink,
  buildProjectOutputLink,
  buildProjectWorkItemLink,
} from '../project-links'

describe('project-links', () => {
  it('builds direct routes for every linked durable object type', () => {
    expect(buildProjectDocLink('doc-1', { id: 'doc-1', title: 'PRD', createdAt: 0, updatedAt: 0, workspaceId: 'w', outputIdCount: 0 }).route)
      .toBe('pages/page/doc-1')
    expect(buildProjectOutputLink('out-1', { id: 'out-1', title: 'Draft', kind: 'generic', contentType: 'markdown', createdAt: 0, updatedAt: 0, workspaceId: 'w', status: 'saved', preview: '' }).route)
      .toBe('outputs/output/out-1')
    expect(buildProjectDecisionLink('dec-1', { id: 'dec-1', title: 'Keep Workspace separate', status: 'accepted', createdAt: 0, updatedAt: 0, workspaceId: 'w', projectIds: [], linkCounts: { projectCount: 0, sessionCount: 0, docCount: 0, outputCount: 0, workItemCount: 0, sourceCount: 0, notebookCount: 0, supersedesDecisionCount: 0 } }).route)
      .toBe('decisions/decision/dec-1')
    expect(buildProjectNotebookLink('note-1', { id: 'note-1', title: 'Research', status: 'active', createdAt: 0, updatedAt: 0, workspaceId: 'w', projectIds: [], sectionCount: 0, linkCounts: { projectCount: 0, sessionCount: 0, docCount: 0, outputCount: 0, workItemCount: 0, sourceCount: 0, decisionCount: 0 } }).route)
      .toBe('notebooks/notebook/note-1')
    expect(buildProjectWorkItemLink('task-1', { id: 'task-1', title: 'Polish project surface', status: 'ready', createdAt: 0, updatedAt: 0, workspaceId: 'w', linkCounts: { sessionCount: 0, docCount: 0, outputCount: 0 } }).route)
      .toBe('workQueue/work-item/task-1')
    expect(buildProjectChatLink('session-1', { id: 'session-1', workspaceId: 'w', name: 'Design review' }).route)
      .toBe('allSessions/session/session-1')
  })

  it('falls back to ids when list entries are missing', () => {
    expect(buildProjectDocLink('doc-404', undefined).title).toBe('Doc doc-404')
    expect(buildProjectOutputLink('out-404', undefined).title).toBe('Output out-404')
    expect(buildProjectDecisionLink('dec-404', undefined).title).toBe('Decision dec-404')
    expect(buildProjectNotebookLink('note-404', undefined).title).toBe('Notebook note-404')
    expect(buildProjectWorkItemLink('task-404', undefined).title).toBe('Work item task-404')
    expect(buildProjectChatLink('session-404', undefined).title).toBe('Chat session-404')
  })

  it('builds fast id lookups for linked resource hydration', () => {
    const lookups = buildProjectLinkedLookups({
      sessions: [{ id: 'session-1', workspaceId: 'w', name: 'Queue polish' }],
      docs: [{ id: 'doc-1', title: 'Current state', createdAt: 0, updatedAt: 0, workspaceId: 'w', outputIdCount: 0 }],
      outputs: [],
      decisions: [],
      notebooks: [],
      workItems: [],
    })

    expect(lookups.sessions.get('session-1')?.name).toBe('Queue polish')
    expect(lookups.docs.get('doc-1')?.title).toBe('Current state')
  })
})
