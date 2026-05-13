import { describe, expect, it } from 'bun:test'
import {
  buildWorkItemStatusCounts,
  filterWorkItemsByStatus,
  getWorkItemLinkSummary,
  WORK_ITEM_STATUS_ORDER,
} from '../workitem-meta'

describe('workitem-meta', () => {
  it('preseeds every work item status before tallying counts', () => {
    const counts = buildWorkItemStatusCounts([
      { status: 'ready' },
      { status: 'ready' },
      { status: 'blocked' },
    ])

    expect(Object.keys(counts)).toEqual(WORK_ITEM_STATUS_ORDER)
    expect(counts).toEqual({
      backlog: 0,
      ready: 2,
      in_progress: 0,
      in_review: 0,
      blocked: 1,
      done: 0,
    })
  })

  it('filters work items by selected status while preserving all items for the all filter', () => {
    const workItems = [
      { id: '1', status: 'backlog' as const },
      { id: '2', status: 'ready' as const },
      { id: '3', status: 'ready' as const },
    ]

    expect(filterWorkItemsByStatus(workItems, 'all').map((workItem) => workItem.id)).toEqual(['1', '2', '3'])
    expect(filterWorkItemsByStatus(workItems, 'ready').map((workItem) => workItem.id)).toEqual(['2', '3'])
  })

  it('summarizes linked chats, docs, and outputs without requiring linked object hydration', () => {
    expect(getWorkItemLinkSummary({
      linkCounts: { sessionCount: 1, docCount: 2, outputCount: 0 },
    })).toBe('1 chats · 2 docs')

    expect(getWorkItemLinkSummary({
      linkCounts: { sessionCount: 0, docCount: 0, outputCount: 0 },
    })).toBe('No linked objects yet')
  })
})
