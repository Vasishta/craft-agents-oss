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

    expect(parseRoute('workQueue/work-item/task_123')).toEqual({
      type: 'view',
      name: 'workItem',
      id: 'task_123',
      params: {},
    })
    expect(parseRouteToNavigationState('workQueue/work-item/task_123')).toEqual({
      navigator: 'workQueue',
      details: { type: 'workItem', workItemId: 'task_123' },
    })
  })

  it('builds work queue routes from helpers, compound routes, and navigation state keys', () => {
    const state = { navigator: 'workQueue' as const, details: null }
    const detailState = { navigator: 'workQueue' as const, details: { type: 'workItem' as const, workItemId: 'task_123' } }
    const parsed = parseCompoundRoute('workQueue')!

    expect(routes.view.workQueue()).toBe('workQueue')
    expect(routes.view.workItem('task_123')).toBe('workQueue/work-item/task_123')
    expect(buildCompoundRoute(parsed)).toBe('workQueue')
    expect(buildRouteFromNavigationState(state)).toBe('workQueue')
    expect(buildRouteFromNavigationState(detailState)).toBe('workQueue/work-item/task_123')
    expect(parseNavigationStateKey(getNavigationStateKey(state))).toEqual(state)
    expect(parseNavigationStateKey(getNavigationStateKey(detailState))).toEqual(detailState)
  })

  it('parses decisions and notebooks detail routes as navigation-safe surfaces', () => {
    expect(parseRoute('decisions/decision/decision-123')).toEqual({
      type: 'view',
      name: 'decision',
      id: 'decision-123',
      params: {},
    })
    expect(parseRouteToNavigationState('decisions/decision/decision-123')).toEqual({
      navigator: 'decisions',
      details: { type: 'decision', decisionId: 'decision-123' },
    })

    expect(parseRoute('notebooks/notebook/notebook-456')).toEqual({
      type: 'view',
      name: 'notebook',
      id: 'notebook-456',
      params: {},
    })
    expect(parseRouteToNavigationState('notebooks/notebook/notebook-456')).toEqual({
      navigator: 'notebooks',
      details: { type: 'notebook', notebookId: 'notebook-456' },
    })
  })

  it('builds decisions and notebooks routes from helpers and navigation state keys', () => {
    const decisionState = { navigator: 'decisions' as const, details: { type: 'decision' as const, decisionId: 'decision-123' } }
    const notebookState = { navigator: 'notebooks' as const, details: { type: 'notebook' as const, notebookId: 'notebook-456' } }

    expect(routes.view.decision('decision-123')).toBe('decisions/decision/decision-123')
    expect(buildRouteFromNavigationState(decisionState)).toBe('decisions/decision/decision-123')
    expect(parseNavigationStateKey(getNavigationStateKey(decisionState))).toEqual(decisionState)

    expect(routes.view.notebook('notebook-456')).toBe('notebooks/notebook/notebook-456')
    expect(buildRouteFromNavigationState(notebookState)).toBe('notebooks/notebook/notebook-456')
    expect(parseNavigationStateKey(getNavigationStateKey(notebookState))).toEqual(notebookState)
  })
})
