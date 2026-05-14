import * as React from 'react'
import type { CreateDecisionInput, DecisionDocument, DecisionIndexEntry, UpdateDecisionInput } from '../../shared/types'
import {
  createWorkspaceCollectionHook,
  createWorkspaceDeleteHook,
  createWorkspaceDocumentHook,
  createWorkspaceMutationHook,
} from './useWorkspaceResource'

const useDecisionListResource = createWorkspaceCollectionHook<DecisionIndexEntry, { decisionId?: string }>({
  empty: [],
  list: (workspaceId) => window.electronAPI.listDecisions(workspaceId),
  subscribe: window.electronAPI.onDecisionsChanged,
  errorMessage: 'Failed to load decisions',
})

const useDecisionResource = createWorkspaceDocumentHook<DecisionDocument, { decisionId?: string }>({
  empty: null,
  get: (workspaceId, decisionId) => window.electronAPI.getDecision(workspaceId, decisionId),
  subscribe: window.electronAPI.onDecisionsChanged,
  getChangedId: (change) => change.decisionId,
  errorMessage: 'Failed to load decision',
})

const useCreateDecisionResource = createWorkspaceMutationHook<CreateDecisionInput, DecisionDocument | null>(
  (workspaceId, input) => window.electronAPI.createDecision(workspaceId, input),
  null,
)

const useUpdateDecisionResource = createWorkspaceMutationHook<
  { decisionId: string; updates: UpdateDecisionInput },
  DecisionDocument | null
>((workspaceId, input) => window.electronAPI.updateDecision(workspaceId, input.decisionId, input.updates), null)

const useDeleteDecisionResource = createWorkspaceDeleteHook((workspaceId, decisionId) =>
  window.electronAPI.deleteDecision(workspaceId, decisionId),
)

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
    (decisionId: string, updates: UpdateDecisionInput) => updateDecision({ decisionId, updates }),
    [updateDecision],
  )
}

export function useDeleteDecision(workspaceId: string | null | undefined) {
  const deleteDecision = useDeleteDecisionResource(workspaceId)
  return React.useCallback((decisionId: string) => deleteDecision(decisionId), [deleteDecision])
}
