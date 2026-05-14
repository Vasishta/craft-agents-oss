import { describe, expect, it } from 'bun:test'
import { migrateStoredViewFilters } from '../view-filters'

describe('migrateStoredViewFilters', () => {
  it('migrates legacy array-based filters into include maps', () => {
    expect(migrateStoredViewFilters({
      allSessions: {
        statuses: ['todo', 'done'],
        labels: ['backend'],
        groupingMode: 'status',
      },
    })).toEqual({
      allSessions: {
        statuses: { todo: 'include', done: 'include' },
        labels: { backend: 'include' },
        groupingMode: 'status',
      },
    })
  })

  it('preserves current map-based filter entries and drops invalid ones', () => {
    expect(migrateStoredViewFilters({
      allSessions: {
        statuses: { todo: 'include' },
        labels: { backend: 'exclude' },
      },
      broken: 'nope',
    })).toEqual({
      allSessions: {
        statuses: { todo: 'include' },
        labels: { backend: 'exclude' },
      },
    })
  })
})
