import * as React from 'react'
import type { CreateDecisionInput, DecisionDocument, DecisionIndexEntry, UpdateDecisionInput } from '../../shared/types'

export function useDecisionList(workspaceId: string | null | undefined) {
  const [decisions, setDecisions] = React.useState<DecisionIndexEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId) {
      setDecisions([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const entries = await window.electronAPI.listDecisions(workspaceId)
      setDecisions(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decisions')
      setDecisions([])
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !window.electronAPI.onDecisionsChanged) return
    return window.electronAPI.onDecisionsChanged((changedWorkspaceId) => {
      if (changedWorkspaceId === workspaceId) {
        void refresh()
      }
    })
  }, [refresh, workspaceId])

  return { decisions, isLoading, error, refresh }
}

export function useDecision(workspaceId: string | null | undefined, decisionId: string | null | undefined) {
  const [decision, setDecision] = React.useState<DecisionDocument | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !decisionId) {
      setDecision(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const document = await window.electronAPI.getDecision(workspaceId, decisionId)
      setDecision(document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decision')
      setDecision(null)
    } finally {
      setIsLoading(false)
    }
  }, [decisionId, workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !decisionId || !window.electronAPI.onDecisionsChanged) return
    return window.electronAPI.onDecisionsChanged((changedWorkspaceId, data) => {
      if (changedWorkspaceId === workspaceId && data.decisionId === decisionId) {
        void refresh()
      }
    })
  }, [decisionId, refresh, workspaceId])

  return { decision, isLoading, error, refresh }
}

export function useCreateDecision(workspaceId: string | null | undefined) {
  return React.useCallback(async (input: CreateDecisionInput): Promise<DecisionDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.createDecision(workspaceId, input)
  }, [workspaceId])
}

export function useUpdateDecision(workspaceId: string | null | undefined) {
  return React.useCallback(async (decisionId: string, updates: UpdateDecisionInput): Promise<DecisionDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.updateDecision(workspaceId, decisionId, updates)
  }, [workspaceId])
}

export function useDeleteDecision(workspaceId: string | null | undefined) {
  return React.useCallback(async (decisionId: string): Promise<boolean> => {
    if (!workspaceId) return false
    await window.electronAPI.deleteDecision(workspaceId, decisionId)
    return true
  }, [workspaceId])
}
