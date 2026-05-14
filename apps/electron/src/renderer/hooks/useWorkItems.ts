import * as React from 'react'
import type {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemDocument,
  WorkItemIndexEntry,
} from '../../shared/types'
import {
  createWorkspaceCollectionHook,
  createWorkspaceDeleteHook,
  createWorkspaceDocumentHook,
  createWorkspaceMutationHook,
} from './useWorkspaceResource'

const useWorkItemListResource = createWorkspaceCollectionHook<WorkItemIndexEntry, { workItemId?: string }>({
  empty: [],
  list: (workspaceId) => window.electronAPI.listWorkItems(workspaceId),
  subscribe: window.electronAPI.onWorkItemsChanged,
  errorMessage: 'Failed to load work items',
})

const useWorkItemResource = createWorkspaceDocumentHook<WorkItemDocument, { workItemId?: string }>({
  empty: null,
  get: (workspaceId, workItemId) => window.electronAPI.getWorkItem(workspaceId, workItemId),
  subscribe: window.electronAPI.onWorkItemsChanged,
  getChangedId: (change) => change.workItemId,
  errorMessage: 'Failed to load work item',
})

const useCreateWorkItemResource = createWorkspaceMutationHook<CreateWorkItemInput, WorkItemDocument | null>(
  (workspaceId, input) => window.electronAPI.createWorkItem(workspaceId, input),
  null,
)

const useUpdateWorkItemResource = createWorkspaceMutationHook<
  { workItemId: string; updates: UpdateWorkItemInput },
  WorkItemDocument | null
>((workspaceId, input) => window.electronAPI.updateWorkItem(workspaceId, input.workItemId, input.updates), null)

const useDeleteWorkItemResource = createWorkspaceDeleteHook((workspaceId, workItemId) =>
  window.electronAPI.deleteWorkItem(workspaceId, workItemId),
)

export function useWorkItemList(workspaceId: string | null | undefined) {
  const resource = useWorkItemListResource(workspaceId)
  return { workItems: resource.entries, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useWorkItem(workspaceId: string | null | undefined, workItemId: string | null | undefined) {
  const resource = useWorkItemResource(workspaceId, workItemId)
  return { workItem: resource.document, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useCreateWorkItem(workspaceId: string | null | undefined) {
  const createWorkItem = useCreateWorkItemResource(workspaceId)
  return React.useCallback((input: CreateWorkItemInput) => createWorkItem(input), [createWorkItem])
}

export function useUpdateWorkItem(workspaceId: string | null | undefined) {
  const updateWorkItem = useUpdateWorkItemResource(workspaceId)
  return React.useCallback((workItemId: string, updates: UpdateWorkItemInput) => updateWorkItem({ workItemId, updates }), [updateWorkItem])
}

export function useDeleteWorkItem(workspaceId: string | null | undefined) {
  const deleteWorkItem = useDeleteWorkItemResource(workspaceId)
  return React.useCallback((workItemId: string) => deleteWorkItem(workItemId), [deleteWorkItem])
}
