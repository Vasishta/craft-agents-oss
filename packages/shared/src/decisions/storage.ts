import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import { atomicWriteFileSync, readJsonFileSync } from '../utils/files'
import { debug } from '../utils/debug'
import { mutateSerializedLocalIndex, trySaveLocalIndex } from '../utils/local-index'
import type {
  CreateDecisionInput,
  DecisionDocument,
  DecisionIndex,
  DecisionIndexEntry,
  DecisionLinkCounts,
  DecisionLinks,
  DecisionMutationResult,
  DeleteDecisionResult,
  UpdateDecisionInput,
} from './types'

const DECISIONS_DIR = 'decisions'
const DECISION_INDEX_FILE = 'decisions/index.json'
const DECISION_INDEX_LOCK_FILE = 'decisions/index.json.lock'
const CURRENT_INDEX_VERSION = 1
const SAFE_DECISION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

const EMPTY_DECISION_LINKS: DecisionLinks = {
  projectIds: [],
  sessionIds: [],
  docIds: [],
  outputIds: [],
  workItemIds: [],
  sourceIds: [],
  notebookIds: [],
  supersedesDecisionIds: [],
}

const DECISION_LINK_KEYS = Object.keys(EMPTY_DECISION_LINKS) as (keyof DecisionLinks)[]

export function getDecisionsDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, DECISIONS_DIR)
}

export function getDecisionIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, DECISION_INDEX_FILE)
}

export function getDecisionIndexLockPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, DECISION_INDEX_LOCK_FILE)
}

export function getDecisionDocumentPath(workspaceRootPath: string, decisionId: string): string {
  assertSafeDecisionId(decisionId)
  const decisionsDir = resolve(getDecisionsDirectoryPath(workspaceRootPath))
  const decisionPath = resolve(decisionsDir, `${decisionId}.json`)
  assertPathInsideDirectory(decisionPath, decisionsDir)
  return decisionPath
}

export function isSafeDecisionId(decisionId: string): boolean {
  return SAFE_DECISION_ID_PATTERN.test(decisionId)
}

export function assertSafeDecisionId(decisionId: string): void {
  if (
    !decisionId ||
    !isSafeDecisionId(decisionId) ||
    decisionId.includes('..') ||
    decisionId.includes('/') ||
    decisionId.includes('\\') ||
    decisionId !== basename(decisionId) ||
    resolve(decisionId) === decisionId
  ) {
    throw new Error('Invalid Decision ID')
  }
}

function assertPathInsideDirectory(filePath: string, directoryPath: string): void {
  const relativePath = relative(directoryPath, filePath)
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes('..') || resolve(relativePath) === relativePath) {
    throw new Error('Invalid Decision path')
  }
}

export function ensureDecisionsDirectory(workspaceRootPath: string): void {
  const decisionsDir = getDecisionsDirectoryPath(workspaceRootPath)
  if (!existsSync(decisionsDir)) {
    mkdirSync(decisionsDir, { recursive: true })
    debug('[decision-storage] Created decisions directory:', decisionsDir)
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

export function normalizeDecisionLinks(links?: Partial<DecisionLinks>): DecisionLinks {
  const normalized: DecisionLinks = { ...EMPTY_DECISION_LINKS }
  for (const key of DECISION_LINK_KEYS) {
    normalized[key] = normalizeStringList(links?.[key])
  }
  return normalized
}

function mergeDecisionLinks(current: DecisionLinks, links: Partial<DecisionLinks>): DecisionLinks {
  const merged: DecisionLinks = { ...current }
  for (const key of DECISION_LINK_KEYS) {
    const additions = normalizeStringList(links[key])
    if (additions.length === 0) continue
    merged[key] = normalizeStringList([...current[key], ...additions])
  }
  return merged
}

function removeDecisionLinks(current: DecisionLinks, links: Partial<DecisionLinks>): DecisionLinks {
  const updated: DecisionLinks = { ...current }
  for (const key of DECISION_LINK_KEYS) {
    const removals = new Set(normalizeStringList(links[key]))
    if (removals.size === 0) continue
    updated[key] = current[key].filter(id => !removals.has(id))
  }
  return updated
}

function toLinkCounts(links: DecisionLinks): DecisionLinkCounts {
  return {
    projectCount: links.projectIds.length,
    sessionCount: links.sessionIds.length,
    docCount: links.docIds.length,
    outputCount: links.outputIds.length,
    workItemCount: links.workItemIds.length,
    sourceCount: links.sourceIds.length,
    notebookCount: links.notebookIds.length,
    supersedesDecisionCount: links.supersedesDecisionIds.length,
  }
}

function toIndexEntry(decision: DecisionDocument): DecisionIndexEntry {
  return {
    id: decision.id,
    workspaceId: decision.workspaceId,
    title: decision.title,
    status: decision.status,
    createdAt: decision.createdAt,
    updatedAt: decision.updatedAt,
    projectIds: decision.links.projectIds,
    linkCounts: toLinkCounts(decision.links),
  }
}

function readDecisionFile(workspaceRootPath: string, decisionId: string): DecisionDocument | null {
  try {
    const decisionPath = getDecisionDocumentPath(workspaceRootPath, decisionId)
    if (!existsSync(decisionPath)) return null
    const decision = readJsonFileSync<DecisionDocument>(decisionPath)
    if (!decision || typeof decision !== 'object' || decision.id !== decisionId) return null
    return {
      ...decision,
      links: normalizeDecisionLinks(decision.links),
    }
  } catch (error) {
    debug('[decision-storage] Failed to read decision file:', decisionId, error)
    return null
  }
}

function scanDecisions(workspaceRootPath: string, workspaceId?: string): DecisionDocument[] {
  ensureDecisionsDirectory(workspaceRootPath)
  const decisionsDir = getDecisionsDirectoryPath(workspaceRootPath)
  const decisions: DecisionDocument[] = []
  try {
    const entries = readdirSync(decisionsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue
      const decisionId = entry.name.slice(0, -5)
      if (!isSafeDecisionId(decisionId)) {
        debug('[decision-storage] Skipping unsafe decision filename during rebuild:', entry.name)
        continue
      }
      const decision = readDecisionFile(workspaceRootPath, decisionId)
      if (!decision) continue
      if (workspaceId && decision.workspaceId !== workspaceId) continue
      decisions.push(decision)
    }
  } catch (error) {
    debug('[decision-storage] Failed to scan decisions directory:', error)
  }
  return decisions
}

export function saveDecisionIndex(workspaceRootPath: string, index: DecisionIndex): void {
  ensureDecisionsDirectory(workspaceRootPath)
  atomicWriteFileSync(getDecisionIndexPath(workspaceRootPath), JSON.stringify(index, null, 2))
}

function mutateDecisionIndex<TResult>(workspaceRootPath: string, mutation: (index: DecisionIndex) => TResult): TResult {
  return mutateSerializedLocalIndex(
    {
      label: 'decision-storage',
      lockPath: getDecisionIndexLockPath(workspaceRootPath),
      ensureDirectory: () => ensureDecisionsDirectory(workspaceRootPath),
      loadIndex: () => loadDecisionIndex(workspaceRootPath),
      saveIndex: index => saveDecisionIndex(workspaceRootPath, index),
    },
    mutation
  )
}

export function rebuildDecisionIndex(workspaceRootPath: string): DecisionIndex {
  const decisions = scanDecisions(workspaceRootPath)
  const index: DecisionIndex = {
    version: CURRENT_INDEX_VERSION,
    decisions: decisions.map(toIndexEntry),
  }
  trySaveLocalIndex('decision-storage', () => saveDecisionIndex(workspaceRootPath, index))
  return index
}

export function loadDecisionIndex(workspaceRootPath: string): DecisionIndex {
  const indexPath = getDecisionIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    return rebuildDecisionIndex(workspaceRootPath)
  }
  try {
    const index = readJsonFileSync<DecisionIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.decisions)) {
      return rebuildDecisionIndex(workspaceRootPath)
    }
    return index.version === CURRENT_INDEX_VERSION
      ? index
      : { ...index, version: CURRENT_INDEX_VERSION }
  } catch (error) {
    debug('[decision-storage] Failed to load index, attempting rebuild:', error)
    return rebuildDecisionIndex(workspaceRootPath)
  }
}

function writeDecision(workspaceRootPath: string, decision: DecisionDocument): void {
  atomicWriteFileSync(getDecisionDocumentPath(workspaceRootPath, decision.id), JSON.stringify(decision, null, 2))
}

function upsertDecisionIndexEntry(workspaceRootPath: string, decision: DecisionDocument): void {
  mutateDecisionIndex(workspaceRootPath, (index) => {
    const entry = toIndexEntry(decision)
    const existingIndex = index.decisions.findIndex(item => item.id === decision.id)
    if (existingIndex === -1) {
      index.decisions.push(entry)
    } else {
      index.decisions[existingIndex] = entry
    }
  })
}

export function createDecisionDocument(
  workspaceRootPath: string,
  workspaceId: string,
  input: CreateDecisionInput
): DecisionMutationResult {
  try {
    ensureDecisionsDirectory(workspaceRootPath)
    const title = input.title.trim()
    const decisionText = input.decision.trim()
    if (!title) return { success: false, error: 'Decision title is required' }
    if (!decisionText) return { success: false, error: 'Decision body is required' }

    const decisionId = `decision_${randomUUID()}`
    const now = Date.now()
    const decision: DecisionDocument = {
      id: decisionId,
      workspaceId,
      title,
      status: input.status || 'proposed',
      context: input.context?.trim() || '',
      decision: decisionText,
      consequences: normalizeOptionalText(input.consequences),
      createdAt: now,
      updatedAt: now,
      links: normalizeDecisionLinks(input.links),
      sourceSessionId: normalizeOptionalText(input.sourceSessionId),
      sourceMessageId: normalizeOptionalText(input.sourceMessageId),
      sourceOutputId: normalizeOptionalText(input.sourceOutputId),
      externalRefs: normalizeStringList(input.externalRefs),
    }

    writeDecision(workspaceRootPath, decision)
    upsertDecisionIndexEntry(workspaceRootPath, decision)

    return { success: true, decision }
  } catch (error) {
    debug('[decision-storage] Failed to create decision:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function readDecisionDocument(
  workspaceRootPath: string,
  decisionId: string,
  workspaceId?: string
): DecisionDocument | null {
  const decision = readDecisionFile(workspaceRootPath, decisionId)
  if (!decision) return null
  if (workspaceId && decision.workspaceId !== workspaceId) return null
  return decision
}

export function updateDecisionDocument(
  workspaceRootPath: string,
  decisionId: string,
  input: UpdateDecisionInput,
  workspaceId?: string
): DecisionMutationResult {
  try {
    assertSafeDecisionId(decisionId)
    const decision = readDecisionDocument(workspaceRootPath, decisionId, workspaceId)
    if (!decision) return { success: false, error: 'Decision not found' }

    const updatedTitle = input.title !== undefined ? input.title.trim() : decision.title
    const updatedDecisionText = input.decision !== undefined ? input.decision.trim() : decision.decision
    if (!updatedTitle) return { success: false, error: 'Decision title is required' }
    if (!updatedDecisionText) return { success: false, error: 'Decision body is required' }

    const updated: DecisionDocument = {
      ...decision,
      title: updatedTitle,
      status: input.status !== undefined ? input.status : decision.status,
      context: input.context !== undefined ? input.context.trim() : decision.context,
      decision: updatedDecisionText,
      consequences: input.consequences !== undefined ? normalizeOptionalText(input.consequences) : decision.consequences,
      links: input.links !== undefined ? normalizeDecisionLinks(input.links) : decision.links,
      sourceSessionId: input.sourceSessionId !== undefined ? normalizeOptionalText(input.sourceSessionId) : decision.sourceSessionId,
      sourceMessageId: input.sourceMessageId !== undefined ? normalizeOptionalText(input.sourceMessageId) : decision.sourceMessageId,
      sourceOutputId: input.sourceOutputId !== undefined ? normalizeOptionalText(input.sourceOutputId) : decision.sourceOutputId,
      externalRefs: input.externalRefs !== undefined ? normalizeStringList(input.externalRefs) : decision.externalRefs,
      updatedAt: Date.now(),
    }

    writeDecision(workspaceRootPath, updated)
    upsertDecisionIndexEntry(workspaceRootPath, updated)

    return { success: true, decision: updated }
  } catch (error) {
    debug('[decision-storage] Failed to update decision:', decisionId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function linkDecisionObjects(
  workspaceRootPath: string,
  decisionId: string,
  links: Partial<DecisionLinks>,
  workspaceId?: string
): DecisionMutationResult {
  try {
    assertSafeDecisionId(decisionId)
    const decision = readDecisionDocument(workspaceRootPath, decisionId, workspaceId)
    if (!decision) return { success: false, error: 'Decision not found' }

    const updated: DecisionDocument = {
      ...decision,
      links: mergeDecisionLinks(decision.links, links),
      updatedAt: Date.now(),
    }

    writeDecision(workspaceRootPath, updated)
    upsertDecisionIndexEntry(workspaceRootPath, updated)

    return { success: true, decision: updated }
  } catch (error) {
    debug('[decision-storage] Failed to link decision objects:', decisionId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function unlinkDecisionObjects(
  workspaceRootPath: string,
  decisionId: string,
  links: Partial<DecisionLinks>,
  workspaceId?: string
): DecisionMutationResult {
  try {
    assertSafeDecisionId(decisionId)
    const decision = readDecisionDocument(workspaceRootPath, decisionId, workspaceId)
    if (!decision) return { success: false, error: 'Decision not found' }

    const updated: DecisionDocument = {
      ...decision,
      links: removeDecisionLinks(decision.links, links),
      updatedAt: Date.now(),
    }

    writeDecision(workspaceRootPath, updated)
    upsertDecisionIndexEntry(workspaceRootPath, updated)

    return { success: true, decision: updated }
  } catch (error) {
    debug('[decision-storage] Failed to unlink decision objects:', decisionId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listDecisionEntries(workspaceRootPath: string, workspaceId?: string, projectId?: string): DecisionIndexEntry[] {
  const index = loadDecisionIndex(workspaceRootPath)
  const entries = index.decisions.filter(entry => {
    if (workspaceId && entry.workspaceId !== workspaceId) return false
    if (projectId && !entry.projectIds.includes(projectId)) return false
    return true
  })
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function deleteDecisionDocument(
  workspaceRootPath: string,
  decisionId: string,
  workspaceId?: string
): DeleteDecisionResult {
  try {
    assertSafeDecisionId(decisionId)
    const decisionPath = getDecisionDocumentPath(workspaceRootPath, decisionId)

    if (workspaceId) {
      const existing = readDecisionDocument(workspaceRootPath, decisionId, workspaceId)
      if (!existing) return { success: false, error: 'Decision not found' }
    }

    if (existsSync(decisionPath)) {
      unlinkSync(decisionPath)
    }

    mutateDecisionIndex(workspaceRootPath, (index) => {
      index.decisions = index.decisions.filter(entry => entry.id !== decisionId)
    })

    return { success: true }
  } catch (error) {
    debug('[decision-storage] Failed to delete decision:', decisionId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
