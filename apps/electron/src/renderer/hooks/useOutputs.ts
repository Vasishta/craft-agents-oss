import * as React from 'react'
import type { CreateOutputInput, OutputDocument, OutputIndexEntry, UpdateOutputInput } from '../../shared/types'
import {
  createWorkspaceCollectionHook,
  createWorkspaceDeleteHook,
  createWorkspaceDocumentHook,
  createWorkspaceMutationHook,
} from './useWorkspaceResource'

const useOutputListResource = createWorkspaceCollectionHook<OutputIndexEntry, { outputId?: string }>({
  empty: [],
  list: (workspaceId) => window.electronAPI.listOutputs(workspaceId),
  subscribe: window.electronAPI.onOutputsChanged,
  errorMessage: 'Failed to load outputs',
})

const useOutputResource = createWorkspaceDocumentHook<OutputDocument, { outputId?: string }>({
  empty: null,
  get: (workspaceId, outputId) => window.electronAPI.getOutput(workspaceId, outputId),
  subscribe: window.electronAPI.onOutputsChanged,
  getChangedId: (change) => change.outputId,
  errorMessage: 'Failed to load output',
})

const useCreateOutputResource = createWorkspaceMutationHook<CreateOutputInput, OutputDocument | null>(
  (workspaceId, input) => window.electronAPI.createOutput(workspaceId, input),
  null,
)

const useUpdateOutputResource = createWorkspaceMutationHook<
  { outputId: string; updates: UpdateOutputInput },
  OutputDocument | null
>((workspaceId, input) => window.electronAPI.updateOutput(workspaceId, input.outputId, input.updates), null)

const useDeleteOutputResource = createWorkspaceDeleteHook((workspaceId, outputId) =>
  window.electronAPI.deleteOutput(workspaceId, outputId),
)

export function useOutputList(workspaceId: string | null | undefined) {
  const resource = useOutputListResource(workspaceId)
  return { outputs: resource.entries, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useOutput(workspaceId: string | null | undefined, outputId: string | null | undefined) {
  const resource = useOutputResource(workspaceId, outputId)
  return { output: resource.document, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useCreateOutput(workspaceId: string | null | undefined) {
  const createOutput = useCreateOutputResource(workspaceId)
  return React.useCallback((input: CreateOutputInput) => createOutput(input), [createOutput])
}

export function useUpdateOutput(workspaceId: string | null | undefined) {
  const updateOutput = useUpdateOutputResource(workspaceId)
  return React.useCallback((outputId: string, updates: UpdateOutputInput) => updateOutput({ outputId, updates }), [updateOutput])
}

export function useDeleteOutput(workspaceId: string | null | undefined) {
  const deleteOutput = useDeleteOutputResource(workspaceId)
  return React.useCallback((outputId: string) => deleteOutput(outputId), [deleteOutput])
}

export function usePromoteOutputToDoc(workspaceId: string | null | undefined) {
  return React.useCallback(async (outputId: string) => {
    if (!workspaceId) return null
    return window.electronAPI.promoteOutputToDoc(workspaceId, outputId)
  }, [workspaceId])
}
