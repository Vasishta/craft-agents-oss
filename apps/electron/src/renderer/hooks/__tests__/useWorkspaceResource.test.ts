import { describe, expect, it } from 'bun:test'
import { createWorkspaceCrudHooks, isMatchingWorkspaceResourceChange, toWorkspaceResourceErrorMessage } from '../useWorkspaceResource'

describe('useWorkspaceResource helpers', () => {
  it('matches detail refreshes only for the same workspace and resource', () => {
    expect(isMatchingWorkspaceResourceChange('ws-1', 'ws-1', 'item-1', 'item-1')).toBe(true)
    expect(isMatchingWorkspaceResourceChange('ws-2', 'ws-1', 'item-1', 'item-1')).toBe(false)
    expect(isMatchingWorkspaceResourceChange('ws-1', 'ws-1', 'item-2', 'item-1')).toBe(false)
    expect(isMatchingWorkspaceResourceChange('ws-1', 'ws-1', null, 'item-1')).toBe(false)
  })

  it('prefers error messages from thrown Error instances', () => {
    expect(toWorkspaceResourceErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
    expect(toWorkspaceResourceErrorMessage('boom', 'fallback')).toBe('fallback')
  })

  it('builds a consistent CRUD hook bundle from shared resource definitions', () => {
    const hooks = createWorkspaceCrudHooks({
      list: async () => [],
      get: async () => null,
      subscribe: () => undefined,
      getChangedId: () => 'item-1',
      create: async () => null,
      update: async () => null,
      remove: async () => {},
      errors: {
        list: 'list failed',
        document: 'document failed',
      },
    })

    expect(typeof hooks.useListResource).toBe('function')
    expect(typeof hooks.useDocumentResource).toBe('function')
    expect(typeof hooks.useCreateResource).toBe('function')
    expect(typeof hooks.useUpdateResource).toBe('function')
    expect(typeof hooks.useDeleteResource).toBe('function')
  })
})
