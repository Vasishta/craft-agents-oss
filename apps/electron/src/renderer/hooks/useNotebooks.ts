import * as React from 'react'
import type { CreateNotebookInput, NotebookDocument, NotebookIndexEntry, UpdateNotebookInput } from '../../shared/types'
import {
  createWorkspaceCollectionHook,
  createWorkspaceDeleteHook,
  createWorkspaceDocumentHook,
  createWorkspaceMutationHook,
} from './useWorkspaceResource'

const useNotebookListResource = createWorkspaceCollectionHook<NotebookIndexEntry, { notebookId?: string }>({
  empty: [],
  list: (workspaceId) => window.electronAPI.listNotebooks(workspaceId),
  subscribe: window.electronAPI.onNotebooksChanged,
  errorMessage: 'Failed to load notebooks',
})

const useNotebookResource = createWorkspaceDocumentHook<NotebookDocument, { notebookId?: string }>({
  empty: null,
  get: (workspaceId, notebookId) => window.electronAPI.getNotebook(workspaceId, notebookId),
  subscribe: window.electronAPI.onNotebooksChanged,
  getChangedId: (change) => change.notebookId,
  errorMessage: 'Failed to load notebook',
})

const useCreateNotebookResource = createWorkspaceMutationHook<CreateNotebookInput, NotebookDocument | null>(
  (workspaceId, input) => window.electronAPI.createNotebook(workspaceId, input),
  null,
)

const useUpdateNotebookResource = createWorkspaceMutationHook<
  { notebookId: string; updates: UpdateNotebookInput },
  NotebookDocument | null
>((workspaceId, input) => window.electronAPI.updateNotebook(workspaceId, input.notebookId, input.updates), null)

const useDeleteNotebookResource = createWorkspaceDeleteHook((workspaceId, notebookId) =>
  window.electronAPI.deleteNotebook(workspaceId, notebookId),
)

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
    (notebookId: string, updates: UpdateNotebookInput) => updateNotebook({ notebookId, updates }),
    [updateNotebook],
  )
}

export function useDeleteNotebook(workspaceId: string | null | undefined) {
  const deleteNotebook = useDeleteNotebookResource(workspaceId)
  return React.useCallback((notebookId: string) => deleteNotebook(notebookId), [deleteNotebook])
}
