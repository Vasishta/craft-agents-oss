import { describe, expect, it } from 'bun:test'
import { createNavigateEvent, NAVIGATE_EVENT, readNavigateEventDetail } from '../navigate'

describe('navigate event helpers', () => {
  it('creates a typed event payload that round-trips through the reader', () => {
    const event = createNavigateEvent({
      route: 'library',
      newPanel: true,
      targetLaneId: 'main',
      skipAutoSelect: true,
    })

    expect(event.type).toBe(NAVIGATE_EVENT)
    expect(readNavigateEventDetail(event)).toEqual({
      route: 'library',
      newPanel: true,
      targetLaneId: 'main',
      skipAutoSelect: true,
    })
  })

  it('ignores unrelated events and malformed custom events', () => {
    expect(readNavigateEventDetail(new Event('click'))).toBeNull()
    expect(readNavigateEventDetail(new CustomEvent(NAVIGATE_EVENT, { detail: {} }))).toBeNull()
  })
})
