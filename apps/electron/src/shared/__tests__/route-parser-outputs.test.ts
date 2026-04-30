import { describe, it, expect } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'

describe('outputs route parsing', () => {
  it('parses outputs as a view route', () => {
    expect(parseRoute('outputs')).toEqual({
      type: 'view',
      name: 'outputs',
      params: {},
    })
  })

  it('parses saved output detail routes', () => {
    expect(parseRoute('outputs/output/output_abc-123')).toEqual({
      type: 'view',
      name: 'savedOutput',
      id: 'output_abc-123',
      params: {},
    })

    expect(parseRouteToNavigationState('outputs/output/output_abc-123')).toEqual({
      navigator: 'outputs',
      details: { type: 'output', outputId: 'output_abc-123' },
    })
  })

  it('builds outputs routes from helpers and navigation state', () => {
    expect(routes.view.outputs()).toBe('outputs')
    expect(routes.view.savedOutput('output_abc-123')).toBe('outputs/output/output_abc-123')

    expect(buildCompoundRoute(parseCompoundRoute('outputs')!)).toBe('outputs')
    expect(buildRouteFromNavigationState({
      navigator: 'outputs',
      details: null,
    })).toBe('outputs')
    expect(buildRouteFromNavigationState({
      navigator: 'outputs',
      details: { type: 'output', outputId: 'output_abc-123' },
    })).toBe('outputs/output/output_abc-123')
  })

  it('rejects unsafe output ids', () => {
    expect(parseRoute('outputs/output/../bad')).toBeNull()
    expect(parseRouteToNavigationState('outputs/output/bad%2Fid')).toBeNull()
  })
})
