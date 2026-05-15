import * as React from 'react'
import type { CreateNotebookInput, NotebookDocument, NotebookIndexEntry, UpdateNotebookInput } from '../../shared/types'
import {
  createWorkspaceCrudHooks,
} from './useWorkspaceResource'

const {
  useListResource: useNotebookListResource,
  useDocumentResource: useNotebookResource,
  useCreateResource: useCreateNotebookResource,
  useUpdateResource: useUpdateNotebookResource,
  useDeleteResource: useDeleteNotebookResource,
} = createWorkspaceCrudHooks<NotebookIndexEntry, NotebookDocument, CreateNotebookInput, UpdateNotebookInput, { notebookId?: string }>({
  list: (workspaceId) => window.electronAPI.listNotebooks(workspaceId),
  get: (workspaceId, notebookId) => window.electronAPI.getNotebook(workspaceId, notebookId),
  subscribe: window.electronAPI.onNotebooksChanged,
  getChangedId: (change) => change.notebookId,
  create: (workspaceId, input) => window.electronAPI.createNotebook(workspaceId, input),
  update: (workspaceId, notebookId, updates) => window.electronAPI.updateNotebook(workspaceId, notebookId, updates),
  remove: (workspaceId, notebookId) => window.electronAPI.deleteNotebook(workspaceId, notebookId),
  errors: {
    list: 'Failed to load notebooks',
    document: 'Failed to load notebook',
  },
})

export function useNotebookList(workspaceId: string | null | undefined) {
  const resource = useNotebookListResource(workspaceId)
  return { notebooks: resource.entries, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useNotebook(workspaceId: string | null | undefined, notebookId: string | null | undefined) {
  const resource = useNotebookResource(workspaceId, notebookId)
  return { notebook: resource.document, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useCreateNotebook(workspaceId: string | null | undefined) {
  const createNotebook = useCreateNotebookResource(workspaceId)
  return React.useCallback((input: CreateNotebookInput) => createNotebook(input), [createNotebook])
}

export function useUpdateNotebook(workspaceId: string | null | undefined) {
  const updateNotebook = useUpdateNotebookResource(workspaceId)
  return React.useCallback(
    (notebookId: string, updates: UpdateNotebookInput) => updateNotebook({ resourceId: notebookId, updates }),
    [updateNotebook],
  )
}

export function useDeleteNotebook(workspaceId: string | null | undefined) {
  const deleteNotebook = useDeleteNotebookResource(workspaceId)
  return React.useCallback((notebookId: string) => deleteNotebook(notebookId), [deleteNotebook])
}
