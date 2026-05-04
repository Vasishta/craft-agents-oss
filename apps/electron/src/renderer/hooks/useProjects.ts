import * as React from 'react'
import type { CreateProjectInput, ProjectDocument, ProjectIndexEntry, ProjectLinks, UpdateProjectInput } from '../../shared/types'

export function useProjectList(workspaceId: string | null | undefined) {
  const [projects, setProjects] = React.useState<ProjectIndexEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId) {
      setProjects([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const entries = await window.electronAPI.listProjects(workspaceId)
      setProjects(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !window.electronAPI.onProjectsChanged) return
    return window.electronAPI.onProjectsChanged((changedWorkspaceId) => {
      if (changedWorkspaceId === workspaceId) {
        void refresh()
      }
    })
  }, [refresh, workspaceId])

  return { projects, isLoading, error, refresh }
}

export function useProject(workspaceId: string | null | undefined, projectId: string | null | undefined) {
  const [project, setProject] = React.useState<ProjectDocument | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !projectId) {
      setProject(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const document = await window.electronAPI.getProject(workspaceId, projectId)
      setProject(document)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
      setProject(null)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, workspaceId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!workspaceId || !projectId || !window.electronAPI.onProjectsChanged) return
    return window.electronAPI.onProjectsChanged((changedWorkspaceId, data) => {
      if (changedWorkspaceId === workspaceId && data.projectId === projectId) {
        void refresh()
      }
    })
  }, [projectId, refresh, workspaceId])

  return { project, isLoading, error, refresh }
}

export function useCreateProject(workspaceId: string | null | undefined) {
  return React.useCallback(async (input: CreateProjectInput): Promise<ProjectDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.createProject(workspaceId, input)
  }, [workspaceId])
}

export function useUpdateProject(workspaceId: string | null | undefined) {
  return React.useCallback(async (projectId: string, updates: UpdateProjectInput): Promise<ProjectDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.updateProject(workspaceId, projectId, updates)
  }, [workspaceId])
}

export function useDeleteProject(workspaceId: string | null | undefined) {
  return React.useCallback(async (projectId: string): Promise<boolean> => {
    if (!workspaceId) return false
    await window.electronAPI.deleteProject(workspaceId, projectId)
    return true
  }, [workspaceId])
}

export function useLinkProjectObjects(workspaceId: string | null | undefined) {
  return React.useCallback(async (projectId: string, links: Partial<ProjectLinks>): Promise<ProjectDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.linkProjectObjects(workspaceId, projectId, links)
  }, [workspaceId])
}

export function useUnlinkProjectObjects(workspaceId: string | null | undefined) {
  return React.useCallback(async (projectId: string, links: Partial<ProjectLinks>): Promise<ProjectDocument | null> => {
    if (!workspaceId) return null
    return window.electronAPI.unlinkProjectObjects(workspaceId, projectId, links)
  }, [workspaceId])
}
