import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import type {
  PageDocument,
  PageIndex,
  CreatePageInput,
  UpdatePageInput,
  PageListEntry,
  CreatePageResult,
  UpdatePageResult,
  DeletePageResult,
} from './types'
import { readJsonFileSync, atomicWriteFileSync } from '../utils/files'
import { debug } from '../utils/debug'
import { mutateSerializedLocalIndex, trySaveLocalIndex } from '../utils/local-index'

const PAGES_DIR = 'pages'
const PAGE_INDEX_FILE = 'pages/index.json'
const PAGE_INDEX_LOCK_FILE = 'pages/index.json.lock'
const CURRENT_INDEX_VERSION = 1
const SAFE_PAGE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function getPageMarkdownPath(workspaceRootPath: string, pageId: string): string {
  assertSafePageId(pageId)
  const pagesDir = resolve(getPagesDirectoryPath(workspaceRootPath))
  const mdPath = resolve(pagesDir, `${pageId}.md`)
  assertPathInsideDirectory(mdPath, pagesDir)
  return mdPath
}

export function getPageIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PAGE_INDEX_FILE)
}

export function getPageIndexLockPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PAGE_INDEX_LOCK_FILE)
}

export function getPagesDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PAGES_DIR)
}

export function isSafePageId(pageId: string): boolean {
  return SAFE_PAGE_ID_PATTERN.test(pageId)
}

export function assertSafePageId(pageId: string): void {
  if (
    !pageId ||
    !isSafePageId(pageId) ||
    pageId.includes('..') ||
    pageId.includes('/') ||
    pageId.includes('\\') ||
    pageId !== basename(pageId) ||
    resolve(pageId) === pageId
  ) {
    throw new Error('Invalid doc ID')
  }
}

function assertPathInsideDirectory(filePath: string, directoryPath: string): void {
  const relativePath = relative(directoryPath, filePath)
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes('..') || resolve(relativePath) === relativePath) {
    throw new Error('Invalid doc path')
  }
}

export function ensurePagesDirectory(workspaceRootPath: string): void {
  const pagesDir = getPagesDirectoryPath(workspaceRootPath)
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true })
    debug('[page-storage] Created pages directory:', pagesDir)
  }
}

export function extractTitleFromContent(content: string): string {
  if (!content || !content.trim()) {
    return 'Untitled Doc'
  }
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match?.[1]) return h1Match[1].trim().slice(0, 200)
  const h2Match = content.match(/^##\s+(.+)$/m)
  if (h2Match?.[1]) return h2Match[1].trim().slice(0, 200)
  const h3Match = content.match(/^###\s+(.+)$/m)
  if (h3Match?.[1]) return h3Match[1].trim().slice(0, 200)
  const firstLine = content.split('\n').find(line => line.trim())
  if (firstLine) return firstLine.trim().slice(0, 200)
  return 'Untitled Doc'
}

export function loadPageIndex(workspaceRootPath: string, workspaceId?: string): PageIndex {
  const indexPath = getPageIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    debug('[page-storage] No index found, attempting rebuild')
    return rebuildPageIndex(workspaceRootPath, workspaceId)
  }
  try {
    const index = readJsonFileSync<PageIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.pages)) {
      debug('[page-storage] Invalid index structure, attempting rebuild')
      return rebuildPageIndex(workspaceRootPath, workspaceId)
    }
    if (index.version !== CURRENT_INDEX_VERSION) {
      debug('[page-storage] Migrating index from version', index.version, 'to', CURRENT_INDEX_VERSION)
      index.version = CURRENT_INDEX_VERSION
    }
    return repairPageIndex(workspaceRootPath, index, workspaceId)
  } catch (error) {
    debug('[page-storage] Failed to load index, attempting rebuild:', error)
    return rebuildPageIndex(workspaceRootPath, workspaceId)
  }
}

export function savePageIndex(workspaceRootPath: string, index: PageIndex): void {
  ensurePagesDirectory(workspaceRootPath)
  const indexPath = getPageIndexPath(workspaceRootPath)
  try {
    atomicWriteFileSync(indexPath, JSON.stringify(index, null, 2))
  } catch (error) {
    debug('[page-storage] Failed to save index:', error)
    throw error
  }
}

function mutatePageIndex<TResult>(workspaceRootPath: string, mutation: (index: PageIndex) => TResult): TResult {
  return mutateSerializedLocalIndex(
    {
      label: 'page-storage',
      lockPath: getPageIndexLockPath(workspaceRootPath),
      ensureDirectory: () => ensurePagesDirectory(workspaceRootPath),
      loadIndex: () => loadPageIndex(workspaceRootPath),
      saveIndex: index => savePageIndex(workspaceRootPath, index),
    },
    mutation
  )
}

function getFallbackPageMetadata(workspaceRootPath: string, pageId: string, workspaceId?: string): PageDocument | null {
  try {
    assertSafePageId(pageId)
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    const content = readFileSync(mdPath, 'utf-8')
    const stats = statSync(mdPath)
    const createdAt = stats.birthtimeMs || stats.ctimeMs || Date.now()
    const updatedAt = stats.mtimeMs || Date.now()
    return {
      id: pageId,
      title: extractTitleFromContent(content),
      content,
      createdAt,
      updatedAt,
      workspaceId: workspaceId || '',
    }
  } catch (error) {
    debug('[page-storage] Failed to build fallback page metadata:', pageId, error)
    return null
  }
}

function scanMarkdownPages(workspaceRootPath: string, workspaceId?: string): PageDocument[] {
  ensurePagesDirectory(workspaceRootPath)
  const pagesDir = getPagesDirectoryPath(workspaceRootPath)
  const pages: PageDocument[] = []
  try {
    const entries = readdirSync(pagesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const pageId = entry.name.slice(0, -3)
      if (!isSafePageId(pageId)) {
        debug('[page-storage] Skipping unsafe markdown filename during rebuild:', entry.name)
        continue
      }
      const page = getFallbackPageMetadata(workspaceRootPath, pageId, workspaceId)
      if (page) {
        pages.push(page)
      }
    }
  } catch (error) {
    debug('[page-storage] Failed to scan pages directory during rebuild:', error)
  }
  return pages
}

function repairPageIndex(workspaceRootPath: string, index: PageIndex, workspaceId?: string): PageIndex {
  const repaired: PageIndex = { version: CURRENT_INDEX_VERSION, pages: [] }
  let changed = index.version !== CURRENT_INDEX_VERSION
  const seen = new Set<string>()

  for (const page of index.pages) {
    if (!page || typeof page.id !== 'string' || !isSafePageId(page.id) || seen.has(page.id)) {
      changed = true
      continue
    }
    const mdPath = getPageMarkdownPath(workspaceRootPath, page.id)
    if (!existsSync(mdPath)) {
      changed = true
      continue
    }
    repaired.pages.push({
      ...page,
      workspaceId: page.workspaceId || workspaceId || '',
    })
    seen.add(page.id)
  }

  for (const page of scanMarkdownPages(workspaceRootPath, workspaceId)) {
    if (seen.has(page.id)) continue
    repaired.pages.push(page)
    seen.add(page.id)
    changed = true
  }

  if (changed) {
    trySaveLocalIndex('page-storage', () => savePageIndex(workspaceRootPath, repaired))
  }
  return repaired
}

export function rebuildPageIndex(workspaceRootPath: string, workspaceId?: string): PageIndex {
  const pages = scanMarkdownPages(workspaceRootPath, workspaceId)
  const index: PageIndex = { version: CURRENT_INDEX_VERSION, pages }
  trySaveLocalIndex('page-storage', () => savePageIndex(workspaceRootPath, index))
  return index
}

export function readPageDocument(
  workspaceRootPath: string,
  pageId: string,
  workspaceId?: string
): PageDocument | null {
  const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
  if (!existsSync(mdPath)) {
    debug('[page-storage] Page markdown not found:', pageId)
    return null
  }
  const index = loadPageIndex(workspaceRootPath, workspaceId)
  const indexEntry = index.pages.find(p => p.id === pageId)
  if (workspaceId && indexEntry?.workspaceId && indexEntry.workspaceId !== workspaceId) {
    debug('[page-storage] Page workspace mismatch:', pageId)
    return null
  }
  try {
    const content = readFileSync(mdPath, 'utf-8')
    if (indexEntry) {
      return { ...indexEntry, content }
    }
    debug('[page-storage] Page found on disk but not in index, creating entry:', pageId)
    const page: PageDocument = {
      id: pageId,
      title: extractTitleFromContent(content),
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspaceId: workspaceId || '',
    }
    mutatePageIndex(workspaceRootPath, latestIndex => {
      const existingIndex = latestIndex.pages.findIndex(p => p.id === pageId)
      if (existingIndex === -1) {
        latestIndex.pages.push(page)
      } else {
        latestIndex.pages[existingIndex] = page
      }
    })
    return page
  } catch (error) {
    debug('[page-storage] Failed to read page:', pageId, error)
    return null
  }
}

export function createPageDocument(
  workspaceRootPath: string,
  workspaceId: string,
  input: CreatePageInput
): CreatePageResult {
  try {
    ensurePagesDirectory(workspaceRootPath)
    const pageId = `page_${randomUUID().slice(0, 8)}`
    const now = Date.now()
    const content = input.content || ''
    const title = input.title || extractTitleFromContent(content)
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    atomicWriteFileSync(mdPath, content)
    const page: PageDocument = {
      id: pageId,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      sourceSessionId: input.sourceSessionId,
      sourceMessageId: input.sourceMessageId,
      notebookId: input.notebookId,
      outputIds: input.outputIds ?? [],
    }
    mutatePageIndex(workspaceRootPath, index => {
      const existingIndex = index.pages.findIndex(item => item.id === pageId)
      if (existingIndex === -1) {
        index.pages.push(page)
      } else {
        index.pages[existingIndex] = page
      }
    })
    debug('[page-storage] Created page:', pageId, title)
    return { success: true, page }
  } catch (error) {
    debug('[page-storage] Failed to create page:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function updatePageDocument(
  workspaceRootPath: string,
  pageId: string,
  input: UpdatePageInput,
  workspaceId?: string
): UpdatePageResult {
  try {
    assertSafePageId(pageId)
    const result = mutatePageIndex(workspaceRootPath, (index) => {
      const pageIndex = index.pages.findIndex(p => p.id === pageId)
      if (pageIndex === -1) {
        return { success: false, error: 'Doc not found' } as UpdatePageResult
      }
      const existingPage = index.pages[pageIndex]
      if (!existingPage) {
        return { success: false, error: 'Doc not found' } as UpdatePageResult
      }
      if (workspaceId && existingPage.workspaceId !== workspaceId) {
        return { success: false, error: 'Doc not found' } as UpdatePageResult
      }
      const now = Date.now()
      const updatedPage: PageDocument = { ...existingPage, updatedAt: now }
      if (input.title !== undefined) {
        updatedPage.title = input.title
      }
      if (input.outputIds !== undefined) {
        updatedPage.outputIds = input.outputIds
      }
      index.pages[pageIndex] = updatedPage
      return { success: true, page: updatedPage } as UpdatePageResult
    })
    if (result.success) {
      debug('[page-storage] Updated page metadata:', pageId)
    }
    return result
  } catch (error) {
    debug('[page-storage] Failed to update page:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function updatePageContent(
  workspaceRootPath: string,
  pageId: string,
  content: string,
  workspaceId?: string
): UpdatePageResult {
  try {
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    if (!existsSync(mdPath)) {
      return { success: false, error: 'Doc not found' }
    }
    const existingEntry = loadPageIndex(workspaceRootPath, workspaceId).pages.find(p => p.id === pageId)
    if (!existingEntry || (workspaceId && existingEntry.workspaceId !== workspaceId)) {
      return { success: false, error: 'Doc not found' }
    }
    atomicWriteFileSync(mdPath, content)
    const result = mutatePageIndex(workspaceRootPath, (index) => {
      const pageIndex = index.pages.findIndex(p => p.id === pageId)
      if (pageIndex === -1) {
        return { success: false, error: 'Doc not found' } as UpdatePageResult
      }
      if (workspaceId && index.pages[pageIndex]?.workspaceId !== workspaceId) {
        return { success: false, error: 'Doc not found' } as UpdatePageResult
      }
      const existingPage = index.pages[pageIndex]
      if (!existingPage) {
        return { success: false, error: 'Doc not found' } as UpdatePageResult
      }
      const now = Date.now()
      const newTitle = extractTitleFromContent(content)
      const updatedPage: PageDocument = {
        ...existingPage,
        content,
        title: newTitle,
        updatedAt: now,
      }
      index.pages[pageIndex] = updatedPage
      return { success: true, page: updatedPage } as UpdatePageResult
    })
    if (result.success) {
      debug('[page-storage] Updated page content:', pageId)
    }
    return result
  } catch (error) {
    debug('[page-storage] Failed to update page content:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listPageDocuments(workspaceRootPath: string, workspaceId?: string): PageDocument[] {
  const index = loadPageIndex(workspaceRootPath, workspaceId)
  const pages = workspaceId
    ? index.pages.filter(p => p.workspaceId === workspaceId)
    : [...index.pages]
  
  return pages.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function listPageEntries(workspaceRootPath: string): PageListEntry[] {
  const pages = listPageDocuments(workspaceRootPath)
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
}

export function deletePageDocument(workspaceRootPath: string, pageId: string, workspaceId?: string): DeletePageResult {
  try {
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    const existingPage = loadPageIndex(workspaceRootPath, workspaceId).pages.find(p => p.id === pageId)
    if (workspaceId && existingPage?.workspaceId && existingPage.workspaceId !== workspaceId) {
      return { success: false, error: 'Doc not found' }
    }
    if (existsSync(mdPath)) {
      unlinkSync(mdPath)
    }
    mutatePageIndex(workspaceRootPath, (index) => {
      const filteredPages = index.pages.filter(p => p.id !== pageId)
      if (filteredPages.length === index.pages.length) {
        debug('[page-storage] Page not found in index:', pageId)
      }
      index.pages = filteredPages
    })
    debug('[page-storage] Deleted page:', pageId)
    return { success: true }
  } catch (error) {
    debug('[page-storage] Failed to delete page:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function pageDocumentExists(workspaceRootPath: string, pageId: string): boolean {
  try {
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    return existsSync(mdPath)
  } catch {
    return false
  }
}

export function getPageCount(workspaceRootPath: string): number {
  const index = loadPageIndex(workspaceRootPath)
  return index.pages.length
}
