/**
 * Notebooks RPC Handlers
 *
 * Handles workspace-scoped Notebook CRUD for durable knowledge surfaces.
 */

import { getWorkspaceByNameOrId } from '@craft-agent/shared/config'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  createNotebookDocument,
  deleteNotebookDocument,
  listNotebookEntries,
  readNotebookDocument,
  updateNotebookDocument,
  type CreateNotebookInput,
  type UpdateNotebookInput,
} from '@craft-agent/shared/notebooks'
import { pushTyped, type RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.notebooks.LIST,
  RPC_CHANNELS.notebooks.GET,
  RPC_CHANNELS.notebooks.CREATE,
  RPC_CHANNELS.notebooks.UPDATE,
  RPC_CHANNELS.notebooks.DELETE,
] as const

function broadcastNotebookChanged(
  server: RpcServer,
  workspaceId: string,
  notebookId: string,
  changeType: 'created' | 'updated' | 'deleted',
  timestamp: number
): void {
  pushTyped(
    server,
    RPC_CHANNELS.notebooks.CHANGED,
    { to: 'workspace', workspaceId },
    workspaceId,
    { notebookId, changeType, timestamp }
  )
}

export function registerNotebooksHandlers(server: RpcServer, deps: HandlerDeps): void {
  const { platform } = deps
  const log = platform.logger

  server.handle(RPC_CHANNELS.notebooks.LIST, async (_ctx, workspaceId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      return listNotebookEntries(workspace.rootPath, workspaceId)
    } catch (error) {
      log.error('[notebooks] Failed to list notebooks:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.notebooks.GET, async (_ctx, workspaceId: string, notebookId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const notebook = readNotebookDocument(workspace.rootPath, notebookId, workspaceId)
      if (!notebook) throw new Error('Notebook not found')
      return notebook
    } catch (error) {
      log.error('[notebooks] Failed to get notebook:', notebookId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.notebooks.CREATE, async (_ctx, workspaceId: string, input: CreateNotebookInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = createNotebookDocument(workspace.rootPath, workspaceId, input)
      if (!result.success || !result.notebook) {
        throw new Error(result.error || 'Failed to create notebook')
      }
      broadcastNotebookChanged(server, workspaceId, result.notebook.id, 'created', Date.now())
      return result.notebook
    } catch (error) {
      log.error('[notebooks] Failed to create notebook:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.notebooks.UPDATE, async (_ctx, workspaceId: string, notebookId: string, input: UpdateNotebookInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = updateNotebookDocument(workspace.rootPath, notebookId, input, workspaceId)
      if (!result.success || !result.notebook) {
        throw new Error(result.error || 'Failed to update notebook')
      }
      broadcastNotebookChanged(server, workspaceId, notebookId, 'updated', Date.now())
      return result.notebook
    } catch (error) {
      log.error('[notebooks] Failed to update notebook:', notebookId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.notebooks.DELETE, async (_ctx, workspaceId: string, notebookId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = deleteNotebookDocument(workspace.rootPath, notebookId, workspaceId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete notebook')
      }
      broadcastNotebookChanged(server, workspaceId, notebookId, 'deleted', Date.now())
      return { success: true }
    } catch (error) {
      log.error('[notebooks] Failed to delete notebook:', notebookId, error)
      throw error
    }
  })
}
