import * as React from 'react'
import type { CreateOutputInput, OutputDocument, OutputIndexEntry, UpdateOutputInput } from '../../shared/types'

export function useOutputList(workspaceId: string | null | undefined) {
  const [outputs, setOutputs] = React.useState<OutputIndexEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId) {
      setOutputs([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const entries = await window.electronAPI.listOutputs(workspaceId)
      setOutputs(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outputs')
      setOutputs([])
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !window.electronAPI.onOutputsChanged) return
    return window.electronAPI.onOutputsChanged((changedWorkspaceId) => {
      if (changedWorkspaceId === workspaceId) {
        void refresh()
      }
    })
  }, [refresh, workspaceId])

  return { outputs, isLoading, error, refresh }
}

export function useOutput(workspaceId: string | null | undefined, outputId: string | null | undefined) {
  const [output, setOutput] = React.useState<OutputDocument | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !outputId) {
      setOutput(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const document = await window.electronAPI.getOutput(workspaceId, outputId)
      setOutput(document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load output')
      setOutput(null)
    } finally {
      setIsLoading(false)
    }
  }, [outputId, workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !outputId || !window.electronAPI.onOutputsChanged) return
    return window.electronAPI.onOutputsChanged((changedWorkspaceId, data) => {
      if (changedWorkspaceId === workspaceId && data.outputId === outputId) {
        void refresh()
      }
    })
  }, [outputId, refresh, workspaceId])

  return { output, isLoading, error, refresh }
}

export function useCreateOutput(workspaceId: string | null | undefined) {
  return React.useCallback(async (input: CreateOutputInput): Promise<OutputDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.createOutput(workspaceId, input)
  }, [workspaceId])
}

export function useUpdateOutput(workspaceId: string | null | undefined) {
  return React.useCallback(async (outputId: string, updates: UpdateOutputInput): Promise<OutputDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.updateOutput(workspaceId, outputId, updates)
  }, [workspaceId])
}

export function useDeleteOutput(workspaceId: string | null | undefined) {
  return React.useCallback(async (outputId: string): Promise<boolean> => {
    if (!workspaceId) return false
    await window.electronAPI.deleteOutput(workspaceId, outputId)
    return true
  }, [workspaceId])
}

export function usePromoteOutputToDoc(workspaceId: string | null | undefined) {
  return React.useCallback(async (outputId: string) => {
    if (!workspaceId) return null
    return window.electronAPI.promoteOutputToDoc(workspaceId, outputId)
  }, [workspaceId])
}
