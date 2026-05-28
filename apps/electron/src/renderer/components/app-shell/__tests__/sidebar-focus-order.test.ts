import { describe, expect, it } from 'bun:test'
import type { SidebarItem } from '../LeftSidebar'
import { flattenVisibleSidebarFocusableItems } from '../sidebar-focus-order'

describe('flattenVisibleSidebarFocusableItems', () => {
  it('excludes collapsed descendants from focus order', () => {
    const links: SidebarItem[] = [
      { id: 'nav:library', title: 'Library', icon: 'L', variant: 'ghost', expanded: false, expandable: true, items: [
        { id: 'nav:pages', title: 'Pages', icon: 'P', variant: 'ghost', onClick: () => undefined },
      ] },
      { id: 'nav:workQueue', title: 'Work Queue', icon: 'W', variant: 'ghost', expanded: false, expandable: true, items: [
        { id: 'nav:allSessions', title: 'All Sessions', icon: 'A', variant: 'ghost', onClick: () => undefined },
      ] },
    ]

    expect(flattenVisibleSidebarFocusableItems(links).map((item) => item.id)).toEqual([
      'nav:library',
      'nav:workQueue',
    ])
  })

  it('includes only the visible expanded descendants in focus order', () => {
    const links: SidebarItem[] = [
      {
        id: 'nav:projects',
        title: 'Projects',
        icon: 'P',
        variant: 'ghost',
        expanded: true,
        expandable: true,
        items: [
          { id: 'nav:project:p1', title: 'Project 1', icon: 'P1', variant: 'ghost', onClick: () => undefined },
        ],
      },
      {
        id: 'nav:library',
        title: 'Library',
        icon: 'L',
        variant: 'ghost',
        expanded: true,
        expandable: true,
        items: [
          {
            id: 'nav:pages',
            title: 'Pages',
            icon: 'Pg',
            variant: 'ghost',
            onClick: () => undefined,
          },
          { id: 'nav:outputs', title: 'Outputs', icon: 'O', variant: 'ghost', onClick: () => undefined },
          { id: 'nav:decisions', title: 'Decisions', icon: 'D', variant: 'ghost', onClick: () => undefined },
          { id: 'nav:notebooks', title: 'Notebooks', icon: 'N', variant: 'ghost', onClick: () => undefined },
        ],
      },
      {
        id: 'nav:workQueue',
        title: 'Work Queue',
        icon: 'W',
        variant: 'ghost',
        expanded: true,
        expandable: true,
        items: [
          { id: 'nav:workItems', title: 'Work Items', icon: 'WI', variant: 'ghost', onClick: () => undefined },
          { id: 'separator:queue-session-views', type: 'separator' },
          {
            id: 'nav:sessionViews',
            title: 'Session Views',
            icon: 'LS',
            variant: 'ghost',
            expanded: true,
            expandable: true,
            items: [
              { id: 'nav:allSessions', title: 'All Sessions', icon: 'A', variant: 'ghost', onClick: () => undefined },
              { id: 'separator:states', type: 'separator' },
              { id: 'nav:flagged', title: 'Flagged', icon: 'F', variant: 'ghost', onClick: () => undefined },
            ],
          },
        ],
      },
    ]

    expect(flattenVisibleSidebarFocusableItems(links).map((item) => item.id)).toEqual([
      'nav:projects',
      'nav:project:p1',
      'nav:library',
      'nav:pages',
      'nav:outputs',
      'nav:decisions',
      'nav:notebooks',
      'nav:workQueue',
      'nav:workItems',
      'nav:sessionViews',
      'nav:allSessions',
      'nav:flagged',
    ])
  })
})
