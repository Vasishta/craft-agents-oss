import { describe, expect, it } from 'bun:test'
import { getSidebarSubtreeId } from '../sidebar-a11y'

describe('getSidebarSubtreeId', () => {
  it('produces stable region ids for expandable sidebar groups', () => {
    expect(getSidebarSubtreeId('nav:library')).toBe('nav:library-subtree')
    expect(getSidebarSubtreeId('nav:workQueue')).toBe('nav:workQueue-subtree')
  })
})
