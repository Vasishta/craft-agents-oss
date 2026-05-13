import { describe, expect, it } from 'bun:test'
import type { LabelTreeNode } from '@craft-agent/shared/labels'
import { buildSidebarFocusItemIds } from '../sidebar-focus-order'

function makeLabelNode(fullId: string, children: LabelTreeNode[] = []): LabelTreeNode {
  return {
    id: fullId,
    fullId,
    depth: 0,
    segment: fullId,
    label: {
      id: fullId,
      name: fullId,
      color: '#888888',
      children: [],
    },
    children,
  } as unknown as LabelTreeNode
}

describe('buildSidebarFocusItemIds', () => {
  it('excludes collapsed library and work queue children from focus order', () => {
    const ids = buildSidebarFocusItemIds({
      projectIds: ['p1'],
      pageIds: ['page-1'],
      outputIds: ['output-1'],
      statusIds: ['todo'],
      labelTree: [makeLabelNode('priority')],
      isExpanded: () => false,
    })

    expect(ids).toContain('nav:library')
    expect(ids).toContain('nav:workQueue')
    expect(ids).not.toContain('nav:pages')
    expect(ids).not.toContain('nav:outputs')
    expect(ids).not.toContain('nav:allSessions')
    expect(ids).not.toContain('nav:state:todo')
    expect(ids).not.toContain('nav:label:priority')
  })

  it('includes only the visible expanded descendants in focus order', () => {
    const expanded = new Set(['nav:projects', 'nav:library', 'nav:pages', 'nav:workQueue', 'nav:labels'])

    const ids = buildSidebarFocusItemIds({
      projectIds: ['p1'],
      pageIds: ['page-1'],
      outputIds: ['output-1'],
      statusIds: ['todo', 'done'],
      labelTree: [makeLabelNode('priority')],
      isExpanded: (id) => expanded.has(id),
    })

    expect(ids).toEqual([
      'nav:home',
      'nav:search',
      'nav:projects',
      'nav:project:p1',
      'nav:library',
      'nav:pages',
      'nav:page:page-1',
      'nav:outputs',
      'nav:workQueue',
      'nav:allSessions',
      'nav:state:todo',
      'nav:state:done',
      'nav:flagged',
      'nav:archived',
      'nav:labels',
      'nav:label:priority',
      'nav:sources',
      'nav:automations',
      'nav:skills',
      'nav:settings',
      'nav:whats-new',
    ])
  })
})
