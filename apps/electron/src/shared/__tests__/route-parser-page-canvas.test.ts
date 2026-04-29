import { describe, it, expect } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRouteToNavigationState,
} from '../route-parser'

describe('page canvas route parsing', () => {
  // =============================================
  // Message-based page canvas routes (existing)
  // =============================================

  it('parses page canvas message routes', () => {
    const result = parseCompoundRoute('pages/from-message/session-1/message-2')

    expect(result).toEqual({
      navigator: 'pageCanvas',
      details: {
        type: 'pageCanvas',
        id: 'session-1:message-2',
      },
    })
  })

  it('converts page canvas routes to navigation state', () => {
    const result = parseRouteToNavigationState('pages/from-message/session-1/message-2')

    expect(result).toEqual({
      navigator: 'pageCanvas',
      details: {
        type: 'pageCanvas',
        sessionId: 'session-1',
        messageId: 'message-2',
      },
    })
  })

  it('builds page canvas routes from compound and navigation state', () => {
    const parsed = parseCompoundRoute('pages/from-message/session-1/message-2')!

    expect(buildCompoundRoute(parsed)).toBe('pages/from-message/session-1/message-2')
    expect(buildRouteFromNavigationState({
      navigator: 'pageCanvas',
      details: {
        type: 'pageCanvas',
        sessionId: 'session-1',
        messageId: 'message-2',
      },
    })).toBe('pages/from-message/session-1/message-2')
  })

  it('supports legacy artifact route format for backwards compatibility', () => {
    const result = parseCompoundRoute('artifact/session/session-1/message/message-2')

    expect(result).toEqual({
      navigator: 'pageCanvas',
      details: {
        type: 'pageCanvas',
        id: 'session-1:message-2',
      },
    })
  })

  // =============================================
  // Saved page routes (new)
  // =============================================

  it('parses docs home routes', () => {
    expect(parseCompoundRoute('pages')).toEqual({
      navigator: 'pageCanvas',
      details: null,
    })

    expect(parseRouteToNavigationState('pages')).toEqual({
      navigator: 'pageCanvas',
      details: null,
    })
  })

  it('builds docs home routes from compound and navigation state', () => {
    const parsed = parseCompoundRoute('pages')!

    expect(buildCompoundRoute(parsed)).toBe('pages')
    expect(buildRouteFromNavigationState({
      navigator: 'pageCanvas',
      details: null,
    })).toBe('pages')
  })

  it('parses saved page routes', () => {
    const result = parseCompoundRoute('pages/page/abc-123')

    expect(result).toEqual({
      navigator: 'pageCanvas',
      details: {
        type: 'savedPage',
        id: 'abc-123',
      },
    })
  })

  it('converts saved page routes to navigation state', () => {
    const result = parseRouteToNavigationState('pages/page/abc-123')

    expect(result).toEqual({
      navigator: 'pageCanvas',
      details: {
        type: 'savedPage',
        pageId: 'abc-123',
      },
    })
  })

  it('builds saved page routes from compound route', () => {
    const parsed = parseCompoundRoute('pages/page/abc-123')!

    expect(buildCompoundRoute(parsed)).toBe('pages/page/abc-123')
  })

  it('builds saved page routes from navigation state', () => {
    expect(buildRouteFromNavigationState({
      navigator: 'pageCanvas',
      details: {
        type: 'savedPage',
        pageId: 'abc-123',
      },
    })).toBe('pages/page/abc-123')
  })

  it('rejects URL-encoded unsafe page IDs in saved page routes', () => {
    const result = parseCompoundRoute('pages/page/my%20page%2F1')

    expect(result).toBeNull()
  })

  it.each([
    '../bad',
    '..%2Fbad',
    'foo%2Fbar',
    'C%3A%5Ctemp%5Cbad',
    'bad%20id',
  ])('rejects unsafe saved page route ID "%s"', (pageId) => {
    expect(parseCompoundRoute(`pages/page/${pageId}`)).toBeNull()
  })

  it('returns null for pages/page with no ID', () => {
    const result = parseCompoundRoute('pages/page')
    expect(result).toBeNull()
  })

  it('opens docs home for pages with no sub-route', () => {
    const result = parseCompoundRoute('pages')
    expect(result).toEqual({
      navigator: 'pageCanvas',
      details: null,
    })
  })

  // =============================================
  // Both routes coexist correctly
  // =============================================

  it('message and saved page routes produce different navigation states', () => {
    const messageState = parseRouteToNavigationState('pages/from-message/sess-1/msg-1')
    const savedState = parseRouteToNavigationState('pages/page/page-1')

    expect(messageState).not.toBeNull()
    expect(savedState).not.toBeNull()
    expect(messageState!.navigator).toBe('pageCanvas')
    expect(savedState!.navigator).toBe('pageCanvas')

    // Type discriminator is different
    expect((messageState as any).details.type).toBe('pageCanvas')
    expect((savedState as any).details.type).toBe('savedPage')
  })
})
