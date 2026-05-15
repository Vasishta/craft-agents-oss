import { buildRightSidebarParam } from '../../shared/route-parser'
import type { ViewRoute } from '../../shared/routes'
import type { RightSidebarPanel } from '../../shared/types'

export interface NavigationUrlPanelEntry {
  route: ViewRoute
  proportion: number
}

export interface BuildNavigationUrlSearchInput {
  workspaceSlug: string | null
  panels: NavigationUrlPanelEntry[]
  focusedIndex: number
  rightSidebar: RightSidebarPanel | undefined
}

export interface ParsedNavigationUrlState {
  route: string | null
  sidebarParam?: string
  entries: NavigationUrlPanelEntry[]
  focusedIndex: number
}

export function encodePanelEntries(entries: NavigationUrlPanelEntry[]): string | null {
  if (entries.length <= 1) return null
  return entries.map((entry) => `${entry.route}:${entry.proportion.toFixed(4)}`).join(',')
}

export function buildNavigationUrlSearch({
  workspaceSlug,
  panels,
  focusedIndex,
  rightSidebar,
}: BuildNavigationUrlSearchInput): string {
  if (panels.length === 0) return ''

  const params = new URLSearchParams()
  const focusedPanel = panels[focusedIndex] ?? panels[0]

  if (workspaceSlug) {
    params.set('ws', workspaceSlug)
  }

  params.set('route', focusedPanel.route)

  const panelsParam = encodePanelEntries(panels)
  if (panelsParam) {
    params.set('panels', panelsParam)
    params.set('fi', String(focusedIndex))
  }

  const sidebarParam = buildRightSidebarParam(rightSidebar)
  if (sidebarParam) {
    params.set('sidebar', sidebarParam)
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export function parsePanelsParam(
  panelsParam: string,
  normalizeRoute: (route: ViewRoute) => ViewRoute,
): NavigationUrlPanelEntry[] {
  const entries = panelsParam
    .split(',')
    .filter(Boolean)
    .map((entry) => {
      const colonIdx = entry.lastIndexOf(':')
      if (colonIdx > 0) {
        const proportion = parseFloat(entry.slice(colonIdx + 1))
        if (!Number.isNaN(proportion) && proportion > 0 && proportion < 1) {
          return {
            route: normalizeRoute(entry.slice(0, colonIdx) as ViewRoute),
            proportion,
          }
        }
      }

      return {
        route: normalizeRoute(entry as ViewRoute),
        proportion: 0,
      }
    })

  const hasProportions = entries.some((entry) => entry.proportion > 0)
  if (!hasProportions && entries.length > 0) {
    const equal = 1 / entries.length
    return entries.map((entry) => ({ ...entry, proportion: equal }))
  }

  const total = entries.reduce((sum, entry) => sum + entry.proportion, 0)
  if (total > 0 && Math.abs(total - 1) > 0.001) {
    return entries.map((entry) => ({ ...entry, proportion: entry.proportion / total }))
  }

  return entries
}

export function parseNavigationUrlState(
  params: URLSearchParams,
  normalizeRoute: (route: ViewRoute) => ViewRoute,
): ParsedNavigationUrlState {
  const route = params.get('route')
  const sidebarParam = params.get('sidebar') || undefined
  const panelsParam = params.get('panels')
  const focusedIndexParam = params.get('fi')

  if (!panelsParam) {
    return {
      route,
      sidebarParam,
      entries: [],
      focusedIndex: 0,
    }
  }

  return {
    route,
    sidebarParam,
    entries: parsePanelsParam(panelsParam, normalizeRoute),
    focusedIndex: focusedIndexParam != null ? (parseInt(focusedIndexParam, 10) || 0) : 0,
  }
}
