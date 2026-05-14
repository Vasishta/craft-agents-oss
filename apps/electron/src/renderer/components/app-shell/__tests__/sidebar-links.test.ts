import { describe, expect, it } from 'bun:test'
import type { LabelTreeNode } from '@craft-agent/shared/labels'
import type { AutomationFilter, NavigationState, SessionFilter } from '../../../../shared/types'
import { buildAppSidebarLinks } from '../sidebar-links'

function t(key: string, fallbackOrOptions?: string | Record<string, unknown>) {
  if (typeof fallbackOrOptions === 'string') return fallbackOrOptions
  return key
}

function makeLabelNode(fullId: string): LabelTreeNode {
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
    children: [],
  } as unknown as LabelTreeNode
}

function buildLinks({
  navState = { navigator: 'library', details: null } as NavigationState,
  sessionFilter = null as SessionFilter | null,
  automationFilter,
}: {
  navState?: NavigationState
  sessionFilter?: SessionFilter | null
  automationFilter?: AutomationFilter
} = {}) {
  return buildAppSidebarLinks({
    t: t as never,
    navState,
    sessionFilter,
    sourceFilter: undefined,
    automationFilter,
    projects: [{ id: 'project-1', name: 'Project One' }],
    pages: [{ id: 'page-1', title: 'Doc One' }],
    outputs: [{ id: 'output-1', title: 'Output One' }],
    decisions: [{ id: 'decision-1', title: 'Decision One' }],
    notebooks: [{ id: 'notebook-1', title: 'Notebook One' }],
    workItemsCount: 4,
    workspaceSessionCount: 3,
    effectiveSessionStatuses: [{
      id: 'todo',
      label: 'Todo',
      icon: 'T' as never,
      resolvedColor: 'currentColor',
      iconColorable: false,
    }],
    sessionStatusCounts: { todo: 2 },
    flaggedCount: 1,
    archivedCount: 0,
    labelTree: [makeLabelNode('priority')],
    labelCounts: { priority: 4 },
    sourcesCount: 5,
    sourceTypeCounts: { api: 2, mcp: 1, local: 2 },
    automationsCount: 4,
    automationTypeCounts: { scheduled: 1, event: 2, agentic: 1 },
    skillsCount: 6,
    hasUnseenReleaseNotes: false,
    activeWorkspaceHasId: true,
    renderLabelIcon: () => 'L',
    renderLabelValueTypeBadge: () => '#',
    isExpanded: (id) => new Set(['nav:projects', 'nav:library', 'nav:workQueue', 'nav:legacySessions', 'nav:labels', 'nav:sources', 'nav:automations']).has(id),
    toggleExpanded: () => undefined,
    onHomeClick: () => undefined,
    onSearchClick: () => undefined,
    onProjectsClick: () => undefined,
    onProjectClick: () => undefined,
    onLibraryClick: () => undefined,
    onPagesClick: () => undefined,
    onOutputsClick: () => undefined,
    onDecisionsClick: () => undefined,
    onNotebooksClick: () => undefined,
    onWorkQueueClick: () => undefined,
    onMarkAllSessionsRead: () => undefined,
    onConfigureStatuses: () => undefined,
    onAllSessionsClick: () => undefined,
    onSessionStatusClick: () => undefined,
    onFlaggedClick: () => undefined,
    onArchivedClick: () => undefined,
    onLabelsRootClick: () => undefined,
    onLabelClick: () => undefined,
    onConfigureLabels: () => undefined,
    onAddLabel: () => undefined,
    onDeleteLabel: () => undefined,
    onStatusReorder: () => undefined,
    onSourcesClick: () => undefined,
    onSourcesApiClick: () => undefined,
    onSourcesMcpClick: () => undefined,
    onSourcesLocalClick: () => undefined,
    onAddSource: () => undefined,
    onAutomationsClick: () => undefined,
    onAutomationsScheduledClick: () => undefined,
    onAutomationsEventClick: () => undefined,
    onAutomationsAgenticClick: () => undefined,
    onAddAutomation: () => undefined,
    onSkillsClick: () => undefined,
    onAddSkill: () => undefined,
    onSettingsClick: () => undefined,
    onWhatsNewClick: () => undefined,
  })
}

describe('buildAppSidebarLinks', () => {
  it('builds nested Library and Work Queue sections from the shared view model', () => {
    const links = buildLinks()

    const library = links.find((item) => 'title' in item && item.id === 'nav:library')
    const workQueue = links.find((item) => 'title' in item && item.id === 'nav:workQueue')
    const legacySessions = workQueue && 'items' in workQueue
      ? workQueue.items?.find((item) => 'title' in item && item.id === 'nav:legacySessions')
      : null

    expect(library && 'items' in library ? library.items?.map((item) => item.id) : []).toEqual([
      'nav:pages',
      'nav:outputs',
      'nav:decisions',
      'nav:notebooks',
    ])
    expect(workQueue && 'items' in workQueue ? workQueue.items?.map((item) => item.id) : []).toEqual([
      'nav:workItems',
      'separator:queue-legacy',
      'nav:legacySessions',
    ])
    expect(legacySessions && 'items' in legacySessions ? legacySessions.items?.map((item) => item.id) : []).toEqual([
      'nav:allSessions',
      'nav:state:todo',
      'separator:states-flagged',
      'nav:flagged',
      'nav:archived',
      'separator:queue-labels',
      'nav:labels',
    ])
  })

  it('derives active variants from navigation state and filter state', () => {
    const links = buildLinks({
      navState: { navigator: 'workQueue', details: null },
      sessionFilter: { kind: 'state', stateId: 'todo' },
    })

    const workQueue = links.find((item) => 'title' in item && item.id === 'nav:workQueue')
    const legacySessions = workQueue && 'items' in workQueue
      ? workQueue.items?.find((item) => 'title' in item && item.id === 'nav:legacySessions')
      : null
    const statusItem = legacySessions && 'items' in legacySessions
      ? legacySessions.items?.find((item) => 'title' in item && item.id === 'nav:state:todo')
      : null

    expect(workQueue && 'variant' in workQueue ? workQueue.variant : null).toBe('default')
    expect(statusItem && 'variant' in statusItem ? statusItem.variant : null).toBe('default')
  })
})
