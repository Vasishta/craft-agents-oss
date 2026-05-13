import type { LabelTreeNode } from '@craft-agent/shared/labels'

interface SidebarFocusOrderParams {
  projectIds: string[]
  pageIds: string[]
  outputIds: string[]
  statusIds: string[]
  labelTree: LabelTreeNode[]
  isExpanded: (id: string) => boolean
}

function pushLabelIds(result: string[], nodes: LabelTreeNode[]) {
  for (const node of nodes) {
    if (node.label) {
      result.push(`nav:label:${node.fullId}`)
    }
    if (node.children.length > 0) {
      pushLabelIds(result, node.children)
    }
  }
}

export function buildSidebarFocusItemIds({
  projectIds,
  pageIds,
  outputIds,
  statusIds,
  labelTree,
  isExpanded,
}: SidebarFocusOrderParams): string[] {
  const result: string[] = []

  result.push('nav:home')
  result.push('nav:search')
  result.push('nav:projects')
  if (isExpanded('nav:projects')) {
    for (const projectId of projectIds.slice(0, 10)) {
      result.push(`nav:project:${projectId}`)
    }
  }

  result.push('nav:library')
  if (isExpanded('nav:library')) {
    result.push('nav:pages')
    if (isExpanded('nav:pages')) {
      for (const pageId of pageIds.slice(0, 10)) {
        result.push(`nav:page:${pageId}`)
      }
    }

    result.push('nav:outputs')
    if (isExpanded('nav:outputs')) {
      for (const outputId of outputIds.slice(0, 10)) {
        result.push(`nav:output:${outputId}`)
      }
    }
  }

  result.push('nav:workQueue')
  if (isExpanded('nav:workQueue')) {
    result.push('nav:allSessions')
    for (const statusId of statusIds) {
      result.push(`nav:state:${statusId}`)
    }
    result.push('nav:flagged')
    result.push('nav:archived')
    result.push('nav:labels')
    if (isExpanded('nav:labels')) {
      pushLabelIds(result, labelTree)
    }
  }

  result.push('nav:sources')
  result.push('nav:automations')
  result.push('nav:skills')
  result.push('nav:settings')
  result.push('nav:whats-new')

  return result
}
