import type { SessionFilter } from '../../shared/types'

export interface CollapsedGroupScopeOptions {
  workspaceId?: string
  currentFilter?: SessionFilter
  groupingMode: 'date' | 'status'
}

export interface CollapsedGroupsStorageReadResult {
  groups: Set<string>
  source: 'scoped' | 'legacy-fallback'
}

function normalizeCollapsedGroupKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export function serializeSessionFilterForScope(filter?: SessionFilter): string {
  if (!filter) return 'allSessions'

  switch (filter.kind) {
    case 'state':
      return `state:${encodeURIComponent(filter.stateId)}`
    case 'label':
      return `label:${encodeURIComponent(filter.labelId)}`
    case 'view':
      return `view:${encodeURIComponent(filter.viewId)}`
    default:
      return filter.kind
  }
}

/**
 * Build a deterministic scope suffix for collapsed group persistence.
 * This prevents collapse state from bleeding across workspaces, filters, and grouping modes.
 */
export function buildCollapsedGroupsScopeSuffix({
  workspaceId,
  currentFilter,
  groupingMode,
}: CollapsedGroupScopeOptions): string {
  const workspaceSegment = workspaceId ? encodeURIComponent(workspaceId) : 'global'
  const filterSegment = serializeSessionFilterForScope(currentFilter)
  return `ws=${workspaceSegment}|filter=${filterSegment}|group=${groupingMode}`
}

/**
 * Parse scoped collapsed-group storage with a compatibility fallback to the
 * pre-scope global key. The caller still owns persisting the scoped value after
 * the read so future visits no longer need the legacy path.
 */
export function readCollapsedGroupsStorage(
  scopedRaw: string | null,
  legacyValue: unknown,
): CollapsedGroupsStorageReadResult {
  if (scopedRaw !== null) {
    try {
      return {
        groups: new Set(normalizeCollapsedGroupKeys(JSON.parse(scopedRaw))),
        source: 'scoped',
      }
    } catch {
      return {
        groups: new Set(),
        source: 'scoped',
      }
    }
  }

  return {
    groups: new Set(normalizeCollapsedGroupKeys(legacyValue)),
    source: 'legacy-fallback',
  }
}
