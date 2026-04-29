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
  bumpPageSaveGeneration,
  getPageSaveGeneration,
  initializePageListAtom,
  clearPageWorkspaceAtom,
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
  const clearPageWorkspace = useSetAtom(clearPageWorkspaceAtom)
  const handlePageChanged = useSetAtom(handlePageChangedAtom)

  useEffect(() => {
    if (workspaceId) {
      initializeList(workspaceId)
    } else {
      clearPageWorkspace()
    }
  }, [workspaceId, initializeList, clearPageWorkspace])

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
      (content: string, expectedSaveGeneration?: number) => {
        if (workspaceId && pageId) {
          return updateContent(workspaceId, pageId, content, expectedSaveGeneration)
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
        toast.success('Doc deleted')
      } else {
        toast.error('Failed to delete doc')
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
  const pendingIdentityRef = useRef<{ workspaceId: string; pageId: string; generation: number } | null>(null)
  const [hasPendingSave, setHasPendingSave] = useState(false)

  const cancelPendingSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (pendingIdentityRef.current) {
      bumpPageSaveGeneration(pendingIdentityRef.current.workspaceId, pendingIdentityRef.current.pageId)
    }
    pendingContentRef.current = null
    pendingIdentityRef.current = null
    setHasPendingSave(false)
  }, [])

  const debouncedSave = useCallback(
    (content: string) => {
      if (!workspaceId || !pageId) return
      const generation = bumpPageSaveGeneration(workspaceId, pageId)
      pendingContentRef.current = content
      pendingIdentityRef.current = { workspaceId, pageId, generation }
      setHasPendingSave(true)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        const pending = pendingIdentityRef.current
        if (
          pending &&
          pending.workspaceId === workspaceId &&
          pending.pageId === pageId &&
          getPageSaveGeneration(workspaceId, pageId) === pending.generation
        ) {
          saveContent(content, pending.generation)
        }
        pendingContentRef.current = null
        pendingIdentityRef.current = null
        debounceRef.current = null
        setHasPendingSave(false)
      }, delay)
    },
    [workspaceId, pageId, saveContent, delay]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (pendingIdentityRef.current) {
        bumpPageSaveGeneration(pendingIdentityRef.current.workspaceId, pendingIdentityRef.current.pageId)
      }
      pendingContentRef.current = null
      pendingIdentityRef.current = null
      setHasPendingSave(false)
    }
  }, [workspaceId, pageId])

  return {
    save: debouncedSave,
    saveImmediately: saveContent,
    cancelPendingSave,
    isSaving,
    isDirty: isDirty || hasPendingSave,
    hasPendingSave,
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
    cancelPendingSave: activePageSave.cancelPendingSave,
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
          toast.success('Doc created')
        } else {
          toast.error('Failed to create doc')
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
