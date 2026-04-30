import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import { atomicWriteFileSync, readJsonFileSync } from '../utils/files'
import { debug } from '../utils/debug'
import { createPageDocument } from '../pages/storage'
import type {
  CreateOutputInput,
  DeleteOutputResult,
  OutputDocument,
  OutputIndex,
  OutputIndexEntry,
  OutputMutationResult,
  PromoteOutputResult,
  UpdateOutputInput,
} from './types'

const OUTPUTS_DIR = 'outputs'
const OUTPUT_INDEX_FILE = 'outputs/index.json'
const CURRENT_INDEX_VERSION = 1
const SAFE_OUTPUT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function getOutputsDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, OUTPUTS_DIR)
}

export function getOutputIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, OUTPUT_INDEX_FILE)
}

export function getOutputDocumentPath(workspaceRootPath: string, outputId: string): string {
  assertSafeOutputId(outputId)
  const outputsDir = resolve(getOutputsDirectoryPath(workspaceRootPath))
  const outputPath = resolve(outputsDir, `${outputId}.json`)
  assertPathInsideDirectory(outputPath, outputsDir)
  return outputPath
}

export function isSafeOutputId(outputId: string): boolean {
  return SAFE_OUTPUT_ID_PATTERN.test(outputId)
}

export function assertSafeOutputId(outputId: string): void {
  if (
    !outputId ||
    !isSafeOutputId(outputId) ||
    outputId.includes('..') ||
    outputId.includes('/') ||
    outputId.includes('\\') ||
    outputId !== basename(outputId) ||
    resolve(outputId) === outputId
  ) {
    throw new Error('Invalid output ID')
  }
}

function assertPathInsideDirectory(filePath: string, directoryPath: string): void {
  const relativePath = relative(directoryPath, filePath)
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes('..') || resolve(relativePath) === relativePath) {
    throw new Error('Invalid output path')
  }
}

export function ensureOutputsDirectory(workspaceRootPath: string): void {
  const outputsDir = getOutputsDirectoryPath(workspaceRootPath)
  if (!existsSync(outputsDir)) {
    mkdirSync(outputsDir, { recursive: true })
    debug('[output-storage] Created outputs directory:', outputsDir)
  }
}

export function extractOutputTitle(content: string): string {
  if (!content.trim()) return 'Untitled Output'
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match?.[1]) return h1Match[1].trim().slice(0, 160)
  const h2Match = content.match(/^##\s+(.+)$/m)
  if (h2Match?.[1]) return h2Match[1].trim().slice(0, 160)
  const firstLine = content.split('\n').find(line => line.trim())
  return firstLine ? firstLine.trim().replace(/^[-*#>\s]+/, '').slice(0, 160) : 'Untitled Output'
}

function buildPreview(content: string): string {
  return content
    .replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function toIndexEntry(output: OutputDocument): OutputIndexEntry {
  return {
    id: output.id,
    workspaceId: output.workspaceId,
    title: output.title,
    kind: output.kind,
    contentType: output.contentType,
    sourceSessionId: output.sourceSessionId,
    sourceMessageId: output.sourceMessageId,
    sourceToolCallId: output.sourceToolCallId,
    createdAt: output.createdAt,
    updatedAt: output.updatedAt,
    promotedDocId: output.promotedDocId,
    status: output.status,
    preview: buildPreview(output.content),
  }
}

function readOutputFile(workspaceRootPath: string, outputId: string): OutputDocument | null {
  try {
    const outputPath = getOutputDocumentPath(workspaceRootPath, outputId)
    if (!existsSync(outputPath)) return null
    const output = readJsonFileSync<OutputDocument>(outputPath)
    if (!output || typeof output !== 'object' || output.id !== outputId) return null
    return {
      ...output,
      kind: output.kind || 'generic',
      contentType: output.contentType || 'markdown',
      status: output.status || 'saved',
    }
  } catch (error) {
    debug('[output-storage] Failed to read output file:', outputId, error)
    return null
  }
}

function scanOutputs(workspaceRootPath: string, workspaceId?: string): OutputDocument[] {
  ensureOutputsDirectory(workspaceRootPath)
  const outputsDir = getOutputsDirectoryPath(workspaceRootPath)
  const outputs: OutputDocument[] = []
  try {
    const entries = readdirSync(outputsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue
      const outputId = entry.name.slice(0, -5)
      if (!isSafeOutputId(outputId)) {
        debug('[output-storage] Skipping unsafe output filename during rebuild:', entry.name)
        continue
      }
      const output = readOutputFile(workspaceRootPath, outputId)
      if (!output) continue
      if (workspaceId && output.workspaceId !== workspaceId) continue
      outputs.push(output)
    }
  } catch (error) {
    debug('[output-storage] Failed to scan outputs directory:', error)
  }
  return outputs
}

export function saveOutputIndex(workspaceRootPath: string, index: OutputIndex): void {
  ensureOutputsDirectory(workspaceRootPath)
  atomicWriteFileSync(getOutputIndexPath(workspaceRootPath), JSON.stringify(index, null, 2))
}

export function rebuildOutputIndex(workspaceRootPath: string, workspaceId?: string): OutputIndex {
  const outputs = scanOutputs(workspaceRootPath)
  const index: OutputIndex = {
    version: CURRENT_INDEX_VERSION,
    outputs: outputs.map(toIndexEntry),
  }
  try {
    saveOutputIndex(workspaceRootPath, index)
  } catch {}
  return index
}

function repairOutputIndex(workspaceRootPath: string, index: OutputIndex, workspaceId?: string): OutputIndex {
  const repaired: OutputIndex = { version: CURRENT_INDEX_VERSION, outputs: [] }
  const seen = new Set<string>()
  let changed = index.version !== CURRENT_INDEX_VERSION

  for (const entry of index.outputs) {
    if (!entry || typeof entry.id !== 'string' || !isSafeOutputId(entry.id) || seen.has(entry.id)) {
      changed = true
      continue
    }
    const output = readOutputFile(workspaceRootPath, entry.id)
    if (!output) {
      changed = true
      continue
    }
    repaired.outputs.push(toIndexEntry(output))
    seen.add(output.id)
  }

  for (const output of scanOutputs(workspaceRootPath)) {
    if (seen.has(output.id)) continue
    repaired.outputs.push(toIndexEntry(output))
    seen.add(output.id)
    changed = true
  }

  if (changed) {
    try {
      saveOutputIndex(workspaceRootPath, repaired)
    } catch {}
  }
  return repaired
}

export function loadOutputIndex(workspaceRootPath: string, workspaceId?: string): OutputIndex {
  const indexPath = getOutputIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    return rebuildOutputIndex(workspaceRootPath)
  }
  try {
    const index = readJsonFileSync<OutputIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.outputs)) {
      return rebuildOutputIndex(workspaceRootPath)
    }
    if (index.version !== CURRENT_INDEX_VERSION) {
      return repairOutputIndex(workspaceRootPath, index, workspaceId)
    }
    return index
  } catch (error) {
    debug('[output-storage] Failed to load index, attempting rebuild:', error)
    return rebuildOutputIndex(workspaceRootPath)
  }
}

export function readOutputDocument(
  workspaceRootPath: string,
  outputId: string,
  workspaceId?: string
): OutputDocument | null {
  const output = readOutputFile(workspaceRootPath, outputId)
  if (!output) return null
  if (workspaceId && output.workspaceId !== workspaceId) return null
  return output
}

export function createOutputDocument(
  workspaceRootPath: string,
  workspaceId: string,
  input: CreateOutputInput
): OutputMutationResult {
  try {
    ensureOutputsDirectory(workspaceRootPath)
    const outputId = `output_${randomUUID().slice(0, 8)}`
    const now = Date.now()
    const content = input.content || ''
    const output: OutputDocument = {
      id: outputId,
      workspaceId,
      title: input.title || extractOutputTitle(content),
      kind: input.kind || 'generic',
      content,
      contentType: input.contentType || 'markdown',
      sourceSessionId: input.sourceSessionId,
      sourceMessageId: input.sourceMessageId,
      sourceToolCallId: input.sourceToolCallId,
      createdAt: now,
      updatedAt: now,
      status: input.status || 'saved',
    }
    atomicWriteFileSync(getOutputDocumentPath(workspaceRootPath, outputId), JSON.stringify(output, null, 2))
    const index = loadOutputIndex(workspaceRootPath, workspaceId)
    const entry = toIndexEntry(output)
    const outputIndex = index.outputs.findIndex(item => item.id === outputId)
    if (outputIndex === -1) {
      index.outputs.push(entry)
    } else {
      index.outputs[outputIndex] = entry
    }
    saveOutputIndex(workspaceRootPath, index)
    return { success: true, output }
  } catch (error) {
    debug('[output-storage] Failed to create output:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function updateOutputDocument(
  workspaceRootPath: string,
  outputId: string,
  input: UpdateOutputInput,
  workspaceId?: string
): OutputMutationResult {
  try {
    assertSafeOutputId(outputId)
    const output = readOutputDocument(workspaceRootPath, outputId, workspaceId)
    if (!output) return { success: false, error: 'Output not found' }

    const updated: OutputDocument = {
      ...output,
      ...input,
      id: output.id,
      workspaceId: output.workspaceId,
      updatedAt: Date.now(),
    }
    if (input.content !== undefined && input.title === undefined) {
      updated.title = output.title || extractOutputTitle(input.content)
    }

    atomicWriteFileSync(getOutputDocumentPath(workspaceRootPath, outputId), JSON.stringify(updated, null, 2))
    const index = loadOutputIndex(workspaceRootPath, workspaceId)
    const entry = toIndexEntry(updated)
    const outputIndex = index.outputs.findIndex(item => item.id === outputId)
    if (outputIndex === -1) {
      index.outputs.push(entry)
    } else {
      index.outputs[outputIndex] = entry
    }
    saveOutputIndex(workspaceRootPath, index)
    return { success: true, output: updated }
  } catch (error) {
    debug('[output-storage] Failed to update output:', outputId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listOutputDocuments(workspaceRootPath: string, workspaceId?: string): OutputDocument[] {
  const index = loadOutputIndex(workspaceRootPath, workspaceId)
  return index.outputs
    .filter(output => !workspaceId || output.workspaceId === workspaceId)
    .map(output => readOutputDocument(workspaceRootPath, output.id, workspaceId))
    .filter((output): output is OutputDocument => Boolean(output))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function listOutputEntries(workspaceRootPath: string, workspaceId?: string): OutputIndexEntry[] {
  const index = loadOutputIndex(workspaceRootPath, workspaceId)
  return index.outputs
    .filter(output => !workspaceId || output.workspaceId === workspaceId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function deleteOutputDocument(workspaceRootPath: string, outputId: string, workspaceId?: string): DeleteOutputResult {
  try {
    assertSafeOutputId(outputId)
    const outputPath = getOutputDocumentPath(workspaceRootPath, outputId)
    const existingOutput = readOutputDocument(workspaceRootPath, outputId, workspaceId)
    if (workspaceId && !existingOutput) return { success: false, error: 'Output not found' }
    if (existsSync(outputPath)) {
      unlinkSync(outputPath)
    }
    const index = loadOutputIndex(workspaceRootPath, workspaceId)
    index.outputs = index.outputs.filter(output => output.id !== outputId)
    saveOutputIndex(workspaceRootPath, index)
    return { success: true }
  } catch (error) {
    debug('[output-storage] Failed to delete output:', outputId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function promoteOutputToPageDocument(
  workspaceRootPath: string,
  workspaceId: string,
  outputId: string
): PromoteOutputResult {
  const output = readOutputDocument(workspaceRootPath, outputId, workspaceId)
  if (!output) return { success: false, error: 'Output not found' }

  const pageResult = createPageDocument(workspaceRootPath, workspaceId, {
    title: output.title,
    content: output.content,
    sourceSessionId: output.sourceSessionId,
    sourceMessageId: output.sourceMessageId,
  })
  if (!pageResult.success || !pageResult.page) {
    return { success: false, error: pageResult.error || 'Failed to promote output' }
  }

  const updateResult = updateOutputDocument(workspaceRootPath, outputId, {
    promotedDocId: pageResult.page.id,
    status: 'promoted',
  }, workspaceId)
  if (!updateResult.success || !updateResult.output) {
    return { success: false, error: updateResult.error || 'Failed to update promoted output' }
  }
  return { success: true, output: updateResult.output, page: pageResult.page }
}

export function getOutputCount(workspaceRootPath: string, workspaceId?: string): number {
  return listOutputEntries(workspaceRootPath, workspaceId).length
}
