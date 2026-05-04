import { describe, expect, it } from 'bun:test'
import type { OutputIndexEntry, PageListEntry } from '../../../shared/types'
import {
  buildChatSearchResults,
  buildDocSearchResults,
  buildOutputSearchResults,
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
  it('returns representative normalized doc, output, and chat results', () => {
    const docResults = buildDocSearchResults(
      [page('doc_1', { title: 'Research Plan', updatedAt: 20, outputIdCount: 1 })],
      {},
      'research'
    )
    const outputResults = buildOutputSearchResults(
      [output('out_1', { title: 'Saved Answer', updatedAt: 30, sourceSessionId: 'chat_1', preview: 'assistant response' })],
      {},
      'saved'
    )
    const chatResults = buildChatSearchResults(
      [session('chat_1', { name: 'Planning Chat', lastMessageAt: 40, preview: 'draft plan' })],
      'planning'
    )

    expect(docResults[0]).toMatchObject({
      id: 'doc_1',
      type: 'doc',
      title: 'Research Plan',
      route: 'pages/page/doc_1',
      updatedAt: 20,
      meta: 'Created from Output',
    })
    expect(outputResults[0]).toMatchObject({
      id: 'out_1',
      type: 'output',
      title: 'Saved Answer',
      route: 'outputs/output/out_1',
      updatedAt: 30,
      meta: 'From assistant response',
    })
    expect(chatResults[0]).toMatchObject({
      id: 'chat_1',
      type: 'chat',
      title: 'Planning Chat',
      route: 'allSessions/session/chat_1',
      updatedAt: 40,
      meta: 'Chat',
    })
  })

  it('sorts title matches before body matches, then by updated time', () => {
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
      'needle'
    )

    expect(results.map(result => result.id)).toEqual(['title_newer', 'title_older', 'body_newer'])
  })

  it('uses consistent fallback provenance and title copy', () => {
    expect(buildDocSearchResults([page('doc', { title: '', sourceSessionId: 'chat_1' })], {}, 'untitled')[0]).toMatchObject({
      title: 'Untitled Doc',
      snippet: 'Title match',
      meta: 'From chat',
    })
    expect(buildOutputSearchResults([output('out', { title: '', preview: 'untitled body' })], {}, 'untitled')[0]).toMatchObject({
      title: 'Untitled Output',
      meta: 'Saved manually',
    })
    expect(buildChatSearchResults([session('chat', { name: '', preview: '' })], 'untitled')[0]).toMatchObject({
      title: 'Untitled Chat',
      snippet: 'No preview available',
    })
  })

  it('does not return results for blank queries', () => {
    expect(buildDocSearchResults([page('doc')], {}, '   ')).toEqual([])
    expect(buildOutputSearchResults([output('out')], {}, '')).toEqual([])
    expect(buildChatSearchResults([session('chat')], '\n')).toEqual([])
  })
})
