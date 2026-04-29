import { describe, it, expect } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRouteToNavigationState,
} from '../route-parser'

describe('search route parsing', () => {
  it('parses search routes', () => {
    expect(parseCompoundRoute('search')).toEqual({
      navigator: 'search',
      details: null,
    })

    expect(parseRouteToNavigationState('search')).toEqual({
      navigator: 'search',
      details: null,
    })
  })

  it('builds search routes from compound and navigation state', () => {
    const parsed = parseCompoundRoute('search')!

    expect(buildCompoundRoute(parsed)).toBe('search')
    expect(buildRouteFromNavigationState({
      navigator: 'search',
      details: null,
    })).toBe('search')
  })
})
