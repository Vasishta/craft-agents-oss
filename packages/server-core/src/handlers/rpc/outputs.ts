import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import { getWorkspaceByNameOrId } from '@craft-agent/shared/config'
import {
  createOutputDocument,
  deleteOutputDocument,
  listOutputEntries,
  promoteOutputToPageDocument,
  readOutputDocument,
  updateOutputDocument,
  type CreateOutputInput,
  type UpdateOutputInput,
} from '@craft-agent/shared/outputs'
import { pushTyped, type RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.outputs.LIST,
  RPC_CHANNELS.outputs.GET,
  RPC_CHANNELS.outputs.CREATE,
  RPC_CHANNELS.outputs.UPDATE,
  RPC_CHANNELS.outputs.DELETE,
  RPC_CHANNELS.outputs.PROMOTE_TO_DOC,
] as const

function broadcastOutputChanged(
  server: RpcServer,
  workspaceId: string,
  outputId: string,
  changeType: 'created' | 'updated' | 'deleted' | 'promoted'
): void {
  pushTyped(
    server,
    RPC_CHANNELS.outputs.CHANGED,
    { to: 'workspace', workspaceId },
    workspaceId,
    { outputId, changeType, timestamp: Date.now() }
  )
}

export function registerOutputsHandlers(server: RpcServer, deps: HandlerDeps): void {
  const { platform } = deps
  const log = platform.logger

  server.handle(RPC_CHANNELS.outputs.LIST, async (_ctx, workspaceId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      return listOutputEntries(workspace.rootPath, workspaceId)
    } catch (error) {
      log.error('[outputs] Failed to list outputs:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.outputs.GET, async (_ctx, workspaceId: string, outputId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const output = readOutputDocument(workspace.rootPath, outputId, workspaceId)
      if (!output) throw new Error('Output not found')
      return output
    } catch (error) {
      log.error('[outputs] Failed to get output:', outputId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.outputs.CREATE, async (_ctx, workspaceId: string, input: CreateOutputInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = createOutputDocument(workspace.rootPath, workspaceId, input)
      if (!result.success || !result.output) {
        throw new Error(result.error || 'Failed to create output')
      }
      broadcastOutputChanged(server, workspaceId, result.output.id, 'created')
      return result.output
    } catch (error) {
      log.error('[outputs] Failed to create output:', error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.outputs.UPDATE, async (_ctx, workspaceId: string, outputId: string, input: UpdateOutputInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = updateOutputDocument(workspace.rootPath, outputId, input, workspaceId)
      if (!result.success || !result.output) {
        throw new Error(result.error || 'Failed to update output')
      }
      broadcastOutputChanged(server, workspaceId, outputId, 'updated')
      return result.output
    } catch (error) {
      log.error('[outputs] Failed to update output:', outputId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.outputs.DELETE, async (_ctx, workspaceId: string, outputId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = deleteOutputDocument(workspace.rootPath, outputId, workspaceId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete output')
      }
      broadcastOutputChanged(server, workspaceId, outputId, 'deleted')
      return { success: true }
    } catch (error) {
      log.error('[outputs] Failed to delete output:', outputId, error)
      throw error
    }
  })

  server.handle(RPC_CHANNELS.outputs.PROMOTE_TO_DOC, async (_ctx, workspaceId: string, outputId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    try {
      const result = promoteOutputToPageDocument(workspace.rootPath, workspaceId, outputId)
      if (!result.success || !result.output || !result.page) {
        throw new Error(result.error || 'Failed to promote output')
      }
      broadcastOutputChanged(server, workspaceId, outputId, 'promoted')
      pushTyped(
        server,
        RPC_CHANNELS.pages.CHANGED,
        { to: 'workspace', workspaceId },
        workspaceId,
        { pageId: result.page.id, changeType: 'created', timestamp: Date.now() }
      )
      return result.page
    } catch (error) {
      log.error('[outputs] Failed to promote output:', outputId, error)
      throw error
    }
  })
}
