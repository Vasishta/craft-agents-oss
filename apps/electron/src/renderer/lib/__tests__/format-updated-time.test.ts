import { describe, expect, it } from 'bun:test'
import { formatUpdatedTime } from '../format-updated-time'

describe('formatUpdatedTime', () => {
  const now = new Date('2026-05-14T10:00:00.000Z').getTime()

  it('returns a friendly empty-state label when no timestamp exists', () => {
    expect(formatUpdatedTime(undefined, now)).toBe('No recent activity')
  })

  it('formats very recent timestamps as just now', () => {
    expect(formatUpdatedTime(now - 20_000, now)).toBe('just now')
  })

  it('falls back to calendar dates for older timestamps', () => {
    expect(formatUpdatedTime(new Date('2026-04-20T10:00:00.000Z').getTime(), now)).toBe('Apr 20')
  })
})
