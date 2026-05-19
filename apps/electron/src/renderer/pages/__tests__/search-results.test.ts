import { describe, expect, it } from 'bun:test'
import type {
  DecisionIndexEntry,
  NotebookIndexEntry,
  OutputIndexEntry,
  PageListEntry,
  ProjectIndexEntry,
  WorkItemIndexEntry,
} from '../../../shared/types'
import {
  buildChatSearchResults,
  buildDecisionSearchResults,
  buildDocSearchResults,
  buildMixedSearchResults,
  buildNotebookSearchResults,
  buildOutputSearchResults,
  buildProjectSearchResults,
  buildWorkItemSearchResults,
  countSearchResultsByType,
  type SearchableSessionMeta,
} from '../search-results'

function page(id: string, overrides: Partial<PageListEntry> = {}): PageListEntry {
  return {
    id,
    title: `Doc ${id}`,
    createdAt: 1,
    updatedAt: 1,
    workspaceId: 'ws-1',
    outputIdCount: 0,
    ...overrides,
  }
}

function output(id: string, overrides: Partial<OutputIndexEntry> = {}): OutputIndexEntry {
  return {
    id,
    workspaceId: 'ws-1',
    title: `Output ${id}`,
    kind: 'assistant_response',
    contentType: 'markdown',
    createdAt: 1,
    updatedAt: 1,
    status: 'saved',
    preview: '',
    ...overrides,
  }
}

function decision(id: string, overrides: Partial<DecisionIndexEntry> = {}): DecisionIndexEntry {
  return {
    id,
    workspaceId: 'ws-1',
    title: `Decision ${id}`,
    status: 'accepted',
    createdAt: 1,
    updatedAt: 1,
    projectIds: [],
    linkCounts: {
      projectCount: 0,
      sessionCount: 0,
      docCount: 0,
      outputCount: 0,
      workItemCount: 0,
      sourceCount: 0,
      notebookCount: 0,
      supersedesDecisionCount: 0,
    },
    ...overrides,
  }
}

function notebook(id: string, overrides: Partial<NotebookIndexEntry> = {}): NotebookIndexEntry {
  return {
    id,
    workspaceId: 'ws-1',
    title: `Notebook ${id}`,
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    projectIds: [],
    sectionCount: 0,
    linkCounts: {
      projectCount: 0,
      sessionCount: 0,
      docCount: 0,
      outputCount: 0,
      workItemCount: 0,
      sourceCount: 0,
      decisionCount: 0,
    },
    ...overrides,
  }
}

function project(id: string, overrides: Partial<ProjectIndexEntry> = {}): ProjectIndexEntry {
  return {
    id,
    workspaceId: 'ws-1',
    name: `Project ${id}`,
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    linkCounts: {
      sessionCount: 0,
      docCount: 0,
      outputCount: 0,
      workItemCount: 0,
      sourceCount: 0,
      decisionCount: 0,
      notebookCount: 0,
    },
    ...overrides,
  }
}

function workItem(id: string, overrides: Partial<WorkItemIndexEntry> = {}): WorkItemIndexEntry {
  return {
    id,
    workspaceId: 'ws-1',
    title: `Work ${id}`,
    status: 'ready',
    createdAt: 1,
    updatedAt: 1,
    linkCounts: {
      sessionCount: 0,
      docCount: 0,
      outputCount: 0,
    },
    ...overrides,
  }
}

function session(id: string, overrides: Partial<SearchableSessionMeta> = {}): SearchableSessionMeta {
  return {
    id,
    name: `Chat ${id}`,
    preview: '',
    createdAt: 1,
    lastMessageAt: 1,
    ...overrides,
  }
}

describe('search result builders', () => {
  it('returns representative normalized results for every supported object type', () => {
    const docResults = buildDocSearchResults(
      [page('doc_1', { title: 'Research Plan', updatedAt: 20, outputIdCount: 1 })],
      {},
      'research',
    )
    const outputResults = buildOutputSearchResults(
      [output('out_1', { title: 'Saved Answer', updatedAt: 30, sourceSessionId: 'chat_1', preview: 'assistant response' })],
      {},
      'saved',
    )
    const decisionResults = buildDecisionSearchResults(
      [decision('decision_1', { title: 'Search ranking', updatedAt: 40 })],
      { decision_1: 'ranking and provenance' },
      'ranking',
    )
    const notebookResults = buildNotebookSearchResults(
      [notebook('note_1', { title: 'Search notes', updatedAt: 50, sectionCount: 2 })],
      { note_1: 'cross object ideas' },
      'search',
    )
    const projectResults = buildProjectSearchResults(
      [project('project_1', { name: 'Search transition', updatedAt: 60, description: 'workspace search polish' })],
      'search',
    )
    const workItemResults = buildWorkItemSearchResults(
      [workItem('work_1', { title: 'Expand search', updatedAt: 70, description: 'mixed results', priority: 'P1' })],
      'search',
    )
    const chatResults = buildChatSearchResults(
      [session('chat_1', { name: 'Planning Chat', lastMessageAt: 80, preview: 'draft plan' })],
      'planning',
    )

    expect(docResults[0]).toMatchObject({
      id: 'doc_1',
      type: 'doc',
      typeLabel: 'Doc',
      route: 'pages/page/doc_1',
      meta: 'Created from Output',
    })
    expect(outputResults[0]).toMatchObject({
      id: 'out_1',
      type: 'output',
      typeLabel: 'Output',
      route: 'outputs/output/out_1',
      meta: 'From assistant response',
    })
    expect(decisionResults[0]).toMatchObject({
      id: 'decision_1',
      type: 'decision',
      typeLabel: 'Decision',
      route: 'decisions/decision/decision_1',
    })
    expect(notebookResults[0]).toMatchObject({
      id: 'note_1',
      type: 'notebook',
      typeLabel: 'Notebook',
      route: 'notebooks/notebook/note_1',
    })
    expect(projectResults[0]).toMatchObject({
      id: 'project_1',
      type: 'project',
      typeLabel: 'Project',
      route: 'projects/project/project_1',
    })
    expect(workItemResults[0]).toMatchObject({
      id: 'work_1',
      type: 'workItem',
      typeLabel: 'Work Item',
      route: 'workQueue/work-item/work_1',
    })
    expect(chatResults[0]).toMatchObject({
      id: 'chat_1',
      type: 'chat',
      typeLabel: 'Chat',
      route: 'allSessions/session/chat_1',
      meta: 'Recent workspace chat',
    })
  })

  it('sorts title matches before body matches inside per-type builders', () => {
    const results = buildDocSearchResults(
      [
        page('body_newer', { title: 'Other newer', updatedAt: 30 }),
        page('title_older', { title: 'Needle old', updatedAt: 10 }),
        page('title_newer', { title: 'Needle new', updatedAt: 20 }),
      ],
      {
        body_newer: 'needle appears in body',
        title_older: '',
        title_newer: '',
      },
      'needle',
    )

    expect(results.map((result) => result.id)).toEqual(['title_newer', 'title_older', 'body_newer'])
  })

  it('builds a mixed result stream and type counts across all result groups', () => {
    const results = buildMixedSearchResults([
      buildProjectSearchResults([project('project_1', { updatedAt: 100, description: 'search roadmap' })], 'search'),
      buildChatSearchResults([session('chat_1', { lastMessageAt: 120, preview: 'search roadmap' })], 'search'),
      buildWorkItemSearchResults([workItem('work_1', { updatedAt: 110, description: 'search roadmap' })], 'search'),
    ])

    expect(results.map((result) => result.id)).toEqual(['chat_1', 'work_1', 'project_1'])
    expect(countSearchResultsByType(results)).toMatchObject({
      chat: 1,
      project: 1,
      workItem: 1,
    })
  })

  it('prefers provenance-rich and better-linked results over newer but weaker matches', () => {
    const results = buildMixedSearchResults([
      buildDocSearchResults(
        [
          page('plain_newer', { title: 'Architecture', updatedAt: 300 }),
          page('linked_older', { title: 'Architecture', updatedAt: 100, outputIdCount: 2, sourceSessionId: 'chat_1' }),
        ],
        {},
        'architecture',
      ),
      buildDecisionSearchResults(
        [
          decision('decision_1', {
            title: 'Architecture',
            updatedAt: 200,
            status: 'accepted',
            linkCounts: {
              projectCount: 1,
              sessionCount: 1,
              docCount: 2,
              outputCount: 1,
              workItemCount: 0,
              sourceCount: 0,
              notebookCount: 0,
              supersedesDecisionCount: 0,
            },
          }),
        ],
        {},
        'architecture',
      ),
    ])

    expect(results.map((result) => result.id)).toEqual(['linked_older', 'decision_1', 'plain_newer'])
  })

  it('uses consistent fallback copy and ignores blank queries', () => {
    expect(buildDocSearchResults([page('doc', { title: '', sourceSessionId: 'chat_1' })], {}, 'untitled')[0]).toMatchObject({
      title: 'Untitled Doc',
      snippet: 'Title match',
      meta: 'From chat',
    })
    expect(buildOutputSearchResults([output('out', { title: '', preview: 'untitled body' })], {}, 'untitled')[0]).toMatchObject({
      title: 'Untitled Output',
      meta: 'Saved manually',
    })
    expect(buildDecisionSearchResults([decision('decision', { title: '' })], { decision: 'untitled body' }, 'untitled')[0]).toMatchObject({
      title: 'Untitled Decision',
    })
    expect(buildChatSearchResults([session('chat', { name: '', preview: '' })], 'untitled')[0]).toMatchObject({
      title: 'Untitled Chat',
      snippet: 'Title match',
    })

    expect(buildDocSearchResults([page('doc')], {}, '   ')).toEqual([])
    expect(buildOutputSearchResults([output('out')], {}, '')).toEqual([])
    expect(buildDecisionSearchResults([decision('decision')], {}, ' ')).toEqual([])
    expect(buildNotebookSearchResults([notebook('note')], {}, '\n')).toEqual([])
    expect(buildProjectSearchResults([project('project')], '\t')).toEqual([])
    expect(buildWorkItemSearchResults([workItem('work')], '\n')).toEqual([])
    expect(buildChatSearchResults([session('chat')], '\n')).toEqual([])
  })
})
