import * as React from 'react'
import type {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemDocument,
  WorkItemIndexEntry,
} from '../../shared/types'

export function useWorkItemList(workspaceId: string | null | undefined) {
  const [workItems, setWorkItems] = React.useState<WorkItemIndexEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId) {
      setWorkItems([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const entries = await window.electronAPI.listWorkItems(workspaceId)
      setWorkItems(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work items')
      setWorkItems([])
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !window.electronAPI.onWorkItemsChanged) return
    return window.electronAPI.onWorkItemsChanged((changedWorkspaceId) => {
      if (changedWorkspaceId === workspaceId) {
        void refresh()
      }
    })
  }, [refresh, workspaceId])

  return { workItems, isLoading, error, refresh }
}

export function useWorkItem(workspaceId: string | null | undefined, workItemId: string | null | undefined) {
  const [workItem, setWorkItem] = React.useState<WorkItemDocument | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !workItemId) {
      setWorkItem(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const document = await window.electronAPI.getWorkItem(workspaceId, workItemId)
      setWorkItem(document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work item')
      setWorkItem(null)
    } finally {
      setIsLoading(false)
    }
  }, [workItemId, workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !workItemId || !window.electronAPI.onWorkItemsChanged) return
    return window.electronAPI.onWorkItemsChanged((changedWorkspaceId, data) => {
      if (changedWorkspaceId === workspaceId && data.workItemId === workItemId) {
        void refresh()
      }
    })
  }, [refresh, workItemId, workspaceId])

  return { workItem, isLoading, error, refresh }
}

export function useCreateWorkItem(workspaceId: string | null | undefined) {
  return React.useCallback(async (input: CreateWorkItemInput): Promise<WorkItemDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.createWorkItem(workspaceId, input)
  }, [workspaceId])
}

export function useUpdateWorkItem(workspaceId: string | null | undefined) {
  return React.useCallback(async (workItemId: string, updates: UpdateWorkItemInput): Promise<WorkItemDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.updateWorkItem(workspaceId, workItemId, updates)
  }, [workspaceId])
}

export function useDeleteWorkItem(workspaceId: string | null | undefined) {
  return React.useCallback(async (workItemId: string): Promise<boolean> => {
    if (!workspaceId) return false
    await window.electronAPI.deleteWorkItem(workspaceId, workItemId)
    return true
  }, [workspaceId])
}
