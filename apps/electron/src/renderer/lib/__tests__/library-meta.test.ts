import { describe, expect, it } from 'bun:test'
import { buildLibraryCounts, filterLibraryItems, normalizeLibraryItems, type LibraryItem } from '../library-meta'

describe('library-meta', () => {
  it('normalizes durable objects into a single updated-order list with provenance hints', () => {
    const items = normalizeLibraryItems({
      pages: [{
        id: 'page-1',
        title: 'Spec',
        createdAt: 1,
        updatedAt: 10,
        workspaceId: 'workspace-a',
        sourceSessionId: 'session-1',
        sourceMessageId: 'message-1',
        notebookId: undefined,
        outputIdCount: 0,
      }],
      outputs: [{
        id: 'output-1',
        workspaceId: 'workspace-a',
        title: 'Saved response',
        kind: 'assistant_response',
        contentType: 'markdown',
        createdAt: 2,
        updatedAt: 20,
        status: 'saved',
        preview: 'Preview',
      }],
      decisions: [{
        id: 'decision-1',
        workspaceId: 'workspace-a',
        title: 'Adopt RPC',
        status: 'accepted',
        createdAt: 3,
        updatedAt: 15,
        projectIds: [],
        linkCounts: {
          projectCount: 0,
          sessionCount: 0,
          docCount: 1,
          outputCount: 1,
          workItemCount: 0,
          sourceCount: 0,
          notebookCount: 0,
          supersedesDecisionCount: 0,
        },
      }],
      notebooks: [{
        id: 'notebook-1',
        workspaceId: 'workspace-a',
        title: 'Launch notes',
        description: '',
        status: 'active',
        createdAt: 4,
        updatedAt: 12,
        projectIds: ['project-1'],
        sectionCount: 2,
        linkCounts: {
          projectCount: 1,
          sessionCount: 0,
          docCount: 2,
          outputCount: 0,
          workItemCount: 0,
          sourceCount: 0,
          decisionCount: 1,
        },
      }],
    })

    expect(items.map((item) => item.id)).toEqual(['output-1', 'decision-1', 'notebook-1', 'page-1'])
    expect(items.find((item) => item.id === 'page-1')?.provenance).toBe('From chat')
    expect(items.find((item) => item.id === 'decision-1')?.provenance).toBe('Created from output or linked durable work')
    expect(items.find((item) => item.id === 'notebook-1')?.provenance).toBe('Linked project notebook')
  })

  it('builds counts and filters by durable object kind', () => {
    const items: LibraryItem[] = [
      { id: '1', kind: 'doc', updatedAt: 1, createdAt: 1, title: 'Doc', description: '', metaLabel: 'Doc', provenance: '' },
      { id: '2', kind: 'output', updatedAt: 1, createdAt: 1, title: 'Output', description: '', metaLabel: 'Output', provenance: '' },
      { id: '3', kind: 'output', updatedAt: 1, createdAt: 1, title: 'Output 2', description: '', metaLabel: 'Output', provenance: '' },
    ]

    expect(buildLibraryCounts(items)).toEqual({
      all: 3,
      doc: 1,
      output: 2,
      decision: 0,
      notebook: 0,
    })
    expect(filterLibraryItems(items, 'output').map((item) => item.id)).toEqual(['2', '3'])
    expect(filterLibraryItems(items, 'all').map((item) => item.id)).toEqual(['1', '2', '3'])
  })
})
