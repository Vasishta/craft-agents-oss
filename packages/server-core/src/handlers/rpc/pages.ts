/**
 * Pages RPC Handlers
 *
 * Handles page document CRUD operations via RPC.
 * All operations are workspace-scoped.
 */

import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import { getWorkspaceByNameOrId } from '@craft-agent/shared/config'
import {
  createPageDocument,
  readPageDocument,
  updatePageDocument,
  updatePageContent,
  listPageDocuments,
  deletePageDocument,
  type CreatePageInput,
  type UpdatePageInput,
} from '@craft-agent/shared/pages'
import { pushTyped, type RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.pages.LIST,
  RPC_CHANNELS.pages.GET,
  RPC_CHANNELS.pages.CREATE,
  RPC_CHANNELS.pages.UPDATE,
  RPC_CHANNELS.pages.UPDATE_CONTENT,
  RPC_CHANNELS.pages.DELETE,
] as const

/**
 * Broadcast a page change event to all clients in a workspace.
 */
function broadcastPageChanged(
  server: RpcServer,
  workspaceId: string,
  pageId: string,
  changeType: 'created' | 'updated' | 'deleted'
): void {
  pushTyped(
    server,
    RPC_CHANNELS.pages.CHANGED,
    { to: 'workspace', workspaceId },
    workspaceId,
    { pageId, changeType, timestamp: Date.now() }
  )
}

export function registerPagesHandlers(server: RpcServer, deps: HandlerDeps): void {
  const { platform } = deps
  const log = platform.logger

  /**
   * List all pages for a workspace.
   * Returns page metadata without content for performance.
   */
  server.handle(RPC_CHANNELS.pages.LIST, async (_ctx, workspaceId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    try {
      const pages = listPageDocuments(workspace.rootPath, workspaceId)
      // Return pages without content for list view performance
      return pages.map(page => ({
        id: page.id,
        title: page.title,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        workspaceId: page.workspaceId,
        sourceSessionId: page.sourceSessionId,
        sourceMessageId: page.sourceMessageId,
        notebookId: page.notebookId,
        outputIdCount: page.outputIds?.length || 0,
      }))
    } catch (error) {
      log.error('[pages] Failed to list pages:', error)
      throw error
    }
  })

  /**
   * Get a single page by ID.
   * Hydrates content from the .md file.
   */
  server.handle(RPC_CHANNELS.pages.GET, async (_ctx, workspaceId: string, pageId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    try {
      const page = readPageDocument(workspace.rootPath, pageId, workspaceId)
      if (!page) {
        throw new Error('Doc not found')
      }
      return page
    } catch (error) {
      log.error('[pages] Failed to get page:', pageId, error)
      throw error
    }
  })

  /**
   * Create a new page document.
   */
  server.handle(RPC_CHANNELS.pages.CREATE, async (_ctx, workspaceId: string, input: CreatePageInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    try {
      const result = createPageDocument(workspace.rootPath, workspaceId, input)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create doc')
      }

      if (result.page) {
        broadcastPageChanged(server, workspaceId, result.page.id, 'created')
      }

      return result.page
    } catch (error) {
      log.error('[pages] Failed to create page:', error)
      throw error
    }
  })

  /**
   * Update page metadata (title, outputIds, etc.)
   * For content updates, use UPDATE_CONTENT instead.
   */
  server.handle(RPC_CHANNELS.pages.UPDATE, async (_ctx, workspaceId: string, pageId: string, input: UpdatePageInput) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    try {
      const result = updatePageDocument(workspace.rootPath, pageId, input)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update doc')
      }

      broadcastPageChanged(server, workspaceId, pageId, 'updated')

      return result.page
    } catch (error) {
      log.error('[pages] Failed to update page:', pageId, error)
      throw error
    }
  })

  /**
   * Update page content.
   * Optimized for frequent autosave operations.
   */
  server.handle(RPC_CHANNELS.pages.UPDATE_CONTENT, async (_ctx, workspaceId: string, pageId: string, content: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    try {
      const result = updatePageContent(workspace.rootPath, pageId, content)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update doc content')
      }

      // Debounce broadcasts for content updates?
      // For now, broadcast every update. The renderer can debounce UI updates.
      broadcastPageChanged(server, workspaceId, pageId, 'updated')

      return result.page
    } catch (error) {
      log.error('[pages] Failed to update page content:', pageId, error)
      throw error
    }
  })

  /**
   * Delete a page document.
   */
  server.handle(RPC_CHANNELS.pages.DELETE, async (_ctx, workspaceId: string, pageId: string) => {
    const workspace = getWorkspaceByNameOrId(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    try {
      const result = deletePageDocument(workspace.rootPath, pageId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete doc')
      }

      broadcastPageChanged(server, workspaceId, pageId, 'deleted')

      return { success: true }
    } catch (error) {
      log.error('[pages] Failed to delete page:', pageId, error)
      throw error
    }
  })
}
