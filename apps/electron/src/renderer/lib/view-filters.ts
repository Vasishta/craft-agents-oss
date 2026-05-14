export type ViewFilterMode = 'include' | 'exclude'
export type ViewFilterEntry = Record<string, ViewFilterMode>
export type ViewFilterGroupingMode = 'date' | 'status'
export type ViewFiltersMap = Record<string, {
  statuses: ViewFilterEntry
  labels: ViewFilterEntry
  groupingMode?: ViewFilterGroupingMode
}>

type LegacyViewFilterEntry = {
  statuses?: unknown
  labels?: unknown
  groupingMode?: unknown
}

function isLegacyViewFilterEntry(value: unknown): value is LegacyViewFilterEntry {
  return typeof value === 'object' && value !== null
}

function toFilterEntry(value: unknown): ViewFilterEntry {
  if (!Array.isArray(value)) return {}
  const entry: ViewFilterEntry = {}
  for (const id of value) {
    if (typeof id === 'string' && id.length > 0) {
      entry[id] = 'include'
    }
  }
  return entry
}

export function migrateStoredViewFilters(saved: unknown): ViewFiltersMap {
  if (typeof saved !== 'object' || saved === null) return {}

  const migrated: ViewFiltersMap = {}

  for (const [key, rawEntry] of Object.entries(saved)) {
    if (!isLegacyViewFilterEntry(rawEntry)) continue

    if (Array.isArray(rawEntry.statuses)) {
      migrated[key] = {
        statuses: toFilterEntry(rawEntry.statuses),
        labels: toFilterEntry(rawEntry.labels),
      }
      if (rawEntry.groupingMode === 'date' || rawEntry.groupingMode === 'status') {
        migrated[key].groupingMode = rawEntry.groupingMode
      }
      continue
    }

    if (
      typeof rawEntry.statuses === 'object' &&
      rawEntry.statuses !== null &&
      typeof rawEntry.labels === 'object' &&
      rawEntry.labels !== null
    ) {
      migrated[key] = rawEntry as ViewFiltersMap[string]
    }
  }

  return migrated
}
