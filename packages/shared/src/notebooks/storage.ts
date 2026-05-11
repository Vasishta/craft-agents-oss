import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import { atomicWriteFileSync, readJsonFileSync } from '../utils/files'
import { debug } from '../utils/debug'
import { mutateSerializedLocalIndex, trySaveLocalIndex } from '../utils/local-index'
import type {
  CreateNotebookInput,
  DeleteNotebookResult,
  NotebookDocument,
  NotebookIndex,
  NotebookIndexEntry,
  NotebookLinkCounts,
  NotebookLinks,
  NotebookMutationResult,
  NotebookSection,
  UpdateNotebookInput,
} from './types'

const NOTEBOOKS_DIR = 'notebooks'
const NOTEBOOK_INDEX_FILE = 'notebooks/index.json'
const NOTEBOOK_INDEX_LOCK_FILE = 'notebooks/index.json.lock'
const CURRENT_INDEX_VERSION = 1
const SAFE_NOTEBOOK_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

const EMPTY_NOTEBOOK_LINKS: NotebookLinks = {
  projectIds: [],
  sessionIds: [],
  docIds: [],
  outputIds: [],
  workItemIds: [],
  sourceIds: [],
  decisionIds: [],
}

const NOTEBOOK_LINK_KEYS = Object.keys(EMPTY_NOTEBOOK_LINKS) as (keyof NotebookLinks)[]

export function getNotebooksDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, NOTEBOOKS_DIR)
}

export function getNotebookIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, NOTEBOOK_INDEX_FILE)
}

export function getNotebookIndexLockPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, NOTEBOOK_INDEX_LOCK_FILE)
}

export function getNotebookDocumentPath(workspaceRootPath: string, notebookId: string): string {
  assertSafeNotebookId(notebookId)
  const notebooksDir = resolve(getNotebooksDirectoryPath(workspaceRootPath))
  const notebookPath = resolve(notebooksDir, `${notebookId}.json`)
  assertPathInsideDirectory(notebookPath, notebooksDir)
  return notebookPath
}

export function isSafeNotebookId(notebookId: string): boolean {
  return SAFE_NOTEBOOK_ID_PATTERN.test(notebookId)
}

export function assertSafeNotebookId(notebookId: string): void {
  if (
    !notebookId ||
    !isSafeNotebookId(notebookId) ||
    notebookId.includes('..') ||
    notebookId.includes('/') ||
    notebookId.includes('\\') ||
    notebookId !== basename(notebookId) ||
    resolve(notebookId) === notebookId
  ) {
    throw new Error('Invalid Notebook ID')
  }
}

function assertPathInsideDirectory(filePath: string, directoryPath: string): void {
  const relativePath = relative(directoryPath, filePath)
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes('..') || resolve(relativePath) === relativePath) {
    throw new Error('Invalid Notebook path')
  }
}

export function ensureNotebooksDirectory(workspaceRootPath: string): void {
  const notebooksDir = getNotebooksDirectoryPath(workspaceRootPath)
  if (!existsSync(notebooksDir)) {
    mkdirSync(notebooksDir, { recursive: true })
    debug('[notebook-storage] Created notebooks directory:', notebooksDir)
  }
}

function normalizeStringList(values: string[] | undefined): string[] {
  if (!values) return []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values) {
    const item = value.trim()
    if (!item || seen.has(item)) continue
    seen.add(item)
    normalized.push(item)
  }
  return normalized
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

export function normalizeNotebookLinks(links?: Partial<NotebookLinks>): NotebookLinks {
  const normalized: NotebookLinks = { ...EMPTY_NOTEBOOK_LINKS }
  for (const key of NOTEBOOK_LINK_KEYS) {
    normalized[key] = normalizeStringList(links?.[key])
  }
  return normalized
}

function normalizePartialNotebookLinks(links?: Partial<NotebookLinks>): Partial<NotebookLinks> {
  if (!links) return {}
  const normalized: Partial<NotebookLinks> = {}
  for (const key of NOTEBOOK_LINK_KEYS) {
    const values = normalizeStringList(links[key])
    if (values.length > 0) normalized[key] = values
  }
  return normalized
}

function normalizeNotebookSections(sections: CreateNotebookInput['sections'] | UpdateNotebookInput['sections'] | undefined): NotebookSection[] {
  if (!sections) return []
  const seen = new Set<string>()
  const normalized: NotebookSection[] = []
  for (const section of sections) {
    const title = section.title.trim()
    if (!title) continue
    const candidateId = section.id?.trim() || `section_${randomUUID()}`
    const id = isSafeNotebookId(candidateId) ? candidateId : `section_${randomUUID()}`
    if (seen.has(id)) continue
    seen.add(id)
    normalized.push({
      id,
      title,
      description: normalizeOptionalText(section.description),
      links: normalizePartialNotebookLinks(section.links),
    })
  }
  return normalized
}

function mergeNotebookLinks(current: NotebookLinks, links: Partial<NotebookLinks>): NotebookLinks {
  const merged: NotebookLinks = { ...current }
  for (const key of NOTEBOOK_LINK_KEYS) {
    const additions = normalizeStringList(links[key])
    if (additions.length === 0) continue
    merged[key] = normalizeStringList([...current[key], ...additions])
  }
  return merged
}

function removeNotebookLinks(current: NotebookLinks, links: Partial<NotebookLinks>): NotebookLinks {
  const updated: NotebookLinks = { ...current }
  for (const key of NOTEBOOK_LINK_KEYS) {
    const removals = new Set(normalizeStringList(links[key]))
    if (removals.size === 0) continue
    updated[key] = current[key].filter(id => !removals.has(id))
  }
  return updated
}

function toLinkCounts(links: NotebookLinks): NotebookLinkCounts {
  return {
    projectCount: links.projectIds.length,
    sessionCount: links.sessionIds.length,
    docCount: links.docIds.length,
    outputCount: links.outputIds.length,
    workItemCount: links.workItemIds.length,
    sourceCount: links.sourceIds.length,
    decisionCount: links.decisionIds.length,
  }
}

function toIndexEntry(notebook: NotebookDocument): NotebookIndexEntry {
  return {
    id: notebook.id,
    workspaceId: notebook.workspaceId,
    title: notebook.title,
    description: notebook.description,
    status: notebook.status,
    createdAt: notebook.createdAt,
    updatedAt: notebook.updatedAt,
    projectIds: notebook.links.projectIds,
    sectionCount: notebook.sections.length,
    linkCounts: toLinkCounts(notebook.links),
  }
}

function readNotebookFile(workspaceRootPath: string, notebookId: string): NotebookDocument | null {
  try {
    const notebookPath = getNotebookDocumentPath(workspaceRootPath, notebookId)
    if (!existsSync(notebookPath)) return null
    const notebook = readJsonFileSync<NotebookDocument>(notebookPath)
    if (!notebook || typeof notebook !== 'object' || notebook.id !== notebookId) return null
    return {
      ...notebook,
      links: normalizeNotebookLinks(notebook.links),
      sections: normalizeNotebookSections(notebook.sections),
    }
  } catch (error) {
    debug('[notebook-storage] Failed to read notebook file:', notebookId, error)
    return null
  }
}

function scanNotebooks(workspaceRootPath: string, workspaceId?: string): NotebookDocument[] {
  ensureNotebooksDirectory(workspaceRootPath)
  const notebooksDir = getNotebooksDirectoryPath(workspaceRootPath)
  const notebooks: NotebookDocument[] = []
  try {
    const entries = readdirSync(notebooksDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue
      const notebookId = entry.name.slice(0, -5)
      if (!isSafeNotebookId(notebookId)) {
        debug('[notebook-storage] Skipping unsafe notebook filename during rebuild:', entry.name)
        continue
      }
      const notebook = readNotebookFile(workspaceRootPath, notebookId)
      if (!notebook) continue
      if (workspaceId && notebook.workspaceId !== workspaceId) continue
      notebooks.push(notebook)
    }
  } catch (error) {
    debug('[notebook-storage] Failed to scan notebooks directory:', error)
  }
  return notebooks
}

export function saveNotebookIndex(workspaceRootPath: string, index: NotebookIndex): void {
  ensureNotebooksDirectory(workspaceRootPath)
  atomicWriteFileSync(getNotebookIndexPath(workspaceRootPath), JSON.stringify(index, null, 2))
}

function mutateNotebookIndex<TResult>(workspaceRootPath: string, mutation: (index: NotebookIndex) => TResult): TResult {
  return mutateSerializedLocalIndex(
    {
      label: 'notebook-storage',
      lockPath: getNotebookIndexLockPath(workspaceRootPath),
      ensureDirectory: () => ensureNotebooksDirectory(workspaceRootPath),
      loadIndex: () => loadNotebookIndex(workspaceRootPath),
      saveIndex: index => saveNotebookIndex(workspaceRootPath, index),
    },
    mutation
  )
}

export function rebuildNotebookIndex(workspaceRootPath: string): NotebookIndex {
  const notebooks = scanNotebooks(workspaceRootPath)
  const index: NotebookIndex = {
    version: CURRENT_INDEX_VERSION,
    notebooks: notebooks.map(toIndexEntry),
  }
  trySaveLocalIndex('notebook-storage', () => saveNotebookIndex(workspaceRootPath, index))
  return index
}

export function loadNotebookIndex(workspaceRootPath: string): NotebookIndex {
  const indexPath = getNotebookIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    return rebuildNotebookIndex(workspaceRootPath)
  }
  try {
    const index = readJsonFileSync<NotebookIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.notebooks)) {
      return rebuildNotebookIndex(workspaceRootPath)
    }
    return index.version === CURRENT_INDEX_VERSION
      ? index
      : { ...index, version: CURRENT_INDEX_VERSION }
  } catch (error) {
    debug('[notebook-storage] Failed to load index, attempting rebuild:', error)
    return rebuildNotebookIndex(workspaceRootPath)
  }
}

function writeNotebook(workspaceRootPath: string, notebook: NotebookDocument): void {
  atomicWriteFileSync(getNotebookDocumentPath(workspaceRootPath, notebook.id), JSON.stringify(notebook, null, 2))
}

function upsertNotebookIndexEntry(workspaceRootPath: string, notebook: NotebookDocument): void {
  mutateNotebookIndex(workspaceRootPath, (index) => {
    const entry = toIndexEntry(notebook)
    const existingIndex = index.notebooks.findIndex(item => item.id === notebook.id)
    if (existingIndex === -1) {
      index.notebooks.push(entry)
    } else {
      index.notebooks[existingIndex] = entry
    }
  })
}

export function createNotebookDocument(
  workspaceRootPath: string,
  workspaceId: string,
  input: CreateNotebookInput
): NotebookMutationResult {
  try {
    ensureNotebooksDirectory(workspaceRootPath)
    const title = input.title.trim()
    if (!title) return { success: false, error: 'Notebook title is required' }

    const notebookId = `notebook_${randomUUID()}`
    const now = Date.now()
    const notebook: NotebookDocument = {
      id: notebookId,
      workspaceId,
      title,
      description: normalizeOptionalText(input.description),
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now,
      links: normalizeNotebookLinks(input.links),
      sections: normalizeNotebookSections(input.sections),
      externalRefs: normalizeStringList(input.externalRefs),
    }

    writeNotebook(workspaceRootPath, notebook)
    upsertNotebookIndexEntry(workspaceRootPath, notebook)

    return { success: true, notebook }
  } catch (error) {
    debug('[notebook-storage] Failed to create notebook:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function readNotebookDocument(
  workspaceRootPath: string,
  notebookId: string,
  workspaceId?: string
): NotebookDocument | null {
  const notebook = readNotebookFile(workspaceRootPath, notebookId)
  if (!notebook) return null
  if (workspaceId && notebook.workspaceId !== workspaceId) return null
  return notebook
}

export function updateNotebookDocument(
  workspaceRootPath: string,
  notebookId: string,
  input: UpdateNotebookInput,
  workspaceId?: string
): NotebookMutationResult {
  try {
    assertSafeNotebookId(notebookId)
    const notebook = readNotebookDocument(workspaceRootPath, notebookId, workspaceId)
    if (!notebook) return { success: false, error: 'Notebook not found' }

    const updatedTitle = input.title !== undefined ? input.title.trim() : notebook.title
    if (!updatedTitle) return { success: false, error: 'Notebook title is required' }

    const updated: NotebookDocument = {
      ...notebook,
      title: updatedTitle,
      description: input.description !== undefined ? normalizeOptionalText(input.description) : notebook.description,
      status: input.status !== undefined ? input.status : notebook.status,
      links: input.links !== undefined ? normalizeNotebookLinks(input.links) : notebook.links,
      sections: input.sections !== undefined ? normalizeNotebookSections(input.sections) : notebook.sections,
      externalRefs: input.externalRefs !== undefined ? normalizeStringList(input.externalRefs) : notebook.externalRefs,
      updatedAt: Date.now(),
    }

    writeNotebook(workspaceRootPath, updated)
    upsertNotebookIndexEntry(workspaceRootPath, updated)

    return { success: true, notebook: updated }
  } catch (error) {
    debug('[notebook-storage] Failed to update notebook:', notebookId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function linkNotebookObjects(
  workspaceRootPath: string,
  notebookId: string,
  links: Partial<NotebookLinks>,
  workspaceId?: string
): NotebookMutationResult {
  try {
    assertSafeNotebookId(notebookId)
    const notebook = readNotebookDocument(workspaceRootPath, notebookId, workspaceId)
    if (!notebook) return { success: false, error: 'Notebook not found' }

    const updated: NotebookDocument = {
      ...notebook,
      links: mergeNotebookLinks(notebook.links, links),
      updatedAt: Date.now(),
    }

    writeNotebook(workspaceRootPath, updated)
    upsertNotebookIndexEntry(workspaceRootPath, updated)

    return { success: true, notebook: updated }
  } catch (error) {
    debug('[notebook-storage] Failed to link notebook objects:', notebookId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function unlinkNotebookObjects(
  workspaceRootPath: string,
  notebookId: string,
  links: Partial<NotebookLinks>,
  workspaceId?: string
): NotebookMutationResult {
  try {
    assertSafeNotebookId(notebookId)
    const notebook = readNotebookDocument(workspaceRootPath, notebookId, workspaceId)
    if (!notebook) return { success: false, error: 'Notebook not found' }

    const updated: NotebookDocument = {
      ...notebook,
      links: removeNotebookLinks(notebook.links, links),
      updatedAt: Date.now(),
    }

    writeNotebook(workspaceRootPath, updated)
    upsertNotebookIndexEntry(workspaceRootPath, updated)

    return { success: true, notebook: updated }
  } catch (error) {
    debug('[notebook-storage] Failed to unlink notebook objects:', notebookId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listNotebookEntries(workspaceRootPath: string, workspaceId?: string, projectId?: string): NotebookIndexEntry[] {
  const index = loadNotebookIndex(workspaceRootPath)
  const entries = index.notebooks.filter(entry => {
    if (workspaceId && entry.workspaceId !== workspaceId) return false
    if (projectId && !entry.projectIds.includes(projectId)) return false
    return true
  })
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function deleteNotebookDocument(
  workspaceRootPath: string,
  notebookId: string,
  workspaceId?: string
): DeleteNotebookResult {
  try {
    assertSafeNotebookId(notebookId)
    const notebookPath = getNotebookDocumentPath(workspaceRootPath, notebookId)

    if (workspaceId) {
      const existing = readNotebookDocument(workspaceRootPath, notebookId, workspaceId)
      if (!existing) return { success: false, error: 'Notebook not found' }
    }

    if (existsSync(notebookPath)) {
      unlinkSync(notebookPath)
    }

    mutateNotebookIndex(workspaceRootPath, (index) => {
      index.notebooks = index.notebooks.filter(entry => entry.id !== notebookId)
    })

    return { success: true }
  } catch (error) {
    debug('[notebook-storage] Failed to delete notebook:', notebookId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
