import * as React from 'react'
import type { CreateNotebookInput, NotebookDocument, NotebookIndexEntry, UpdateNotebookInput } from '../../shared/types'

export function useNotebookList(workspaceId: string | null | undefined) {
  const [notebooks, setNotebooks] = React.useState<NotebookIndexEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId) {
      setNotebooks([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const entries = await window.electronAPI.listNotebooks(workspaceId)
      setNotebooks(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notebooks')
      setNotebooks([])
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !window.electronAPI.onNotebooksChanged) return
    return window.electronAPI.onNotebooksChanged((changedWorkspaceId) => {
      if (changedWorkspaceId === workspaceId) {
        void refresh()
      }
    })
  }, [refresh, workspaceId])

  return { notebooks, isLoading, error, refresh }
}

export function useNotebook(workspaceId: string | null | undefined, notebookId: string | null | undefined) {
  const [notebook, setNotebook] = React.useState<NotebookDocument | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !notebookId) {
      setNotebook(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const document = await window.electronAPI.getNotebook(workspaceId, notebookId)
      setNotebook(document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notebook')
      setNotebook(null)
    } finally {
      setIsLoading(false)
    }
  }, [notebookId, workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !notebookId || !window.electronAPI.onNotebooksChanged) return
    return window.electronAPI.onNotebooksChanged((changedWorkspaceId, data) => {
      if (changedWorkspaceId === workspaceId && data.notebookId === notebookId) {
        void refresh()
      }
    })
  }, [notebookId, refresh, workspaceId])

  return { notebook, isLoading, error, refresh }
}

export function useCreateNotebook(workspaceId: string | null | undefined) {
  return React.useCallback(async (input: CreateNotebookInput): Promise<NotebookDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.createNotebook(workspaceId, input)
  }, [workspaceId])
}

export function useUpdateNotebook(workspaceId: string | null | undefined) {
  return React.useCallback(async (notebookId: string, updates: UpdateNotebookInput): Promise<NotebookDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.updateNotebook(workspaceId, notebookId, updates)
  }, [workspaceId])
}

export function useDeleteNotebook(workspaceId: string | null | undefined) {
  return React.useCallback(async (notebookId: string): Promise<boolean> => {
    if (!workspaceId) return false
    await window.electronAPI.deleteNotebook(workspaceId, notebookId)
    return true
  }, [workspaceId])
}
