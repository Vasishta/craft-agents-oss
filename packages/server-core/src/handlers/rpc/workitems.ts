/**
 * WorkItems RPC Handlers
 *
 * Handles workspace-scoped WorkItem CRUD for the Work Queue surface.
 */

import { getWorkspaceByNameOrId } from '@craft-agent/shared/config'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  createWorkItemDocument,
  deleteWorkItemDocument,
  listWorkItemEntries,
  readWorkItemDocument,
  updateWorkItemDocument,
  type CreateWorkItemInput,
  type UpdateWorkItemInput,
} from '@craft-agent/shared/workitems'
import { pushTyped, type RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.workItems.LIST,
  RPC_CHANNELS.workItems.GET,
  RPC_CHANNELS.workItems.CREATE,
  RPC_CHANNELS.workItems.UPDATE,
  RPC_CHANNELS.workItems.DELETE,
] as const

function broadcastWorkItemChanged(
  server: RpcServer,
  workspaceId: string,
  workItemId: string,
  changeType: 'created' | 'updated' | 'deleted',
  timestamp: number
): void {
  pushTyped(
    server,
    RPC_CHANNELS.workItems.CHANGED,
    { to: 'workspace', workspaceId },
    workspaceId,
    { workItemId, changeType, timestamp }
  )
}

export function registerWorkItemsHandlers(server: RpcServer, deps: HandlerDeps): void {
  const { platform } = deps
  const log = platform.logger

  server.handle(RPC_CHANNELS.workItems.LIST, async (_ctx, workspaceId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      return listWorkItemEntries(workspace.rootPath, workspaceId)
    } catch (error) {
      log.error('[workitems] Failed to list work items:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.workItems.GET, async (_ctx, workspaceId: string, workItemId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const workItem = readWorkItemDocument(workspace.rootPath, workItemId, workspaceId)
      if (!workItem) throw new Error('WorkItem not found')
      return workItem
    } catch (error) {
      log.error('[workitems] Failed to get work item:', workItemId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.workItems.CREATE, async (_ctx, workspaceId: string, input: CreateWorkItemInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = createWorkItemDocument(workspace.rootPath, workspaceId, input)
      if (!result.success || !result.workItem) {
        throw new Error(result.error || 'Failed to create work item')
      }
      broadcastWorkItemChanged(server, workspaceId, result.workItem.id, 'created', Date.now())
      return result.workItem
    } catch (error) {
      log.error('[workitems] Failed to create work item:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.workItems.UPDATE, async (_ctx, workspaceId: string, workItemId: string, input: UpdateWorkItemInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = updateWorkItemDocument(workspace.rootPath, workItemId, input, workspaceId)
      if (!result.success || !result.workItem) {
        throw new Error(result.error || 'Failed to update work item')
      }
      broadcastWorkItemChanged(server, workspaceId, workItemId, 'updated', Date.now())
      return result.workItem
    } catch (error) {
      log.error('[workitems] Failed to update work item:', workItemId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.workItems.DELETE, async (_ctx, workspaceId: string, workItemId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = deleteWorkItemDocument(workspace.rootPath, workItemId, workspaceId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete work item')
      }
      broadcastWorkItemChanged(server, workspaceId, workItemId, 'deleted', Date.now())
      return { success: true }
    } catch (error) {
      log.error('[workitems] Failed to delete work item:', workItemId, error)
      throw error
    }
  })
}
