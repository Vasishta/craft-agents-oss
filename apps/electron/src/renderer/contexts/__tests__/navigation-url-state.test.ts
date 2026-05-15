import { describe, expect, it } from 'bun:test'
import { buildNavigationUrlSearch, parseNavigationUrlState } from '../navigation-url-state'

describe('buildNavigationUrlSearch', () => {
  it('encodes focused route, multi-panel state, workspace, and sidebar into a single query string', () => {
    const search = buildNavigationUrlSearch({
      workspaceSlug: 'my-workspace',
      panels: [
        { route: 'home', proportion: 0.4 },
        { route: 'projects/project/p1', proportion: 0.6 },
      ],
      focusedIndex: 1,
      rightSidebar: { type: 'files' },
    })

    expect(search).toBe('?ws=my-workspace&route=projects%2Fproject%2Fp1&panels=home%3A0.4000%2Cprojects%2Fproject%2Fp1%3A0.6000&fi=1&sidebar=files')
  })

  it('keeps single-panel state compact', () => {
    const search = buildNavigationUrlSearch({
      workspaceSlug: 'my-workspace',
      panels: [{ route: 'home', proportion: 1 }],
      focusedIndex: 0,
      rightSidebar: undefined,
    })

    expect(search).toBe('?ws=my-workspace&route=home')
  })
})

describe('parseNavigationUrlState', () => {
  it('normalizes routes and rebases missing proportions evenly', () => {
    const params = new URLSearchParams('route=home&panels=allSessions,flagged&fi=1&sidebar=files')
    const parsed = parseNavigationUrlState(params, (route) => route === 'allSessions' ? 'allSessions/session/s1' : route)

    expect(parsed.sidebarParam).toBe('files')
    expect(parsed.focusedIndex).toBe(1)
    expect(parsed.entries).toEqual([
      { route: 'allSessions/session/s1', proportion: 0.5 },
      { route: 'flagged', proportion: 0.5 },
    ])
  })

  it('renormalizes encoded proportions when they do not sum to one', () => {
    const params = new URLSearchParams('panels=home:0.2000,projects:0.2000')
    const parsed = parseNavigationUrlState(params, (route) => route)

    expect(parsed.entries).toEqual([
      { route: 'home', proportion: 0.5 },
      { route: 'projects', proportion: 0.5 },
    ])
  })
})
