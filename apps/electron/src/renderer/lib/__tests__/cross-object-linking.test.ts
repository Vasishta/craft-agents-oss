import { describe, expect, it } from 'bun:test'
import {
  buildDecisionFromOutput,
  buildProjectLinkPatch,
  buildWorkItemFromOutput,
  isProjectLinkedToEntity,
} from '../cross-object-linking'

describe('cross-object linking helpers', () => {
  it('maps entity kinds to project link patches', () => {
    expect(buildProjectLinkPatch('output', 'output-1')).toEqual({ outputIds: ['output-1'] })
    expect(buildProjectLinkPatch('decision', 'decision-1')).toEqual({ decisionIds: ['decision-1'] })
    expect(buildProjectLinkPatch('notebook', 'notebook-1')).toEqual({ notebookIds: ['notebook-1'] })
  })

  it('detects whether a project already links an entity', () => {
    const project = {
      links: {
        sessionIds: [],
        docIds: [],
        outputIds: ['output-1'],
        workItemIds: [],
        sourceIds: [],
        decisionIds: ['decision-1'],
        notebookIds: [],
      },
    }

    expect(isProjectLinkedToEntity(project, 'output', 'output-1')).toBe(true)
    expect(isProjectLinkedToEntity(project, 'decision', 'decision-1')).toBe(true)
    expect(isProjectLinkedToEntity(project, 'notebook', 'notebook-1')).toBe(false)
  })

  it('builds a work item payload from output provenance', () => {
    expect(buildWorkItemFromOutput({
      id: 'output-1',
      title: 'Refactor queue metadata',
      content: 'Capture the remaining work and move the shell forward.',
      sourceSessionId: 'session-1',
      promotedDocId: 'page-1',
    })).toEqual({
      title: 'Refactor queue metadata',
      description: 'Capture the remaining work and move the shell forward.',
      status: 'backlog',
      type: 'task',
      linkedOutputIds: ['output-1'],
      linkedSessionIds: ['session-1'],
      linkedDocIds: ['page-1'],
    })
  })

  it('builds a decision payload from output provenance', () => {
    const decision = buildDecisionFromOutput({
      id: 'output-1',
      title: 'Adopt durable linking',
      content: 'We should make linking explicit before expanding search.',
      sourceSessionId: 'session-1',
      sourceMessageId: 'message-1',
      promotedDocId: 'page-1',
    })

    expect(decision.title).toBe('Adopt durable linking')
    expect(decision.status).toBe('proposed')
    expect(decision.context).toContain('Created from output')
    expect(decision.decision).toContain('make linking explicit')
    expect(decision.links?.outputIds).toEqual(['output-1'])
    expect(decision.links?.sessionIds).toEqual(['session-1'])
    expect(decision.links?.docIds).toEqual(['page-1'])
    expect(decision.sourceOutputId).toBe('output-1')
  })
})
