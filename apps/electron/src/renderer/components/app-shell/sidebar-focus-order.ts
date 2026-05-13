import type { SidebarItem } from './LeftSidebar'

export interface SidebarFocusableItem {
  id: string
  action?: () => void
}

function isLinkItem(item: SidebarItem): item is Exclude<SidebarItem, { type: 'separator' }> {
  return !('type' in item && item.type === 'separator')
}

export function flattenVisibleSidebarFocusableItems(links: SidebarItem[]): SidebarFocusableItem[] {
  const result: SidebarFocusableItem[] = []

  const visit = (items: SidebarItem[]) => {
    for (const item of items) {
      if (!isLinkItem(item)) continue
      result.push({ id: item.id, action: item.onClick })
      if (item.expandable && item.expanded && item.items?.length) {
        visit(item.items)
      }
    }
  }

  visit(links)
  return result
}
