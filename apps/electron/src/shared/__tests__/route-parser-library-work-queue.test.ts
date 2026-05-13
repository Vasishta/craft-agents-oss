import { describe, it, expect } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'
import { getNavigationStateKey, parseNavigationStateKey } from '../types'

describe('library and work queue route parsing', () => {
  it('parses library as a view route and navigation state', () => {
    expect(parseRoute('library')).toEqual({
      type: 'view',
      name: 'library',
      params: {},
    })
    expect(parseRouteToNavigationState('library')).toEqual({
      navigator: 'library',
      details: null,
    })
  })

  it('builds library routes from helpers, compound routes, and navigation state keys', () => {
    const state = { navigator: 'library' as const, details: null }
    const parsed = parseCompoundRoute('library')!

    expect(routes.view.library()).toBe('library')
    expect(buildCompoundRoute(parsed)).toBe('library')
    expect(buildRouteFromNavigationState(state)).toBe('library')
    expect(parseNavigationStateKey(getNavigationStateKey(state))).toEqual(state)
  })

  it('parses work queue as a view route and navigation state', () => {
    expect(parseRoute('workQueue')).toEqual({
      type: 'view',
      name: 'workQueue',
      params: {},
    })
    expect(parseRouteToNavigationState('workQueue')).toEqual({
      navigator: 'workQueue',
      details: null,
    })
  })

  it('builds work queue routes from helpers, compound routes, and navigation state keys', () => {
    const state = { navigator: 'workQueue' as const, details: null }
    const parsed = parseCompoundRoute('workQueue')!

    expect(routes.view.workQueue()).toBe('workQueue')
    expect(buildCompoundRoute(parsed)).toBe('workQueue')
    expect(buildRouteFromNavigationState(state)).toBe('workQueue')
    expect(parseNavigationStateKey(getNavigationStateKey(state))).toEqual(state)
  })
})
