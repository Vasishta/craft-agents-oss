import type { WorkItemDocument, WorkItemIndexEntry, WorkItemStatus } from '../../shared/types'

export const WORK_ITEM_STATUS_ORDER: WorkItemStatus[] = [
  'backlog',
  'ready',
  'in_progress',
  'in_review',
  'blocked',
  'done',
]

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
}

export type WorkItemFilter = 'all' | WorkItemStatus

export function buildWorkItemStatusCounts(
  workItems: Iterable<Pick<WorkItemIndexEntry, 'status'> | Pick<WorkItemDocument, 'status'>>
): Record<WorkItemStatus, number> {
  const counts = Object.fromEntries(
    WORK_ITEM_STATUS_ORDER.map((status) => [status, 0])
  ) as Record<WorkItemStatus, number>

  for (const workItem of workItems) {
    counts[workItem.status] += 1
  }

  return counts
}

export function filterWorkItemsByStatus<T extends Pick<WorkItemIndexEntry, 'status'>>(
  workItems: T[],
  status: WorkItemFilter
): T[] {
  if (status === 'all') return workItems
  return workItems.filter((workItem) => workItem.status === status)
}

export function getWorkItemLinkSummary(
  workItem: Pick<WorkItemIndexEntry, 'linkCounts'> | Pick<WorkItemDocument, 'linkedSessionIds' | 'linkedDocIds' | 'linkedOutputIds'>
): string {
  if ('linkCounts' in workItem) {
    const parts = [
      workItem.linkCounts.sessionCount > 0 ? `${workItem.linkCounts.sessionCount} chats` : null,
      workItem.linkCounts.docCount > 0 ? `${workItem.linkCounts.docCount} docs` : null,
      workItem.linkCounts.outputCount > 0 ? `${workItem.linkCounts.outputCount} outputs` : null,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' · ') : 'No linked objects yet'
  }

  const parts = [
    workItem.linkedSessionIds.length > 0 ? `${workItem.linkedSessionIds.length} chats` : null,
    workItem.linkedDocIds.length > 0 ? `${workItem.linkedDocIds.length} docs` : null,
    workItem.linkedOutputIds.length > 0 ? `${workItem.linkedOutputIds.length} outputs` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : 'No linked objects yet'
}
