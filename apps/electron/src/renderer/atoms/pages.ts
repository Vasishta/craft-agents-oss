/**
 * Per-Page State Management with Jotai
 *
 * Uses atomFamily to create isolated atoms per page.
 * Updates to one page don't trigger re-renders in other pages.
 *
 * This enables efficient management of multiple pages with autosave.
 */

import { atom } from 'jotai'
import type { Getter, Setter } from 'jotai/vanilla'
import { atomFamily } from 'jotai-family'
import type { PageDocument, PageListEntry } from '@craft-agent/shared/protocol'

/**
 * Page document atom family - each page gets its own atom
 * Updates are isolated per page for performance
 */
export const pageAtomFamily = atomFamily(
  (_pageId: string) => atom<PageDocument | null>(null),
  (a, b) => a === b
)

/**
 * Page list atom - metadata for all pages in current workspace
 * Lightweight entries without full content
 */
export const pageListAtom = atom<PageListEntry[]>([])

/**
 * Currently active page ID - the page being viewed/edited
 */
export const activePageIdAtom = atom<string | null>(null)

/**
 * Page loading states
 */
export const pageLoadingStateAtom = atomFamily(
  (_pageId: string) => atom<'idle' | 'loading' | 'saving' | 'error'>('idle'),
  (a, b) => a === b
)

/**
 * Page error states
 */
export const pageErrorAtom = atomFamily(
  (_pageId: string) => atom<string | null>(null),
  (a, b) => a === b
)

/**
 * Dirty state tracking for autosave
 * True if page has unsaved changes
 */
export const pageDirtyAtom = atomFamily(
  (_pageId: string) => atom<boolean>(false),
  (a, b) => a === b
)

/**
 * Action atom: Initialize page list from server
 */
export const initializePageListAtom = atom(
  null,
  async (_get: Getter, set: Setter, workspaceId: string): Promise<void> => {
    try {
      const pages = await window.electronAPI.listPages(workspaceId)
      set(pageListAtom, pages)
    } catch (error) {
      console.error('[pages] Failed to load page list:', error)
    }
  }
)

/**
 * Action atom: Load a single page by ID
 * Hydrates content from the .md file via RPC
 */
export const loadPageAtom = atom(
  null,
  async (_get: Getter, set: Setter, workspaceId: string, pageId: string): Promise<PageDocument | null> => {
    try {
      set(pageLoadingStateAtom(pageId), 'loading')
      set(pageErrorAtom(pageId), null)

      const page = await window.electronAPI.getPage(workspaceId, pageId)

      if (page) {
        set(pageAtomFamily(pageId), page)
        set(pageDirtyAtom(pageId), false)
      }

      set(pageLoadingStateAtom(pageId), 'idle')
      return page
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load page'
      set(pageErrorAtom(pageId), errorMessage)
      set(pageLoadingStateAtom(pageId), 'error')
      return null
    }
  }
)

/**
 * Action atom: Create a new page
 * Automatically loads the created page
 */
export const createPageAtom = atom(
  null,
  async (
    get: Getter,
    set: Setter,
    workspaceId: string,
    input: {
      title?: string
      content?: string
      sourceSessionId?: string
      sourceMessageId?: string
      notebookId?: string
    }
  ): Promise<PageDocument | null> => {
    try {
      const page = await window.electronAPI.createPage(workspaceId, input)

      if (page) {
        // Add to page list
        const currentList = get(pageListAtom)
        const listEntry: PageListEntry = {
          id: page.id,
          title: page.title,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          workspaceId: page.workspaceId,
          sourceSessionId: page.sourceSessionId,
          sourceMessageId: page.sourceMessageId,
          notebookId: page.notebookId,
          outputIdCount: page.outputIds?.length || 0,
        }
        set(pageListAtom, [listEntry, ...currentList])

        // Set as active page
        set(activePageIdAtom, page.id)

        // Load the full page
        set(pageAtomFamily(page.id), page)
        set(pageDirtyAtom(page.id), false)
      }

      return page
    } catch (error) {
      console.error('[pages] Failed to create page:', error)
      return null
    }
  }
)

/**
 * Action atom: Update page content with debounced autosave
 * Optimistic update + background save
 */
export const updatePageContentAtom = atom(
  null,
  async (
    get: Getter,
    set: Setter,
    workspaceId: string,
    pageId: string,
    content: string
  ): Promise<void> => {
    // Optimistic update - update local state immediately
    const currentPage = get(pageAtomFamily(pageId))
    if (currentPage) {
      set(pageAtomFamily(pageId), {
        ...currentPage,
        content,
        updatedAt: Date.now(),
      })
      set(pageDirtyAtom(pageId), true)
    }

    // Background save
    try {
      set(pageLoadingStateAtom(pageId), 'saving')

      const updatedPage = await window.electronAPI.updatePageContent(workspaceId, pageId, content)

      if (updatedPage) {
        // Update with server response (may have new title from content extraction)
        set(pageAtomFamily(pageId), updatedPage)
        set(pageDirtyAtom(pageId), false)

        // Update list entry
        const currentList = get(pageListAtom)
        const listIndex = currentList.findIndex(p => p.id === pageId)
        if (listIndex !== -1) {
          const updatedList = [...currentList]
          updatedList[listIndex] = {
            ...updatedList[listIndex],
            title: updatedPage.title,
            updatedAt: updatedPage.updatedAt,
          }
          set(pageListAtom, updatedList)
        }
      }

      set(pageLoadingStateAtom(pageId), 'idle')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save page'
      set(pageErrorAtom(pageId), errorMessage)
      set(pageLoadingStateAtom(pageId), 'error')
      // Page remains dirty for retry
    }
  }
)

/**
 * Action atom: Update page metadata (title, outputIds, etc.)
 * Not for content updates - use updatePageContentAtom for that
 */
export const updatePageMetadataAtom = atom(
  null,
  async (
    get: Getter,
    set: Setter,
    workspaceId: string,
    pageId: string,
    updates: { title?: string; outputIds?: string[] }
  ): Promise<PageDocument | null> => {
    try {
      const updatedPage = await window.electronAPI.updatePage(workspaceId, pageId, updates)

      if (updatedPage) {
        // Update local state
        const currentPage = get(pageAtomFamily(pageId))
        if (currentPage) {
          set(pageAtomFamily(pageId), {
            ...currentPage,
            ...updates,
            updatedAt: updatedPage.updatedAt,
          })
        }

        // Update list entry
        const currentList = get(pageListAtom)
        const listIndex = currentList.findIndex(p => p.id === pageId)
        if (listIndex !== -1) {
          const updatedList = [...currentList]
          updatedList[listIndex] = {
            ...updatedList[listIndex],
            title: updates.title || updatedList[listIndex].title,
            updatedAt: updatedPage.updatedAt,
          }
          set(pageListAtom, updatedList)
        }
      }

      return updatedPage
    } catch (error) {
      console.error('[pages] Failed to update page metadata:', error)
      return null
    }
  }
)

/**
 * Action atom: Delete a page
 */
export const deletePageAtom = atom(
  null,
  async (
    get: Getter,
    set: Setter,
    workspaceId: string,
    pageId: string
  ): Promise<boolean> => {
    try {
      await window.electronAPI.deletePage(workspaceId, pageId)

      // Remove from local state
      pageAtomFamily.remove(pageId)
      pageLoadingStateAtom.remove(pageId)
      pageErrorAtom.remove(pageId)
      pageDirtyAtom.remove(pageId)

      // Remove from list
      const currentList = get(pageListAtom)
      set(pageListAtom, currentList.filter(p => p.id !== pageId))

      // Clear active if this was the active page
      const activeId = get(activePageIdAtom)
      if (activeId === pageId) {
        set(activePageIdAtom, null)
      }

      return true
    } catch (error) {
      console.error('[pages] Failed to delete page:', error)
      return false
    
    }
  }
)

/**
 * Action atom: Handle page changed event from server
 * Updates local state when another client modifies a page
 */
export const handlePageChangedAtom = atom(
  null,
  async (
    get: Getter,
    set: Setter,
    pageId: string,
    changeType: 'created' | 'updated' | 'deleted'
  ): Promise<void> => {
    if (changeType === 'deleted') {
      // Clean up local state
      pageAtomFamily.remove(pageId)
      pageLoadingStateAtom.remove(pageId)
      pageErrorAtom.remove(pageId)
      pageDirtyAtom.remove(pageId)

      // Remove from list
      const currentList = get(pageListAtom)
      set(pageListAtom, currentList.filter(p => p.id !== pageId))

      // Clear active if this was the active page
      const activeId = get(activePageIdAtom)
      if (activeId === pageId) {
        set(activePageIdAtom, null)
      }
    } else {
      // Reload page metadata (don't reload content unless currently viewing)
      const activeId = get(activePageIdAtom)
      if (activeId === pageId && changeType === 'updated') {
        // Only reload if we're viewing this page and it's not dirty
        const isDirty = get(pageDirtyAtom(pageId))
        if (!isDirty) {
          // Get workspace ID from current page
          const currentPage = get(pageAtomFamily(pageId))
          if (currentPage) {
            // Reload in background
            await set(loadPageAtom, currentPage.workspaceId, pageId)
          }
        }
      }
    }
  }
)

/**
 * Action atom: Set active page
 * Handles loading the page if not already loaded
 */
export const setActivePageAtom = atom(
  null,
  async (
    get: Getter,
    set: Setter,
    workspaceId: string,
    pageId: string | null
  ): Promise<void> => {
    set(activePageIdAtom, pageId)

    if (pageId) {
      const currentPage = get(pageAtomFamily(pageId))
      if (!currentPage) {
        // Page not loaded yet, load it
        await set(loadPageAtom, workspaceId, pageId)
      }
    }
  }
)

/**
 * Create a page from a session message
 * This is the primary entry point for the "Open canvas" flow
 */
export const createPageFromMessageAtom = atom(
  null,
  async (
    _get: Getter,
    set: Setter,
    workspaceId: string,
    sessionId: string,
    messageId: string,
    content: string,
    title?: string
  ): Promise<PageDocument | null> => {
    return set(createPageAtom, workspaceId, {
      title,
      content,
      sourceSessionId: sessionId,
      sourceMessageId: messageId,
    })
  }
)
