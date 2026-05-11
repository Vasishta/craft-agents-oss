import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import { atomicWriteFileSync, readJsonFileSync } from '../utils/files'
import { debug } from '../utils/debug'
import { mutateSerializedLocalIndex, trySaveLocalIndex } from '../utils/local-index'
import type {
  CreateWorkItemInput,
  DeleteWorkItemResult,
  UpdateWorkItemInput,
  WorkItemDocument,
  WorkItemIndex,
  WorkItemIndexEntry,
  WorkItemMutationResult,
} from './types'

const WORKITEMS_DIR = 'workitems'
const WORKITEM_INDEX_FILE = 'workitems/index.json'
const WORKITEM_INDEX_LOCK_FILE = 'workitems/index.json.lock'
const CURRENT_INDEX_VERSION = 1
const SAFE_WORKITEM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function getWorkItemsDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, WORKITEMS_DIR)
}

export function getWorkItemIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, WORKITEM_INDEX_FILE)
}

export function getWorkItemIndexLockPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, WORKITEM_INDEX_LOCK_FILE)
}

export function getWorkItemDocumentPath(workspaceRootPath: string, workItemId: string): string {
  assertSafeWorkItemId(workItemId)
  const workItemsDir = resolve(getWorkItemsDirectoryPath(workspaceRootPath))
  const workItemPath = resolve(workItemsDir, `${workItemId}.json`)
  assertPathInsideDirectory(workItemPath, workItemsDir)
  return workItemPath
}

export function isSafeWorkItemId(workItemId: string): boolean {
  return SAFE_WORKITEM_ID_PATTERN.test(workItemId)
}

export function assertSafeWorkItemId(workItemId: string): void {
  if (
    !workItemId ||
    !isSafeWorkItemId(workItemId) ||
    workItemId.includes('..') ||
    workItemId.includes('/') ||
    workItemId.includes('\\') ||
    workItemId !== basename(workItemId) ||
    resolve(workItemId) === workItemId
  ) {
    throw new Error('Invalid WorkItem ID')
  }
}

function assertPathInsideDirectory(filePath: string, directoryPath: string): void {
  const relativePath = relative(directoryPath, filePath)
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes('..') || resolve(relativePath) === relativePath) {
    throw new Error('Invalid WorkItem path')
  }
}

export function ensureWorkItemsDirectory(workspaceRootPath: string): void {
  const workItemsDir = getWorkItemsDirectoryPath(workspaceRootPath)
  if (!existsSync(workItemsDir)) {
    mkdirSync(workItemsDir, { recursive: true })
    debug('[workitem-storage] Created workitems directory:', workItemsDir)
  }
}

function toIndexEntry(workItem: WorkItemDocument): WorkItemIndexEntry {
  return {
    id: workItem.id,
    workspaceId: workItem.workspaceId,
    title: workItem.title,
    status: workItem.status,
    priority: workItem.priority,
    type: workItem.type,
    area: workItem.area,
    createdAt: workItem.createdAt,
    updatedAt: workItem.updatedAt,
  }
}

function readWorkItemFile(workspaceRootPath: string, workItemId: string): WorkItemDocument | null {
  try {
    const workItemPath = getWorkItemDocumentPath(workspaceRootPath, workItemId)
    if (!existsSync(workItemPath)) return null
    const workItem = readJsonFileSync<WorkItemDocument>(workItemPath)
    if (!workItem || typeof workItem !== 'object' || workItem.id !== workItemId) return null
    return workItem
  } catch (error) {
    debug('[workitem-storage] Failed to read workitem file:', workItemId, error)
    return null
  }
}

function scanWorkItems(workspaceRootPath: string, workspaceId?: string): WorkItemDocument[] {
  ensureWorkItemsDirectory(workspaceRootPath)
  const workItemsDir = getWorkItemsDirectoryPath(workspaceRootPath)
  const workItems: WorkItemDocument[] = []
  try {
    const entries = readdirSync(workItemsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue
      const workItemId = entry.name.slice(0, -5)
      if (!isSafeWorkItemId(workItemId)) {
        debug('[workitem-storage] Skipping unsafe workitem filename during rebuild:', entry.name)
        continue
      }
      const workItem = readWorkItemFile(workspaceRootPath, workItemId)
      if (!workItem) continue
      if (workspaceId && workItem.workspaceId !== workspaceId) continue
      workItems.push(workItem)
    }
  } catch (error) {
    debug('[workitem-storage] Failed to scan workitems directory:', error)
  }
  return workItems
}

export function saveWorkItemIndex(workspaceRootPath: string, index: WorkItemIndex): void {
  ensureWorkItemsDirectory(workspaceRootPath)
  atomicWriteFileSync(getWorkItemIndexPath(workspaceRootPath), JSON.stringify(index, null, 2))
}

function mutateWorkItemIndex<TResult>(workspaceRootPath: string, mutation: (index: WorkItemIndex) => TResult): TResult {
  return mutateSerializedLocalIndex(
    {
      label: 'workitem-storage',
      lockPath: getWorkItemIndexLockPath(workspaceRootPath),
      ensureDirectory: () => ensureWorkItemsDirectory(workspaceRootPath),
      loadIndex: () => loadWorkItemIndex(workspaceRootPath),
      saveIndex: index => saveWorkItemIndex(workspaceRootPath, index),
    },
    mutation
  )
}

export function rebuildWorkItemIndex(workspaceRootPath: string): WorkItemIndex {
  const workItems = scanWorkItems(workspaceRootPath)
  const index: WorkItemIndex = {
    version: CURRENT_INDEX_VERSION,
    workItems: workItems.map(toIndexEntry),
  }
  trySaveLocalIndex('workitem-storage', () => saveWorkItemIndex(workspaceRootPath, index))
  return index
}

export function loadWorkItemIndex(workspaceRootPath: string): WorkItemIndex {
  const indexPath = getWorkItemIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    return rebuildWorkItemIndex(workspaceRootPath)
  }
  try {
    const index = readJsonFileSync<WorkItemIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.workItems)) {
      return rebuildWorkItemIndex(workspaceRootPath)
    }
    // Handle version migrations here if needed
    return index
  } catch (error) {
    debug('[workitem-storage] Failed to load index, attempting rebuild:', error)
    return rebuildWorkItemIndex(workspaceRootPath)
  }
}

export function createWorkItemDocument(
  workspaceRootPath: string,
  workspaceId: string,
  input: CreateWorkItemInput
): WorkItemMutationResult {
  try {
    ensureWorkItemsDirectory(workspaceRootPath)
    const workItemId = `workitem_${randomUUID()}`
    const now = Date.now()

    const workItem: WorkItemDocument = {
      id: workItemId,
      workspaceId,
      title: input.title,
      description: input.description,
      status: input.status || 'backlog',
      priority: input.priority,
      type: input.type || 'task',
      area: input.area,
      createdAt: now,
      updatedAt: now,
      linkedSessionIds: input.linkedSessionIds || [],
      linkedDocIds: input.linkedDocIds || [],
      linkedOutputIds: input.linkedOutputIds || [],
      externalRefs: input.externalRefs || [],
    }

    atomicWriteFileSync(getWorkItemDocumentPath(workspaceRootPath, workItemId), JSON.stringify(workItem, null, 2))

    mutateWorkItemIndex(workspaceRootPath, (index) => {
      const entry = toIndexEntry(workItem)
      const existingIdx = index.workItems.findIndex(item => item.id === workItemId)
      if (existingIdx === -1) {
        index.workItems.push(entry)
      } else {
        index.workItems[existingIdx] = entry
      }
    })

    return { success: true, workItem }
  } catch (error) {
    debug('[workitem-storage] Failed to create workitem:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function readWorkItemDocument(
  workspaceRootPath: string,
  workItemId: string,
  workspaceId?: string
): WorkItemDocument | null {
  const workItem = readWorkItemFile(workspaceRootPath, workItemId)
  if (!workItem) return null
  if (workspaceId && workItem.workspaceId !== workspaceId) return null
  return workItem
}

export function updateWorkItemDocument(
  workspaceRootPath: string,
  workItemId: string,
  input: UpdateWorkItemInput,
  workspaceId?: string
): WorkItemMutationResult {
  try {
    assertSafeWorkItemId(workItemId)
    const workItem = readWorkItemDocument(workspaceRootPath, workItemId, workspaceId)
    if (!workItem) return { success: false, error: 'WorkItem not found' }

    const updated: WorkItemDocument = {
      ...workItem,
      ...input,
      id: workItem.id, // Ensure ID cannot be changed
      workspaceId: workItem.workspaceId, // Ensure workspaceId cannot be changed
      updatedAt: Date.now(),
    }

    atomicWriteFileSync(getWorkItemDocumentPath(workspaceRootPath, workItemId), JSON.stringify(updated, null, 2))

    mutateWorkItemIndex(workspaceRootPath, (index) => {
      const entryIdx = index.workItems.findIndex(e => e.id === workItemId)
      if (entryIdx !== -1) {
        index.workItems[entryIdx] = toIndexEntry(updated)
      } else {
        index.workItems.push(toIndexEntry(updated))
      }
    })

    return { success: true, workItem: updated }
  } catch (error) {
    debug('[workitem-storage] Failed to update workitem:', workItemId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listWorkItemEntries(workspaceRootPath: string, workspaceId?: string): WorkItemIndexEntry[] {
  const index = loadWorkItemIndex(workspaceRootPath)
  let entries = index.workItems
  if (workspaceId) {
    entries = entries.filter(e => e.workspaceId === workspaceId)
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function deleteWorkItemDocument(
  workspaceRootPath: string,
  workItemId: string,
  workspaceId?: string
): DeleteWorkItemResult {
  try {
    assertSafeWorkItemId(workItemId)
    const workItemPath = getWorkItemDocumentPath(workspaceRootPath, workItemId)

    if (workspaceId) {
      const existing = readWorkItemDocument(workspaceRootPath, workItemId, workspaceId)
      if (!existing) return { success: false, error: 'WorkItem not found' }
    }

    if (existsSync(workItemPath)) {
      unlinkSync(workItemPath)
    }

    mutateWorkItemIndex(workspaceRootPath, (index) => {
      index.workItems = index.workItems.filter(e => e.id !== workItemId)
    })

    return { success: true }
  } catch (error) {
    debug('[workitem-storage] Failed to delete workitem:', workItemId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
