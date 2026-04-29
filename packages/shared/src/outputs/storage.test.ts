import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  assertSafeOutputId,
  createOutputDocument,
  deleteOutputDocument,
  getOutputDocumentPath,
  listOutputDocuments,
  promoteOutputToPageDocument,
  readOutputDocument,
  updateOutputDocument,
} from './storage'
import { readPageDocument } from '../pages/storage'

describe('output storage', () => {
  let workspaceRootPath: string

  beforeEach(() => {
    workspaceRootPath = join(tmpdir(), `craft-output-storage-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(workspaceRootPath, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(workspaceRootPath)) {
      rmSync(workspaceRootPath, { recursive: true, force: true })
    }
  })

  it('creates, reads, updates, and deletes outputs in one workspace', () => {
    const created = createOutputDocument(workspaceRootPath, 'workspace-a', {
      title: 'Output A',
      content: '# Output A\n\nInitial',
      kind: 'assistant_response',
      sourceSessionId: 'session-a',
      sourceMessageId: 'message-a',
    })

    expect(created.success).toBe(true)
    expect(created.output?.workspaceId).toBe('workspace-a')
    expect(created.output?.status).toBe('saved')

    const outputId = created.output!.id
    const updated = updateOutputDocument(workspaceRootPath, outputId, { content: '# Output A\n\nUpdated' }, 'workspace-a')
    expect(updated.success).toBe(true)
    expect(readOutputDocument(workspaceRootPath, outputId, 'workspace-a')?.content).toContain('Updated')

    expect(deleteOutputDocument(workspaceRootPath, outputId, 'workspace-a').success).toBe(true)
    expect(readOutputDocument(workspaceRootPath, outputId, 'workspace-a')).toBeNull()
  })

  it('scopes outputs by workspace id', () => {
    const outputA = createOutputDocument(workspaceRootPath, 'workspace-a', { content: 'A' }).output!
    createOutputDocument(workspaceRootPath, 'workspace-b', { content: 'B' })

    expect(listOutputDocuments(workspaceRootPath, 'workspace-a').map(output => output.workspaceId)).toEqual(['workspace-a'])
    expect(listOutputDocuments(workspaceRootPath, 'workspace-b').map(output => output.workspaceId)).toEqual(['workspace-b'])
    expect(readOutputDocument(workspaceRootPath, outputA.id, 'workspace-b')).toBeNull()
    expect(updateOutputDocument(workspaceRootPath, outputA.id, { content: 'wrong workspace' }, 'workspace-b').success).toBe(false)
  })

  it.each([
    '../bad',
    '..',
    'foo/bar',
    'foo\\bar',
    'C:\\temp\\bad',
    'bad id',
    'bad.json',
  ])('rejects unsafe output id "%s"', (outputId) => {
    expect(() => assertSafeOutputId(outputId)).toThrow()
    expect(() => getOutputDocumentPath(workspaceRootPath, outputId)).toThrow()
  })

  it('recovers outputs from a missing index', () => {
    mkdirSync(join(workspaceRootPath, 'outputs'), { recursive: true })
    writeFileSync(join(workspaceRootPath, 'outputs', 'output_recovered.json'), JSON.stringify({
      id: 'output_recovered',
      workspaceId: 'workspace-a',
      title: 'Recovered Output',
      kind: 'generic',
      content: 'Recovered body',
      contentType: 'markdown',
      createdAt: 1,
      updatedAt: 2,
      status: 'saved',
    }))

    const outputs = listOutputDocuments(workspaceRootPath, 'workspace-a')

    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.id).toBe('output_recovered')
    expect(outputs[0]?.title).toBe('Recovered Output')
  })

  it('recovers outputs from a corrupt index', () => {
    mkdirSync(join(workspaceRootPath, 'outputs'), { recursive: true })
    writeFileSync(join(workspaceRootPath, 'outputs', 'index.json'), '{not json')
    writeFileSync(join(workspaceRootPath, 'outputs', 'output_safe.json'), JSON.stringify({
      id: 'output_safe',
      workspaceId: 'workspace-a',
      title: 'Safe Output',
      kind: 'generic',
      content: 'Safe body',
      contentType: 'markdown',
      createdAt: 1,
      updatedAt: 2,
      status: 'saved',
    }))

    const outputs = listOutputDocuments(workspaceRootPath, 'workspace-a')

    expect(outputs.map(output => output.id)).toEqual(['output_safe'])
    expect(readFileSync(join(workspaceRootPath, 'outputs', 'index.json'), 'utf-8')).toContain('output_safe')
  })

  it('promotes an output to a doc and marks the output promoted', () => {
    const output = createOutputDocument(workspaceRootPath, 'workspace-a', {
      title: 'Draft Summary',
      content: '# Draft Summary\n\nPromote me',
      kind: 'research_note',
      sourceSessionId: 'session-a',
      sourceMessageId: 'message-a',
    }).output!

    const promoted = promoteOutputToPageDocument(workspaceRootPath, 'workspace-a', output.id)

    expect(promoted.success).toBe(true)
    expect(promoted.page?.title).toBe('Draft Summary')
    expect(promoted.output?.status).toBe('promoted')
    expect(promoted.output?.promotedDocId).toBe(promoted.page?.id)
    expect(readPageDocument(workspaceRootPath, promoted.page!.id, 'workspace-a')?.content).toContain('Promote me')
  })
})
