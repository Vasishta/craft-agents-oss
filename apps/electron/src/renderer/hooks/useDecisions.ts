import * as React from 'react'
import type { CreateDecisionInput, DecisionDocument, DecisionIndexEntry, UpdateDecisionInput } from '../../shared/types'
import { createWorkspaceCrudHooks } from './useWorkspaceResource'

const {
  useListResource: useDecisionListResource,
  useDocumentResource: useDecisionResource,
  useCreateResource: useCreateDecisionResource,
  useUpdateResource: useUpdateDecisionResource,
  useDeleteResource: useDeleteDecisionResource,
} = createWorkspaceCrudHooks<DecisionIndexEntry, DecisionDocument, CreateDecisionInput, UpdateDecisionInput, { decisionId?: string }>({
  list: (workspaceId) => window.electronAPI.listDecisions(workspaceId),
  get: (workspaceId, decisionId) => window.electronAPI.getDecision(workspaceId, decisionId),
  subscribe: window.electronAPI.onDecisionsChanged,
  getChangedId: (change) => change.decisionId,
  create: (workspaceId, input) => window.electronAPI.createDecision(workspaceId, input),
  update: (workspaceId, decisionId, updates) => window.electronAPI.updateDecision(workspaceId, decisionId, updates),
  remove: (workspaceId, decisionId) => window.electronAPI.deleteDecision(workspaceId, decisionId),
  errors: {
    list: 'Failed to load decisions',
    document: 'Failed to load decision',
  },
})

export function useDecisionList(workspaceId: string | null | undefined) {
  const resource = useDecisionListResource(workspaceId)
  return { decisions: resource.entries, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useDecision(workspaceId: string | null | undefined, decisionId: string | null | undefined) {
  const resource = useDecisionResource(workspaceId, decisionId)
  return { decision: resource.document, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useCreateDecision(workspaceId: string | null | undefined) {
  const createDecision = useCreateDecisionResource(workspaceId)
  return React.useCallback((input: CreateDecisionInput) => createDecision(input), [createDecision])
}

export function useUpdateDecision(workspaceId: string | null | undefined) {
  const updateDecision = useUpdateDecisionResource(workspaceId)
  return React.useCallback(
    (decisionId: string, updates: UpdateDecisionInput) => updateDecision({ resourceId: decisionId, updates }),
    [updateDecision],
  )
}

export function useDeleteDecision(workspaceId: string | null | undefined) {
  const deleteDecision = useDeleteDecisionResource(workspaceId)
  return React.useCallback((decisionId: string) => deleteDecision(decisionId), [deleteDecision])
}
