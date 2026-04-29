/**
 * Pages Hook
 *
 * Provides a convenient interface for page CRUD operations
 * with integrated loading states and error handling.
 * Includes live sync via pages.CHANGED events.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { toast } from 'sonner'
import { atom } from 'jotai'
import {
  pageListAtom,
  activePageIdAtom,
  pageAtomFamily,
  pageLoadingStateAtom,
  pageErrorAtom,
  pageDirtyAtom,
  initializePageListAtom,
  createPageAtom,
  loadPageAtom,
  updatePageContentAtom,
  updatePageMetadataAtom,
  deletePageAtom,
  setActivePageAtom,
  createPageFromMessageAtom,
  handlePageChangedAtom,
} from '@/atoms/pages'
import type { PageDocument, PageListEntry } from '../../shared/types'

export function usePageList(workspaceId: string | null) {
  const pages = useAtomValue(pageListAtom)
  const initializeList = useSetAtom(initializePageListAtom)
  const handlePageChanged = useSetAtom(handlePageChangedAtom)

  useEffect(() => {
    if (workspaceId) {
      initializeList(workspaceId)
    }
  }, [workspaceId, initializeList])

  useEffect(() => {
    if (!workspaceId) return
    const cleanup = window.electronAPI.onPagesChanged((changedWorkspaceId, data) => {
      if (changedWorkspaceId === workspaceId) {
        handlePageChanged(data.pageId, data.changeType)
      }
    })
    return cleanup
  }, [workspaceId, handlePageChanged])

  return {
    pages,
    refresh: useCallback(() => {
      if (workspaceId) {
        initializeList(workspaceId)
      }
    }, [workspaceId, initializeList]),
  }
}

export function usePage(workspaceId: string, pageId: string | null) {
  const page = useAtomValue(pageId ? pageAtomFamily(pageId) : atom(null))
  const loadingState = useAtomValue(pageId ? pageLoadingStateAtom(pageId) : atom('idle' as const))
  const error = useAtomValue(pageId ? pageErrorAtom(pageId) : atom(null))
  const isDirty = useAtomValue(pageId ? pageDirtyAtom(pageId) : atom(false))
  const loadPage = useSetAtom(loadPageAtom)
  const updateContent = useSetAtom(updatePageContentAtom)
  const updateMetadata = useSetAtom(updatePageMetadataAtom)

  useEffect(() => {
    if (workspaceId && pageId) {
      loadPage(workspaceId, pageId)
    }
  }, [workspaceId, pageId, loadPage])

  return {
    page,
    loadingState,
    error,
    isDirty,
    isLoading: loadingState === 'loading',
    isSaving: loadingState === 'saving',
    reload: useCallback(() => {
      if (workspaceId && pageId) {
        loadPage(workspaceId, pageId)
      }
    }, [workspaceId, pageId, loadPage]),
    saveContent: useCallback(
      (content: string) => {
        if (workspaceId && pageId) {
          return updateContent(workspaceId, pageId, content)
        }
      },
      [workspaceId, pageId, updateContent]
    ),
    updateTitle: useCallback(
      (title: string) => {
        if (workspaceId && pageId) {
          return updateMetadata(workspaceId, pageId, { title })
        }
      },
      [workspaceId, pageId, updateMetadata]
    ),
  }
}

export function useCreatePage(workspaceId: string) {
  const createPage = useSetAtom(createPageAtom)
  const createFromMessage = useSetAtom(createPageFromMessageAtom)

  return {
    createPage: useCallback(
      (input: { title?: string; content?: string; sourceSessionId?: string; sourceMessageId?: string; notebookId?: string }) => {
        return createPage(workspaceId, input)
      },
      [workspaceId, createPage]
    ),
    createFromMessage: useCallback(
      (sessionId: string, messageId: string, content: string, title?: string) => {
        return createFromMessage(workspaceId, sessionId, messageId, content, title)
      },
      [workspaceId, createFromMessage]
    ),
  }
}

export function useDeletePage(workspaceId: string) {
  const deletePage = useSetAtom(deletePageAtom)
  return useCallback(
    async (pageId: string) => {
      const success = await deletePage(workspaceId, pageId)
      if (success) {
        toast.success('Page deleted')
      } else {
        toast.error('Failed to delete page')
      }
      return success
    },
    [workspaceId, deletePage]
  )
}

export function useActivePage(workspaceId: string) {
  const [activePageId, setActiveId] = useAtom(activePageIdAtom)
  const setActivePage = useSetAtom(setActivePageAtom)

  return {
    activePageId,
    setActivePage: useCallback(
      (pageId: string | null) => {
        setActivePage(workspaceId, pageId)
      },
      [workspaceId, setActivePage]
    ),
    clearActivePage: useCallback(() => {
      setActiveId(null)
    }, [setActiveId]),
  }
}

export function useDebouncedPageSave(workspaceId: string, pageId: string | null, delay: number = 500) {
  const { saveContent, isSaving, isDirty } = usePage(workspaceId, pageId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<string | null>(null)

  const debouncedSave = useCallback(
    (content: string) => {
      pendingContentRef.current = content
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        saveContent(content)
        pendingContentRef.current = null
        debounceRef.current = null
      }, delay)
    },
    [saveContent, delay]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      // Flush any pending content so the last edit is not lost
      if (pendingContentRef.current !== null) {
        saveContent(pendingContentRef.current)
        pendingContentRef.current = null
      }
    }
  }, [saveContent])

  return {
    save: debouncedSave,
    saveImmediately: saveContent,
    isSaving,
    isDirty,
  }
}

export function usePages(workspaceId: string) {
  const { pages, refresh } = usePageList(workspaceId)
  const { activePageId, setActivePage, clearActivePage } = useActivePage(workspaceId)
  const { createPage, createFromMessage } = useCreatePage(workspaceId)
  const deletePage = useDeletePage(workspaceId)
  const activePage = usePage(workspaceId, activePageId)
  const activePageSave = useDebouncedPageSave(workspaceId, activePageId)

  return {
    pages,
    refresh,
    activePageId,
    activePage,
    setActivePage,
    clearActivePage,
    createPage,
    createFromMessage,
    deletePage,
    saveContent: activePageSave.save,
    saveImmediately: activePageSave.saveImmediately,
    isSaving: activePageSave.isSaving,
    isDirty: activePageSave.isDirty,
  }
}

export function useCreatePageFromMessage(workspaceId: string) {
  const { createFromMessage } = useCreatePage(workspaceId)
  const [isCreating, setIsCreating] = useState(false)

  const openCanvas = useCallback(
    async (sessionId: string, messageId: string, content: string, title?: string) => {
      setIsCreating(true)
      try {
        const page = await createFromMessage(sessionId, messageId, content, title)
        if (page) {
          toast.success('Page created')
        } else {
          toast.error('Failed to create page')
        }
        return page
      } finally {
        setIsCreating(false)
      }
    },
    [createFromMessage]
  )

  return { openCanvas, isCreating }
}
