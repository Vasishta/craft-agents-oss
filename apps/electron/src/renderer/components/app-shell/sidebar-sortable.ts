export function extractSortableSidebarEntityId(id: string): string {
  if (id.startsWith('nav:state:')) {
    return id.slice('nav:state:'.length)
  }

  if (id.startsWith('nav:label:')) {
    return id.slice('nav:label:'.length)
  }

  return id
}
