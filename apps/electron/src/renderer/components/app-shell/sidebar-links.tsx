import * as React from 'react'
import type { TFunction } from 'i18next'
import {
  Archive,
  Bot,
  BookOpen,
  Box,
  BriefcaseBusiness,
  Cake,
  Clock,
  DatabaseZap,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  GitBranch,
  House,
  Inbox,
  ListTodo,
  Radio,
  Search,
  Settings,
  Tag,
  Zap,
} from 'lucide-react'
import { McpIcon } from '../icons/McpIcon'
import type { LabelConfig, LabelTreeNode } from '@craft-agent/shared/labels'
import type {
  AutomationFilter,
  NavigationState,
  SessionFilter,
  SourceFilter,
} from '../../../shared/types'
import {
  isAutomationsNavigation,
  isHomeNavigation,
  isLibraryNavigation,
  isDecisionsNavigation,
  isNotebooksNavigation,
  isOutputsNavigation,
  isPageCanvasNavigation,
  isProjectsNavigation,
  isSearchNavigation,
  isSessionsNavigation,
  isSettingsNavigation,
  isSkillsNavigation,
  isSourcesNavigation,
  isWorkQueueNavigation,
} from '../../../shared/types'
import type { SessionStatus } from '@/config/session-status-config'
import type { SidebarItem } from './LeftSidebar'

type LabelValueType = NonNullable<LabelConfig['valueType']>

interface ProjectNavItem {
  id: string
  name?: string
}

interface PageNavItem {
  id: string
  title?: string
}

interface OutputNavItem {
  id: string
  title?: string
}

interface DecisionNavItem {
  id: string
  title?: string
}

interface NotebookNavItem {
  id: string
  title?: string
}

interface SidebarLinksParams {
  t: TFunction
  navState: NavigationState
  sessionFilter: SessionFilter | null
  sourceFilter?: SourceFilter
  automationFilter?: AutomationFilter
  projects: ProjectNavItem[]
  pages: PageNavItem[]
  outputs: OutputNavItem[]
  decisions: DecisionNavItem[]
  notebooks: NotebookNavItem[]
  workItemsCount: number
  workspaceSessionCount: number
  effectiveSessionStatuses: SessionStatus[]
  sessionStatusCounts: Record<string, number>
  flaggedCount: number
  archivedCount: number
  labelTree: LabelTreeNode[]
  labelCounts: Record<string, number>
  sourcesCount: number
  sourceTypeCounts: { api: number; mcp: number; local: number }
  automationsCount: number
  automationTypeCounts: { scheduled: number; event: number; agentic: number }
  skillsCount: number
  hasUnseenReleaseNotes: boolean
  activeWorkspaceHasId: boolean
  renderLabelIcon?: (label: LabelConfig, hasChildren: boolean) => React.ReactNode
  renderLabelValueTypeBadge?: (valueType: LabelValueType) => React.ReactNode
  isExpanded: (id: string) => boolean
  toggleExpanded: (id: string) => void
  onHomeClick: () => void
  onSearchClick: () => void
  onProjectsClick: () => void
  onProjectClick: (id: string) => void
  onLibraryClick: () => void
  onPagesClick: () => void
  onOutputsClick: () => void
  onDecisionsClick: () => void
  onNotebooksClick: () => void
  onWorkQueueClick: () => void
  onMarkAllSessionsRead?: () => void
  onConfigureStatuses?: () => void
  onAllSessionsClick: () => void
  onSessionStatusClick: (id: string) => void
  onFlaggedClick: () => void
  onArchivedClick: () => void
  onLabelsRootClick: () => void
  onLabelClick: (id: string) => void
  onConfigureLabels?: (labelId?: string) => void
  onAddLabel?: (parentId?: string) => void
  onDeleteLabel?: (labelId: string) => void
  onStatusReorder: (orderedIds: string[]) => void
  onSourcesClick: () => void
  onSourcesApiClick: () => void
  onSourcesMcpClick: () => void
  onSourcesLocalClick: () => void
  onAddSource: (sourceType?: 'api' | 'mcp' | 'local') => void
  onAutomationsClick: () => void
  onAutomationsScheduledClick: () => void
  onAutomationsEventClick: () => void
  onAutomationsAgenticClick: () => void
  onAddAutomation: () => void
  onSkillsClick: () => void
  onAddSkill: () => void
  onSettingsClick: () => void
  onWhatsNewClick: () => void
}

function buildLabelSidebarLinks({
  nodes,
  t,
  sessionFilter,
  labelCounts,
  activeWorkspaceHasId,
  renderLabelIcon,
  renderLabelValueTypeBadge,
  isExpanded,
  toggleExpanded,
  onLabelClick,
  onConfigureLabels,
  onAddLabel,
  onDeleteLabel,
}: {
  nodes: LabelTreeNode[]
  t: TFunction
  sessionFilter: SessionFilter | null
  labelCounts: Record<string, number>
  activeWorkspaceHasId: boolean
  renderLabelIcon?: (label: LabelConfig, hasChildren: boolean) => React.ReactNode
  renderLabelValueTypeBadge?: (valueType: LabelValueType) => React.ReactNode
  isExpanded: (id: string) => boolean
  toggleExpanded: (id: string) => void
  onLabelClick: (id: string) => void
  onConfigureLabels?: (labelId?: string) => void
  onAddLabel?: (parentId?: string) => void
  onDeleteLabel?: (labelId: string) => void
}): SidebarItem[] {
  return nodes.map((node) => {
    const hasChildren = node.children.length > 0
    const isActive = sessionFilter?.kind === 'label' && sessionFilter.labelId === node.fullId
    const count = labelCounts[node.fullId] || 0

    const item: SidebarItem = {
      id: `nav:label:${node.fullId}`,
      title: node.label?.name || node.segment.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
      label: count > 0 ? String(count) : undefined,
      afterTitle: node.label?.valueType ? (
        <span
          className="flex items-center"
          title={t('sidebar.labelValueTypeTooltip', { valueType: t(`sidebar.labelValueType.${node.label.valueType}`) })}
        >
          {renderLabelValueTypeBadge?.(node.label.valueType)}
        </span>
      ) : undefined,
      icon: node.label && activeWorkspaceHasId ? (
        renderLabelIcon?.(node.label, hasChildren)
      ) : <Tag className="h-3.5 w-3.5" />,
      variant: isActive ? 'default' : 'ghost',
      compact: true,
      onClick: () => onLabelClick(node.fullId),
      contextMenu: {
        type: 'labels',
        labelId: node.fullId,
        onConfigureLabels,
        onAddLabel,
        onDeleteLabel,
      },
    }

    if (hasChildren) {
      item.expandable = true
      item.expanded = isExpanded(`nav:label:${node.fullId}`)
      item.onToggle = () => toggleExpanded(`nav:label:${node.fullId}`)
      item.items = buildLabelSidebarLinks({
        nodes: node.children,
        t,
        sessionFilter,
        labelCounts,
        activeWorkspaceHasId,
        renderLabelIcon,
        renderLabelValueTypeBadge,
        isExpanded,
        toggleExpanded,
        onLabelClick,
        onConfigureLabels,
        onAddLabel,
        onDeleteLabel,
      })
    }

    return item
  })
}

export function buildAppSidebarLinks(params: SidebarLinksParams): SidebarItem[] {
  const {
    t,
    navState,
    sessionFilter,
    sourceFilter,
    automationFilter,
    projects,
    pages,
    outputs,
    decisions,
    notebooks,
    workItemsCount,
    workspaceSessionCount,
    effectiveSessionStatuses,
    sessionStatusCounts,
    flaggedCount,
    archivedCount,
    labelTree,
    labelCounts,
    sourcesCount,
    sourceTypeCounts,
    automationsCount,
    automationTypeCounts,
    skillsCount,
    hasUnseenReleaseNotes,
    activeWorkspaceHasId,
    renderLabelIcon,
    renderLabelValueTypeBadge,
    isExpanded,
    toggleExpanded,
    onHomeClick,
    onSearchClick,
    onProjectsClick,
    onProjectClick,
    onLibraryClick,
    onPagesClick,
    onOutputsClick,
    onDecisionsClick,
    onNotebooksClick,
    onWorkQueueClick,
    onMarkAllSessionsRead,
    onConfigureStatuses,
    onAllSessionsClick,
    onSessionStatusClick,
    onFlaggedClick,
    onArchivedClick,
    onLabelsRootClick,
    onLabelClick,
    onConfigureLabels,
    onAddLabel,
    onDeleteLabel,
    onStatusReorder,
    onSourcesClick,
    onSourcesApiClick,
    onSourcesMcpClick,
    onSourcesLocalClick,
    onAddSource,
    onAutomationsClick,
    onAutomationsScheduledClick,
    onAutomationsEventClick,
    onAutomationsAgenticClick,
    onAddAutomation,
    onSkillsClick,
    onAddSkill,
    onSettingsClick,
    onWhatsNewClick,
  } = params

  return [
    {
      id: 'nav:home',
      title: t('sidebar.home'),
      icon: House,
      variant: isHomeNavigation(navState) ? 'default' : 'ghost',
      onClick: onHomeClick,
    },
    {
      id: 'nav:search',
      title: t('sidebar.search'),
      icon: Search,
      variant: isSearchNavigation(navState) ? 'default' : 'ghost',
      onClick: onSearchClick,
    },
    {
      id: 'nav:projects',
      title: t('sidebar.projects', 'Projects'),
      label: String(projects.length),
      icon: BriefcaseBusiness,
      variant: isProjectsNavigation(navState) ? 'default' : 'ghost',
      onClick: onProjectsClick,
      expandable: projects.length > 0,
      expanded: isExpanded('nav:projects'),
      onToggle: () => toggleExpanded('nav:projects'),
      items: projects.slice(0, 10).map((project) => ({
        id: `nav:project:${project.id}`,
        title: project.name || 'Untitled Project',
        icon: BriefcaseBusiness,
        variant: isProjectsNavigation(navState) && navState.details?.type === 'project' && navState.details.projectId === project.id ? 'default' : 'ghost',
        onClick: () => onProjectClick(project.id),
      })),
    },
    {
      id: 'nav:library',
      title: t('sidebar.library', 'Library'),
      label: String(pages.length + outputs.length + decisions.length + notebooks.length),
      icon: BookOpen,
      variant: (isLibraryNavigation(navState) || isPageCanvasNavigation(navState) || isOutputsNavigation(navState) || isDecisionsNavigation(navState) || isNotebooksNavigation(navState)) ? 'default' : 'ghost',
      onClick: onLibraryClick,
      expandable: true,
      expanded: isExpanded('nav:library'),
      onToggle: () => toggleExpanded('nav:library'),
      items: [
        {
          id: 'nav:pages',
          title: t('sidebar.pages'),
          label: String(pages.length),
          icon: FileText,
          variant: isPageCanvasNavigation(navState) ? 'default' : 'ghost',
          onClick: onPagesClick,
        },
        {
          id: 'nav:outputs',
          title: t('sidebar.outputs'),
          label: String(outputs.length),
          icon: Box,
          variant: isOutputsNavigation(navState) ? 'default' : 'ghost',
          onClick: onOutputsClick,
        },
        {
          id: 'nav:decisions',
          title: 'Decisions',
          label: String(decisions.length),
          icon: GitBranch,
          variant: isDecisionsNavigation(navState) ? 'default' : 'ghost',
          onClick: onDecisionsClick,
        },
        {
          id: 'nav:notebooks',
          title: 'Notebooks',
          label: String(notebooks.length),
          icon: BookOpen,
          variant: isNotebooksNavigation(navState) ? 'default' : 'ghost',
          onClick: onNotebooksClick,
        },
      ],
    },
    {
      id: 'nav:workQueue',
      title: t('sidebar.workQueue', 'Work Queue'),
      label: String(workItemsCount),
      icon: ListTodo,
      variant: (isWorkQueueNavigation(navState) || isSessionsNavigation(navState)) ? 'default' : 'ghost',
      onClick: onWorkQueueClick,
      expandable: true,
      expanded: isExpanded('nav:workQueue'),
      onToggle: () => toggleExpanded('nav:workQueue'),
      contextMenu: {
        type: 'allSessions',
        onConfigureStatuses,
        onMarkAllRead: onMarkAllSessionsRead,
      },
      items: [
        {
          id: 'nav:workItems',
          title: 'Work Items',
          label: String(workItemsCount),
          icon: ListTodo,
          variant: isWorkQueueNavigation(navState) ? 'default' : 'ghost',
          onClick: onWorkQueueClick,
        },
        { id: 'separator:queue-legacy', type: 'separator' as const },
        {
          id: 'nav:legacySessions',
          title: 'Legacy Sessions',
          label: String(workspaceSessionCount),
          icon: Inbox,
          variant: isSessionsNavigation(navState) ? 'default' : 'ghost',
          onClick: onAllSessionsClick,
          expandable: true,
          expanded: isExpanded('nav:legacySessions'),
          onToggle: () => toggleExpanded('nav:legacySessions'),
          items: [
            {
              id: 'nav:allSessions',
              title: t('sidebar.allSessions'),
              label: String(workspaceSessionCount),
              icon: Inbox,
              variant: sessionFilter?.kind === 'allSessions' ? 'default' : 'ghost',
              onClick: onAllSessionsClick,
            },
            ...effectiveSessionStatuses.map((state) => ({
              id: `nav:state:${state.id}`,
              title: t(`status.${state.id}`, state.label),
              label: String(sessionStatusCounts[state.id] || 0),
              icon: state.icon,
              iconColor: state.resolvedColor,
              iconColorable: state.iconColorable,
              variant: (sessionFilter?.kind === 'state' && sessionFilter.stateId === state.id ? 'default' : 'ghost') as 'default' | 'ghost',
              onClick: () => onSessionStatusClick(state.id),
              contextMenu: {
                type: 'status' as const,
                statusId: state.id,
                onConfigureStatuses,
              },
            })),
            { id: 'separator:states-flagged', type: 'separator' as const },
            {
              id: 'nav:flagged',
              title: t('sidebar.flagged'),
              label: String(flaggedCount),
              icon: <Flag className="h-3.5 w-3.5" />,
              variant: (sessionFilter?.kind === 'flagged' ? 'default' : 'ghost') as 'default' | 'ghost',
              onClick: onFlaggedClick,
            },
            {
              id: 'nav:archived',
              title: t('sidebar.archived'),
              label: archivedCount > 0 ? String(archivedCount) : undefined,
              icon: Archive,
              variant: (sessionFilter?.kind === 'archived' ? 'default' : 'ghost') as 'default' | 'ghost',
              onClick: onArchivedClick,
            },
            { id: 'separator:queue-labels', type: 'separator' as const },
            {
              id: 'nav:labels',
              title: t('sidebar.labels'),
              icon: Tag,
              variant: (sessionFilter?.kind === 'label' && sessionFilter.labelId === '__all__') ? 'default' : 'ghost',
              onClick: onLabelsRootClick,
              expandable: true,
              expanded: isExpanded('nav:labels'),
              onToggle: () => toggleExpanded('nav:labels'),
              contextMenu: {
                type: 'labels',
                onConfigureLabels,
                onAddLabel,
              },
              items: buildLabelSidebarLinks({
                nodes: labelTree,
                t,
                sessionFilter,
                labelCounts,
                activeWorkspaceHasId,
                renderLabelIcon,
                renderLabelValueTypeBadge,
                isExpanded,
                toggleExpanded,
                onLabelClick,
                onConfigureLabels,
                onAddLabel,
                onDeleteLabel,
              }),
            },
          ],
          sortable: { onReorder: onStatusReorder },
        },
      ],
    },
    { id: 'separator:chats-sources', type: 'separator' },
    {
      id: 'nav:sources',
      title: t('sidebar.filesAndContext', 'Files & Context'),
      label: String(sourcesCount),
      icon: DatabaseZap,
      variant: (isSourcesNavigation(navState) && !sourceFilter) ? 'default' : 'ghost',
      onClick: onSourcesClick,
      dataTutorial: 'sources-nav',
      expandable: true,
      expanded: isExpanded('nav:sources'),
      onToggle: () => toggleExpanded('nav:sources'),
      contextMenu: {
        type: 'sources',
        onAddSource: () => onAddSource(),
      },
      items: [
        {
          id: 'nav:sources:api',
          title: t('sidebar.apis'),
          label: String(sourceTypeCounts.api),
          icon: Globe,
          variant: sourceFilter?.kind === 'type' && sourceFilter.sourceType === 'api' ? 'default' : 'ghost',
          onClick: onSourcesApiClick,
          contextMenu: {
            type: 'sources',
            onAddSource: () => onAddSource('api'),
            sourceType: 'api',
          },
        },
        {
          id: 'nav:sources:mcp',
          title: t('sidebar.mcps'),
          label: String(sourceTypeCounts.mcp),
          icon: <McpIcon className="h-3.5 w-3.5" />,
          variant: sourceFilter?.kind === 'type' && sourceFilter.sourceType === 'mcp' ? 'default' : 'ghost',
          onClick: onSourcesMcpClick,
          contextMenu: {
            type: 'sources',
            onAddSource: () => onAddSource('mcp'),
            sourceType: 'mcp',
          },
        },
        {
          id: 'nav:sources:local',
          title: t('sidebar.localFolders'),
          label: String(sourceTypeCounts.local),
          icon: FolderOpen,
          variant: sourceFilter?.kind === 'type' && sourceFilter.sourceType === 'local' ? 'default' : 'ghost',
          onClick: onSourcesLocalClick,
          contextMenu: {
            type: 'sources',
            onAddSource: () => onAddSource('local'),
            sourceType: 'local',
          },
        },
      ],
    },
    {
      id: 'nav:automations',
      title: t('sidebar.automations'),
      label: String(automationsCount),
      icon: ListTodo,
      variant: (isAutomationsNavigation(navState) && !automationFilter) ? 'default' : 'ghost',
      onClick: onAutomationsClick,
      expandable: true,
      expanded: isExpanded('nav:automations'),
      onToggle: () => toggleExpanded('nav:automations'),
      contextMenu: {
        type: 'automations',
        onAddAutomation,
      },
      items: [
        {
          id: 'nav:automations:scheduled',
          title: t('sidebar.scheduled'),
          label: String(automationTypeCounts.scheduled),
          icon: Clock,
          variant: automationFilter?.kind === 'type' && automationFilter.automationType === 'scheduled' ? 'default' : 'ghost',
          onClick: onAutomationsScheduledClick,
          contextMenu: { type: 'automations', onAddAutomation },
        },
        {
          id: 'nav:automations:event',
          title: t('sidebar.eventBased'),
          label: String(automationTypeCounts.event),
          icon: Radio,
          variant: automationFilter?.kind === 'type' && automationFilter.automationType === 'event' ? 'default' : 'ghost',
          onClick: onAutomationsEventClick,
          contextMenu: { type: 'automations', onAddAutomation },
        },
        {
          id: 'nav:automations:agentic',
          title: t('sidebar.agentic'),
          label: String(automationTypeCounts.agentic),
          icon: Bot,
          variant: automationFilter?.kind === 'type' && automationFilter.automationType === 'agentic' ? 'default' : 'ghost',
          onClick: onAutomationsAgenticClick,
          contextMenu: { type: 'automations', onAddAutomation },
        },
      ],
    },
    {
      id: 'nav:skills',
      title: t('sidebar.skills'),
      label: String(skillsCount),
      icon: Zap,
      variant: isSkillsNavigation(navState) ? 'default' : 'ghost',
      onClick: onSkillsClick,
      contextMenu: {
        type: 'skills',
        onAddSkill,
      },
    },
    { id: 'separator:skills-settings', type: 'separator' },
    {
      id: 'nav:settings',
      title: t('sidebar.settings'),
      icon: Settings,
      variant: isSettingsNavigation(navState) ? 'default' : 'ghost',
      onClick: onSettingsClick,
    },
    {
      id: 'nav:whats-new',
      title: t('sidebar.whatsNew'),
      icon: hasUnseenReleaseNotes ? (
        <span className="relative">
          <Cake className="h-3.5 w-3.5" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      ) : Cake,
      variant: 'ghost',
      onClick: onWhatsNewClick,
    },
  ]
}
