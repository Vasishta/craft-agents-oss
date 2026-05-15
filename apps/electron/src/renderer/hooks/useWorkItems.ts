import * as React from 'react'
import type {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemDocument,
  WorkItemIndexEntry,
} from '../../shared/types'
import {
  createWorkspaceCrudHooks,
} from './useWorkspaceResource'

const {
  useListResource: useWorkItemListResource,
  useDocumentResource: useWorkItemResource,
  useCreateResource: useCreateWorkItemResource,
  useUpdateResource: useUpdateWorkItemResource,
  useDeleteResource: useDeleteWorkItemResource,
} = createWorkspaceCrudHooks<WorkItemIndexEntry, WorkItemDocument, CreateWorkItemInput, UpdateWorkItemInput, { workItemId?: string }>({
  list: (workspaceId) => window.electronAPI.listWorkItems(workspaceId),
  get: (workspaceId, workItemId) => window.electronAPI.getWorkItem(workspaceId, workItemId),
  subscribe: window.electronAPI.onWorkItemsChanged,
  getChangedId: (change) => change.workItemId,
  create: (workspaceId, input) => window.electronAPI.createWorkItem(workspaceId, input),
  update: (workspaceId, workItemId, updates) => window.electronAPI.updateWorkItem(workspaceId, workItemId, updates),
  remove: (workspaceId, workItemId) => window.electronAPI.deleteWorkItem(workspaceId, workItemId),
  errors: {
    list: 'Failed to load work items',
    document: 'Failed to load work item',
  },
})

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
  return React.useCallback((workItemId: string, updates: UpdateWorkItemInput) => updateWorkItem({ resourceId: workItemId, updates }), [updateWorkItem])
}

export function useDeleteWorkItem(workspaceId: string | null | undefined) {
  const deleteWorkItem = useDeleteWorkItemResource(workspaceId)
  return React.useCallback((workItemId: string) => deleteWorkItem(workItemId), [deleteWorkItem])
}
