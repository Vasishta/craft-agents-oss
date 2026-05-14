import { describe, expect, it } from 'bun:test'
import { isMatchingWorkspaceResourceChange, toWorkspaceResourceErrorMessage } from '../useWorkspaceResource'

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
})
