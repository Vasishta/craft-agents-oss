/**
 * Decisions RPC Handlers
 *
 * Handles workspace-scoped Decision CRUD for durable knowledge surfaces.
 */

import { getWorkspaceByNameOrId } from '@craft-agent/shared/config'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import {
  createDecisionDocument,
  deleteDecisionDocument,
  listDecisionEntries,
  readDecisionDocument,
  updateDecisionDocument,
  type CreateDecisionInput,
  type UpdateDecisionInput,
} from '@craft-agent/shared/decisions'
import { pushTyped, type RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.decisions.LIST,
  RPC_CHANNELS.decisions.GET,
  RPC_CHANNELS.decisions.CREATE,
  RPC_CHANNELS.decisions.UPDATE,
  RPC_CHANNELS.decisions.DELETE,
] as const

function broadcastDecisionChanged(
  server: RpcServer,
  workspaceId: string,
  decisionId: string,
  changeType: 'created' | 'updated' | 'deleted',
  timestamp: number
): void {
  pushTyped(
    server,
    RPC_CHANNELS.decisions.CHANGED,
    { to: 'workspace', workspaceId },
    workspaceId,
    { decisionId, changeType, timestamp }
  )
}

export function registerDecisionsHandlers(server: RpcServer, deps: HandlerDeps): void {
  const { platform } = deps
  const log = platform.logger

  server.handle(RPC_CHANNELS.decisions.LIST, async (_ctx, workspaceId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      return listDecisionEntries(workspace.rootPath, workspaceId)
    } catch (error) {
      log.error('[decisions] Failed to list decisions:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.decisions.GET, async (_ctx, workspaceId: string, decisionId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const decision = readDecisionDocument(workspace.rootPath, decisionId, workspaceId)
      if (!decision) throw new Error('Decision not found')
      return decision
    } catch (error) {
      log.error('[decisions] Failed to get decision:', decisionId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.decisions.CREATE, async (_ctx, workspaceId: string, input: CreateDecisionInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = createDecisionDocument(workspace.rootPath, workspaceId, input)
      if (!result.success || !result.decision) {
        throw new Error(result.error || 'Failed to create decision')
      }
      broadcastDecisionChanged(server, workspaceId, result.decision.id, 'created', Date.now())
      return result.decision
    } catch (error) {
      log.error('[decisions] Failed to create decision:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.decisions.UPDATE, async (_ctx, workspaceId: string, decisionId: string, input: UpdateDecisionInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = updateDecisionDocument(workspace.rootPath, decisionId, input, workspaceId)
      if (!result.success || !result.decision) {
        throw new Error(result.error || 'Failed to update decision')
      }
      broadcastDecisionChanged(server, workspaceId, decisionId, 'updated', Date.now())
      return result.decision
    } catch (error) {
      log.error('[decisions] Failed to update decision:', decisionId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.decisions.DELETE, async (_ctx, workspaceId: string, decisionId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = deleteDecisionDocument(workspace.rootPath, decisionId, workspaceId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete decision')
      }
      broadcastDecisionChanged(server, workspaceId, decisionId, 'deleted', Date.now())
      return { success: true }
    } catch (error) {
      log.error('[decisions] Failed to delete decision:', decisionId, error)
      throw error
    }
  })
}
