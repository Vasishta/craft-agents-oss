import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  assertSafePageId,
  createPageDocument,
  deletePageDocument,
  getPageMarkdownPath,
  listPageDocuments,
  readPageDocument,
  updatePageContent,
} from './storage'

describe('page storage hardening', () => {
  let workspaceRootPath: string

  beforeEach(() => {
    workspaceRootPath = join(tmpdir(), `craft-page-storage-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(workspaceRootPath, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(workspaceRootPath)) {
      rmSync(workspaceRootPath, { recursive: true, force: true })
    }
  })

  it('creates, reads, updates, and deletes docs in one workspace', () => {
    const created = createPageDocument(workspaceRootPath, 'workspace-a', {
      title: 'Doc A',
      content: '# Doc A\n\nInitial',
    })

    expect(created.success).toBe(true)
    expect(created.page?.workspaceId).toBe('workspace-a')

    const pageId = created.page!.id
    const updated = updatePageContent(workspaceRootPath, pageId, '# Doc A\n\nUpdated', 'workspace-a')
    expect(updated.success).toBe(true)
    expect(readPageDocument(workspaceRootPath, pageId, 'workspace-a')?.content).toContain('Updated')

    expect(deletePageDocument(workspaceRootPath, pageId, 'workspace-a').success).toBe(true)
    expect(readPageDocument(workspaceRootPath, pageId, 'workspace-a')).toBeNull()
  })

  it('scopes docs by workspace id', () => {
    const pageA = createPageDocument(workspaceRootPath, 'workspace-a', { content: 'A' }).page!
    createPageDocument(workspaceRootPath, 'workspace-b', { content: 'B' })

    expect(listPageDocuments(workspaceRootPath, 'workspace-a').map(page => page.workspaceId)).toEqual(['workspace-a'])
    expect(readPageDocument(workspaceRootPath, pageA.id, 'workspace-b')).toBeNull()
    expect(updatePageContent(workspaceRootPath, pageA.id, 'wrong workspace', 'workspace-b').success).toBe(false)
  })

  it.each([
    '../bad',
    '..',
    'foo/bar',
    'foo\\bar',
    'C:\\temp\\bad',
    'bad id',
    'bad.md',
  ])('rejects unsafe doc id "%s"', (pageId) => {
    expect(() => assertSafePageId(pageId)).toThrow()
    expect(() => getPageMarkdownPath(workspaceRootPath, pageId)).toThrow()
  })

  it('recovers docs from a missing index', () => {
    mkdirSync(join(workspaceRootPath, 'pages'), { recursive: true })
    writeFileSync(join(workspaceRootPath, 'pages', 'page_recovered.md'), '# Recovered\n\nBody')

    const pages = listPageDocuments(workspaceRootPath, 'workspace-a')

    expect(pages).toHaveLength(1)
    expect(pages[0]?.id).toBe('page_recovered')
    expect(pages[0]?.title).toBe('Recovered')
    expect(pages[0]?.workspaceId).toBe('workspace-a')
  })

  it('recovers docs from a corrupt index', () => {
    mkdirSync(join(workspaceRootPath, 'pages'), { recursive: true })
    writeFileSync(join(workspaceRootPath, 'pages', 'index.json'), '{not json')
    writeFileSync(join(workspaceRootPath, 'pages', 'page_safe.md'), '# Safe Doc')

    const pages = listPageDocuments(workspaceRootPath, 'workspace-a')

    expect(pages.map(page => page.id)).toEqual(['page_safe'])
    expect(readFileSync(join(workspaceRootPath, 'pages', 'index.json'), 'utf-8')).toContain('page_safe')
  })

  it('does not recreate a deleted doc through content update', () => {
    const page = createPageDocument(workspaceRootPath, 'workspace-a', { content: 'Draft' }).page!
    expect(deletePageDocument(workspaceRootPath, page.id, 'workspace-a').success).toBe(true)

    const staleSave = updatePageContent(workspaceRootPath, page.id, 'Stale save', 'workspace-a')

    expect(staleSave.success).toBe(false)
    expect(existsSync(join(workspaceRootPath, 'pages', `${page.id}.md`))).toBe(false)
  })
})
