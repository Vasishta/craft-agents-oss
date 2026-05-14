import * as React from 'react'
import type { CreateProjectInput, ProjectDocument, ProjectIndexEntry, ProjectLinks, UpdateProjectInput } from '../../shared/types'
import {
  createWorkspaceCollectionHook,
  createWorkspaceDeleteHook,
  createWorkspaceDocumentHook,
  createWorkspaceMutationHook,
} from './useWorkspaceResource'

const useProjectListResource = createWorkspaceCollectionHook<ProjectIndexEntry, { projectId?: string }>({
  empty: [],
  list: (workspaceId) => window.electronAPI.listProjects(workspaceId),
  subscribe: window.electronAPI.onProjectsChanged,
  errorMessage: 'Failed to load projects',
})

const useProjectResource = createWorkspaceDocumentHook<ProjectDocument, { projectId?: string }>({
  empty: null,
  get: (workspaceId, projectId) => window.electronAPI.getProject(workspaceId, projectId),
  subscribe: window.electronAPI.onProjectsChanged,
  getChangedId: (change) => change.projectId,
  errorMessage: 'Failed to load project',
})

const useCreateProjectResource = createWorkspaceMutationHook<CreateProjectInput, ProjectDocument | null>(
  (workspaceId, input) => window.electronAPI.createProject(workspaceId, input),
  null,
)

const useUpdateProjectResource = createWorkspaceMutationHook<
  { projectId: string; updates: UpdateProjectInput },
  ProjectDocument | null
>((workspaceId, input) => window.electronAPI.updateProject(workspaceId, input.projectId, input.updates), null)

const useDeleteProjectResource = createWorkspaceDeleteHook((workspaceId, projectId) =>
  window.electronAPI.deleteProject(workspaceId, projectId),
)

export function useProjectList(workspaceId: string | null | undefined) {
  const resource = useProjectListResource(workspaceId)
  return { projects: resource.entries, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useProject(workspaceId: string | null | undefined, projectId: string | null | undefined) {
  const resource = useProjectResource(workspaceId, projectId)
  return { project: resource.document, isLoading: resource.isLoading, error: resource.error, refresh: resource.refresh }
}

export function useCreateProject(workspaceId: string | null | undefined) {
  const createProject = useCreateProjectResource(workspaceId)
  return React.useCallback((input: CreateProjectInput) => createProject(input), [createProject])
}

export function useUpdateProject(workspaceId: string | null | undefined) {
  const updateProject = useUpdateProjectResource(workspaceId)
  return React.useCallback((projectId: string, updates: UpdateProjectInput) => updateProject({ projectId, updates }), [updateProject])
}

export function useDeleteProject(workspaceId: string | null | undefined) {
  const deleteProject = useDeleteProjectResource(workspaceId)
  return React.useCallback((projectId: string) => deleteProject(projectId), [deleteProject])
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
