import { describe, it, expect } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'

describe('projects route parsing', () => {
  it('parses projects as a view route', () => {
    expect(parseRoute('projects')).toEqual({
      type: 'view',
      name: 'projects',
      params: {},
    })
  })

  it('parses project detail routes', () => {
    expect(parseRoute('projects/project/project_abc-123')).toEqual({
      type: 'view',
      name: 'project',
      id: 'project_abc-123',
      params: {},
    })

    expect(parseRouteToNavigationState('projects/project/project_abc-123')).toEqual({
      navigator: 'projects',
      details: { type: 'project', projectId: 'project_abc-123' },
    })
  })

  it('builds projects routes from helpers and navigation state', () => {
    expect(routes.view.projects()).toBe('projects')
    expect(routes.view.project('project_abc-123')).toBe('projects/project/project_abc-123')

    expect(buildCompoundRoute(parseCompoundRoute('projects')!)).toBe('projects')
    expect(buildRouteFromNavigationState({
      navigator: 'projects',
      details: null,
    })).toBe('projects')
    expect(buildRouteFromNavigationState({
      navigator: 'projects',
      details: { type: 'project', projectId: 'project_abc-123' },
    })).toBe('projects/project/project_abc-123')
  })

  it('rejects unsafe project ids', () => {
    expect(parseRoute('projects/project/../bad')).toBeNull()
    expect(parseRouteToNavigationState('projects/project/bad%2Fid')).toBeNull()
    expect(parseRoute('projects/project/project_abc/extra')).toBeNull()
    expect(parseRouteToNavigationState('projects/project/%2E%2E')).toBeNull()
  })
})
