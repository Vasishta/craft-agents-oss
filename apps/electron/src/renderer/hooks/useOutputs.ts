import * as React from 'react'
import type { CreateOutputInput, OutputDocument, OutputIndexEntry, UpdateOutputInput } from '../../shared/types'
import {
  createWorkspaceCrudHooks,
} from './useWorkspaceResource'

const {
  useListResource: useOutputListResource,
  useDocumentResource: useOutputResource,
  useCreateResource: useCreateOutputResource,
  useUpdateResource: useUpdateOutputResource,
  useDeleteResource: useDeleteOutputResource,
} = createWorkspaceCrudHooks<OutputIndexEntry, OutputDocument, CreateOutputInput, UpdateOutputInput, { outputId?: string }>({
  list: (workspaceId) => window.electronAPI.listOutputs(workspaceId),
  get: (workspaceId, outputId) => window.electronAPI.getOutput(workspaceId, outputId),
  subscribe: window.electronAPI.onOutputsChanged,
  getChangedId: (change) => change.outputId,
  create: (workspaceId, input) => window.electronAPI.createOutput(workspaceId, input),
  update: (workspaceId, outputId, updates) => window.electronAPI.updateOutput(workspaceId, outputId, updates),
  remove: (workspaceId, outputId) => window.electronAPI.deleteOutput(workspaceId, outputId),
  errors: {
    list: 'Failed to load outputs',
    document: 'Failed to load output',
  },
})

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
  return React.useCallback((outputId: string, updates: UpdateOutputInput) => updateOutput({ resourceId: outputId, updates }), [updateOutput])
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
