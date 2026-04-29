import { describe, it, expect } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  isCompoundRoute,
  parseCompoundRoute,
  parseRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'

describe('home route parsing', () => {
  it('parses home as a view route', () => {
    expect(parseRoute('home')).toEqual({
      type: 'view',
      name: 'home',
      params: {},
    })
  })

  it('parses home into navigation state', () => {
    expect(parseRouteToNavigationState('home')).toEqual({
      navigator: 'home',
      details: null,
    })
  })

  it('builds home routes from helpers and navigation state', () => {
    const parsed = parseCompoundRoute('home')!

    expect(routes.view.home()).toBe('home')
    expect(buildCompoundRoute(parsed)).toBe('home')
    expect(buildRouteFromNavigationState({
      navigator: 'home',
      details: null,
    })).toBe('home')
  })

  it('does not classify home as a compound route prefix', () => {
    expect(isCompoundRoute('home')).toBe(false)
  })
})
