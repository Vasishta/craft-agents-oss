/**
 * Projects RPC Handlers
 *
 * Handles workspace-scoped Project CRUD and link mutations.
 */

import { getWorkspaceByNameOrId } from '@craft-agent/shared/config'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  createProjectDocument,
  deleteProjectDocument,
  linkProjectObjects,
  listProjectEntries,
  readProjectDocument,
  unlinkProjectObjects,
  updateProjectDocument,
  type CreateProjectInput,
  type ProjectLinks,
  type UpdateProjectInput,
} from '@craft-agent/shared/projects'
import { pushTyped, type RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.projects.LIST,
  RPC_CHANNELS.projects.GET,
  RPC_CHANNELS.projects.CREATE,
  RPC_CHANNELS.projects.UPDATE,
  RPC_CHANNELS.projects.DELETE,
  RPC_CHANNELS.projects.LINK_OBJECTS,
  RPC_CHANNELS.projects.UNLINK_OBJECTS,
] as const

function broadcastProjectChanged(
  server: RpcServer,
  workspaceId: string,
  projectId: string,
  changeType: 'created' | 'updated' | 'deleted'
): void {
  pushTyped(
    server,
    RPC_CHANNELS.projects.CHANGED,
    { to: 'workspace', workspaceId },
    workspaceId,
    { projectId, changeType, timestamp: Date.now() }
  )
}

export function registerProjectsHandlers(server: RpcServer, deps: HandlerDeps): void {
  const { platform } = deps
  const log = platform.logger

  server.handle(RPC_CHANNELS.projects.LIST, async (_ctx, workspaceId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      return listProjectEntries(workspace.rootPath, workspaceId)
    } catch (error) {
      log.error('[projects] Failed to list projects:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.projects.GET, async (_ctx, workspaceId: string, projectId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const project = readProjectDocument(workspace.rootPath, projectId, workspaceId)
      if (!project) throw new Error('Project not found')
      return project
    } catch (error) {
      log.error('[projects] Failed to get project:', projectId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.projects.CREATE, async (_ctx, workspaceId: string, input: CreateProjectInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = createProjectDocument(workspace.rootPath, workspaceId, input)
      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to create project')
      }
      broadcastProjectChanged(server, workspaceId, result.project.id, 'created')
      return result.project
    } catch (error) {
      log.error('[projects] Failed to create project:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.projects.UPDATE, async (_ctx, workspaceId: string, projectId: string, input: UpdateProjectInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = updateProjectDocument(workspace.rootPath, projectId, input, workspaceId)
      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to update project')
      }
      broadcastProjectChanged(server, workspaceId, projectId, 'updated')
      return result.project
    } catch (error) {
      log.error('[projects] Failed to update project:', projectId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.projects.LINK_OBJECTS, async (_ctx, workspaceId: string, projectId: string, links: Partial<ProjectLinks>) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = linkProjectObjects(workspace.rootPath, projectId, links, workspaceId)
      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to link project objects')
      }
      broadcastProjectChanged(server, workspaceId, projectId, 'updated')
      return result.project
    } catch (error) {
      log.error('[projects] Failed to link project objects:', projectId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.projects.UNLINK_OBJECTS, async (_ctx, workspaceId: string, projectId: string, links: Partial<ProjectLinks>) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = unlinkProjectObjects(workspace.rootPath, projectId, links, workspaceId)
      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to unlink project objects')
      }
      broadcastProjectChanged(server, workspaceId, projectId, 'updated')
      return result.project
    } catch (error) {
      log.error('[projects] Failed to unlink project objects:', projectId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.projects.DELETE, async (_ctx, workspaceId: string, projectId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = deleteProjectDocument(workspace.rootPath, projectId, workspaceId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project')
      }
      broadcastProjectChanged(server, workspaceId, projectId, 'deleted')
      return { success: true }
    } catch (error) {
      log.error('[projects] Failed to delete project:', projectId, error)
      throw error
    }
  })
}
