import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
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

const PAGES_DIR = 'pages'
const PAGE_INDEX_FILE = 'pages/index.json'
const CURRENT_INDEX_VERSION = 1

export function getPageMarkdownPath(workspaceRootPath: string, pageId: string): string {
  return join(workspaceRootPath, PAGES_DIR, `${pageId}.md`)
}

export function getPageIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PAGE_INDEX_FILE)
}

export function getPagesDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PAGES_DIR)
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

export function loadPageIndex(workspaceRootPath: string): PageIndex {
  const indexPath = getPageIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    debug('[page-storage] No index found, returning empty index')
    return { version: CURRENT_INDEX_VERSION, pages: [] }
  }
  try {
    const index = readJsonFileSync<PageIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.pages)) {
      debug('[page-storage] Invalid index structure, attempting rebuild')
      return rebuildPageIndex(workspaceRootPath)
    }
    if (index.version !== CURRENT_INDEX_VERSION) {
      debug('[page-storage] Migrating index from version', index.version, 'to', CURRENT_INDEX_VERSION)
      index.version = CURRENT_INDEX_VERSION
    }
    return index
  } catch (error) {
    debug('[page-storage] Failed to load index, attempting rebuild:', error)
    return rebuildPageIndex(workspaceRootPath)
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

export function rebuildPageIndex(workspaceRootPath: string): PageIndex {
  ensurePagesDirectory(workspaceRootPath)
  const pagesDir = getPagesDirectoryPath(workspaceRootPath)
  const pages: PageDocument[] = []
  try {
    const entries = readdirSync(pagesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const pageId = entry.name.slice(0, -3)
      const mdPath = join(pagesDir, entry.name)
      try {
        const content = readFileSync(mdPath, 'utf-8')
        const page: PageDocument = {
          id: pageId,
          title: extractTitleFromContent(content),
          content: content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          workspaceId: '',
        }
        pages.push(page)
      } catch (error) {
        debug('[page-storage] Failed to read page file during rebuild:', entry.name, error)
      }
    }
  } catch (error) {
    debug('[page-storage] Failed to scan pages directory during rebuild:', error)
  }
  const index: PageIndex = { version: CURRENT_INDEX_VERSION, pages }
  try {
    savePageIndex(workspaceRootPath, index)
  } catch {}
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
  const index = loadPageIndex(workspaceRootPath)
  const indexEntry = index.pages.find(p => p.id === pageId)
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
    index.pages.push(page)
    savePageIndex(workspaceRootPath, index)
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
    writeFileSync(mdPath, content, 'utf-8')
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
      outputIds: [],
    }
    const index = loadPageIndex(workspaceRootPath)
    index.pages.push(page)
    savePageIndex(workspaceRootPath, index)
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
  input: UpdatePageInput
): UpdatePageResult {
  try {
    const index = loadPageIndex(workspaceRootPath)
    const pageIndex = index.pages.findIndex(p => p.id === pageId)
    if (pageIndex === -1) {
      return { success: false, error: 'Doc not found' }
    }
    const existingPage = index.pages[pageIndex]
    if (!existingPage) {
      return { success: false, error: 'Doc not found' }
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
    savePageIndex(workspaceRootPath, index)
    debug('[page-storage] Updated page metadata:', pageId)
    return { success: true, page: updatedPage }
  } catch (error) {
    debug('[page-storage] Failed to update page:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function updatePageContent(
  workspaceRootPath: string,
  pageId: string,
  content: string
): UpdatePageResult {
  try {
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    if (!existsSync(mdPath)) {
      return { success: false, error: 'Doc not found' }
    }
    writeFileSync(mdPath, content, 'utf-8')
    const index = loadPageIndex(workspaceRootPath)
    const pageIndex = index.pages.findIndex(p => p.id === pageId)
    if (pageIndex !== -1) {
      const existingPage = index.pages[pageIndex]
      if (!existingPage) {
        return { success: false, error: 'Doc not found' }
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
      savePageIndex(workspaceRootPath, index)
    }
    debug('[page-storage] Updated page content:', pageId)
    return { success: true, page: pageIndex !== -1 ? index.pages[pageIndex] : undefined }
  } catch (error) {
    debug('[page-storage] Failed to update page content:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listPageDocuments(workspaceRootPath: string, workspaceId?: string): PageDocument[] {
  const index = loadPageIndex(workspaceRootPath)
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

export function deletePageDocument(workspaceRootPath: string, pageId: string): DeletePageResult {
  try {
    const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
    if (existsSync(mdPath)) {
      unlinkSync(mdPath)
    }
    const index = loadPageIndex(workspaceRootPath)
    const filteredPages = index.pages.filter(p => p.id !== pageId)
    if (filteredPages.length === index.pages.length) {
      debug('[page-storage] Page not found in index:', pageId)
    }
    index.pages = filteredPages
    savePageIndex(workspaceRootPath, index)
    debug('[page-storage] Deleted page:', pageId)
    return { success: true }
  } catch (error) {
    debug('[page-storage] Failed to delete page:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function pageDocumentExists(workspaceRootPath: string, pageId: string): boolean {
  const mdPath = getPageMarkdownPath(workspaceRootPath, pageId)
  return existsSync(mdPath)
}

export function getPageCount(workspaceRootPath: string): number {
  const index = loadPageIndex(workspaceRootPath)
  return index.pages.length
}
