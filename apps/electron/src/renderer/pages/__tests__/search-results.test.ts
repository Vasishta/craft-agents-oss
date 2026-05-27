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

describe('scoring model: provenance tiebreaker beats recency on equal scores', () => {
  it('ranks a well-connected older doc above a newer plain doc when both are title-matched with same rankWeight', () => {
    const results = buildMixedSearchResults([
      buildDocSearchResults(
        [
          page('plain_new', { title: 'Design system', updatedAt: 200 }),
          page('linked_old', { title: 'Design system', updatedAt: 50, outputIdCount: 3, sourceSessionId: 'chat_1' }),
        ],
        {},
        'design system',
      ),
    ])

    // Both are title-matched. score = 0 + 200 = 200 for both (same rankWeight).
    // linked_old has provenanceTiebreaker = 3 + 1 = 4.
    // plain_new has provenanceTiebreaker = 0.
    // linked_old should rank higher despite being much older.
    expect(results.map((r) => r.id)).toEqual(['linked_old', 'plain_new'])
  })

  it('ranks a connected output above a plain output when both are content-matched with same score', () => {
    const results = buildMixedSearchResults([
      buildOutputSearchResults(
        [
          output('plain_out', { title: 'Other', updatedAt: 300, preview: 'design system components and patterns', sourceSessionId: undefined }),
          output('linked_out', { title: 'Other', updatedAt: 100, preview: 'design system components and patterns', sourceSessionId: 'chat_1', promotedDocId: 'doc_1' }),
        ],
        {},
        'design system',
      ),
    ])

    // Both content-matched. score = 0 + 80 = 80 for both (same rankWeight since no rankWeight signals on content-matched simple outputs).
    // linked_out has provenanceTiebreaker = 1 + 1 = 2.
    // plain_out has provenanceTiebreaker = 0.
    // linked_out should rank higher even though it's older.
    expect(results.map((r) => r.id)).toEqual(['linked_out', 'plain_out'])
  })

  it('ranks a linked decision above a plain decision on equal title-match score', () => {
    const results = buildMixedSearchResults([
      buildDecisionSearchResults(
        [
          decision('plain_dec', { title: 'API choice', updatedAt: 200, linkCounts: { projectCount: 0, sessionCount: 0, docCount: 0, outputCount: 0, workItemCount: 0, sourceCount: 0, notebookCount: 0, supersedesDecisionCount: 0 } }),
          decision('linked_dec', { title: 'API choice', updatedAt: 100, linkCounts: { projectCount: 2, sessionCount: 1, docCount: 3, outputCount: 0, workItemCount: 0, sourceCount: 0, notebookCount: 0, supersedesDecisionCount: 0 }, status: 'accepted' }),
        ],
        {},
        'api choice',
      ),
    ])

    // Both title-matched. linked_dec has higher rankWeight (provenance), so higher score.
    // But even if rankWeight equal, tiebreaker would split them.
    // linked_dec has provenanceTiebreaker = 2 + 1 + 3 = 6.
    // This test ensures the primary score (with rankWeight) also prefers linked.
    expect(results.map((r) => r.id)).toEqual(['linked_dec', 'plain_dec'])
  })

  it('does not let provenance tiebreaker override match-tier gaps', () => {
    const results = buildMixedSearchResults([
      buildDocSearchResults(
        [
          page('content_heavy', { title: 'Unrelated', updatedAt: 150, outputIdCount: 5, sourceSessionId: 'chat_1' }),
          page('title_only', { title: 'Exact design match', updatedAt: 50 }),
        ],
        { content_heavy: 'design system architecture decisions and long discussion' },
        'design',
      ),
    ])

    // title_only: title-matched, score = 0 + 200 = 200.
    // content_heavy: content-matched, score = 0 + 80 = 80.
    // title_only wins regardless of content_heavy's high provenance tiebreaker.
    expect(results.map((r) => r.id)).toEqual(['title_only', 'content_heavy'])
  })

  it('ranks a linked work item above another with same rankWeight but newer when tiebreaker is higher', () => {
    const results = buildMixedSearchResults([
      buildWorkItemSearchResults(
        [
          workItem('work_plain', { title: 'Refactor auth', updatedAt: 200, linkCounts: { sessionCount: 0, docCount: 0, outputCount: 0 }, priority: undefined }),
          workItem('work_linked', { title: 'Refactor auth', updatedAt: 50, linkCounts: { sessionCount: 5, docCount: 2, outputCount: 0 }, priority: 'P1' }),
        ],
        'refactor auth',
      ),
    ])

    // Both are title-matched. work_linked has higher rankWeight, so higher score.
    expect(results.map((r) => r.id)).toEqual(['work_linked', 'work_plain'])
  })

  it('cross-type: a title-matched decision outranks a title-matched chat due to status-derived rankWeight', () => {
    const results = buildMixedSearchResults([
      buildChatSearchResults([
        { id: 'chat_1', name: 'Design review', lastMessageAt: 300, preview: '' },
      ], 'design review'),
      buildDecisionSearchResults(
        [
          decision('decision_1', {
            title: 'Design review',
            updatedAt: 100,
            linkCounts: { projectCount: 0, sessionCount: 0, docCount: 0, outputCount: 0, workItemCount: 0, sourceCount: 0, notebookCount: 0, supersedesDecisionCount: 0 },
            status: 'accepted',
          }),
        ],
        {},
        'design review',
      ),
    ])

    // Chat: score = 2 (baseline) + 200 = 202.
    // Decision: score = 0 + 200 = 200 (no provenance signals, but status 'accepted' gives 12, so 12+200=212).
    // Actually decision has status='accepted' which gives a rankWeight of 12. So score = 12 + 200 = 212.
    // Decision outranks chat on score alone.
    expect(results[0].id).toBe('decision_1')
  })

  it('uses recency as tertiary sort when score and provenance tiebreaker are equal', () => {
    const results = buildDocSearchResults(
      [
        page('older', { title: 'Same title', updatedAt: 10 }),
        page('newer', { title: 'Same title', updatedAt: 20 }),
      ],
      {},
      'same title',
    )

    expect(results.map((r) => r.id)).toEqual(['newer', 'older'])
  })
})

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
