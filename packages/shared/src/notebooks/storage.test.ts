import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createNotebookDocument,
  deleteNotebookDocument,
  getNotebookDocumentPath,
  getNotebookIndexPath,
  linkNotebookObjects,
  listNotebookEntries,
  loadNotebookIndex,
  readNotebookDocument,
  unlinkNotebookObjects,
  updateNotebookDocument,
} from './storage'

describe('Notebook Storage', () => {
  let workspaceRootPath: string
  const workspaceId = 'workspace-a'

  beforeEach(() => {
    workspaceRootPath = mkdtempSync(join(tmpdir(), 'notebook-storage-'))
  })

  afterEach(() => {
    rmSync(workspaceRootPath, { recursive: true, force: true })
  })

  it('creates and reads a workspace-scoped Notebook as a view over linked objects', () => {
    const result = createNotebookDocument(workspaceRootPath, workspaceId, {
      title: 'Research notebook',
      description: 'Curated source and output links.',
      links: {
        projectIds: ['project-a'],
        docIds: ['doc-a'],
        outputIds: ['output-a'],
      },
      sections: [
        {
          title: 'References',
          links: { sourceIds: ['source-a'] },
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.notebook?.id).toStartWith('notebook_')

    const read = readNotebookDocument(workspaceRootPath, result.notebook!.id, workspaceId)
    expect(read?.title).toBe('Research notebook')
    expect(read?.links.docIds).toEqual(['doc-a'])
    expect(read).not.toBeNull()
    expect(read!.sections[0]!.links.sourceIds).toEqual(['source-a'])
  })

  it('rejects missing titles', () => {
    expect(createNotebookDocument(workspaceRootPath, workspaceId, { title: '' }).success).toBe(false)
  })

  it('normalizes links, sections, and external refs', () => {
    const result = createNotebookDocument(workspaceRootPath, workspaceId, {
      title: 'Normalize',
      links: {
        projectIds: [' project-a ', 'project-a', ''],
      },
      sections: [
        { id: 'section-a', title: ' Section A ', links: { docIds: ['doc-a', 'doc-a'] } },
        { id: 'section-a', title: 'Duplicate section id', links: { docIds: ['doc-b'] } },
        { title: ' ', links: { docIds: ['doc-c'] } },
      ],
      externalRefs: [' https://example.com/notebook ', 'https://example.com/notebook', ''],
    })

    expect(result.notebook?.links.projectIds).toEqual(['project-a'])
    expect(result.notebook?.sections).toHaveLength(1)
    expect(result.notebook?.sections[0]).toMatchObject({
      id: 'section-a',
      title: 'Section A',
      links: { docIds: ['doc-a'] },
    })
    expect(result.notebook?.externalRefs).toEqual(['https://example.com/notebook'])
  })

  it('updates metadata and replaces explicit link and section sets', () => {
    const notebook = createNotebookDocument(workspaceRootPath, workspaceId, {
      title: 'Old',
      links: { projectIds: ['project-a'] },
    }).notebook!

    const updated = updateNotebookDocument(workspaceRootPath, notebook.id, {
      title: 'New',
      status: 'archived',
      links: { projectIds: ['project-b'], decisionIds: ['decision-b'] },
      sections: [{ title: 'Decisions', links: { decisionIds: ['decision-b'] } }],
    }, workspaceId)

    expect(updated.success).toBe(true)
    expect(updated.notebook?.title).toBe('New')
    expect(updated.notebook?.status).toBe('archived')
    expect(updated.notebook?.links.projectIds).toEqual(['project-b'])
    expect(updated.notebook?.sections).toHaveLength(1)
  })

  it('links and unlinks objects idempotently while keeping index counts current', () => {
    const notebook = createNotebookDocument(workspaceRootPath, workspaceId, { title: 'Linking' }).notebook!

    linkNotebookObjects(workspaceRootPath, notebook.id, {
      projectIds: ['project-a', 'project-a'],
      docIds: ['doc-a'],
    }, workspaceId)
    unlinkNotebookObjects(workspaceRootPath, notebook.id, { projectIds: ['missing'] }, workspaceId)
    unlinkNotebookObjects(workspaceRootPath, notebook.id, { projectIds: ['project-a'] }, workspaceId)

    const read = readNotebookDocument(workspaceRootPath, notebook.id, workspaceId)
    expect(read?.links.projectIds).toEqual([])
    expect(read?.links.docIds).toEqual(['doc-a'])

    const entry = listNotebookEntries(workspaceRootPath, workspaceId)[0]!
    expect(entry.linkCounts.projectCount).toBe(0)
    expect(entry.linkCounts.docCount).toBe(1)
  })

  it('lists Notebooks sorted by updatedAt and can filter by project', () => {
    createNotebookDocument(workspaceRootPath, workspaceId, {
      title: 'Oldest',
      links: { projectIds: ['project-a'] },
    })
    const newest = createNotebookDocument(workspaceRootPath, workspaceId, {
      title: 'Newest',
      links: { projectIds: ['project-b'] },
    }).notebook!

    const all = listNotebookEntries(workspaceRootPath, workspaceId)
    const newestEntry = all[0]!
    expect(newestEntry.id).toBe(newest.id)

    const projectB = listNotebookEntries(workspaceRootPath, workspaceId, 'project-b')
    expect(projectB.map(entry => entry.id)).toEqual([newest.id])
  })

  it('rebuilds the index from notebook files when missing', () => {
    createNotebookDocument(workspaceRootPath, workspaceId, { title: 'A' })
    createNotebookDocument(workspaceRootPath, workspaceId, { title: 'B' })
    unlinkSync(getNotebookIndexPath(workspaceRootPath))

    const rebuilt = loadNotebookIndex(workspaceRootPath)
    expect(rebuilt.notebooks).toHaveLength(2)
  })

  it('recovers from a corrupt index file', () => {
    createNotebookDocument(workspaceRootPath, workspaceId, { title: 'Safe' })
    writeFileSync(getNotebookIndexPath(workspaceRootPath), '{bad json')

    const rebuilt = loadNotebookIndex(workspaceRootPath)
    expect(rebuilt.notebooks).toHaveLength(1)
    expect(rebuilt.notebooks[0]!.title).toBe('Safe')
  })

  it('enforces workspace isolation for reads and mutations', () => {
    const notebook = createNotebookDocument(workspaceRootPath, 'workspace-a', { title: 'Workspace A' }).notebook!
    createNotebookDocument(workspaceRootPath, 'workspace-b', { title: 'Workspace B' })

    expect(readNotebookDocument(workspaceRootPath, notebook.id, 'workspace-b')).toBeNull()
    expect(updateNotebookDocument(workspaceRootPath, notebook.id, { title: 'Stolen' }, 'workspace-b').success).toBe(false)
    expect(linkNotebookObjects(workspaceRootPath, notebook.id, { docIds: ['stolen'] }, 'workspace-b').success).toBe(false)
    expect(unlinkNotebookObjects(workspaceRootPath, notebook.id, { docIds: ['doc-a'] }, 'workspace-b').success).toBe(false)
    expect(deleteNotebookDocument(workspaceRootPath, notebook.id, 'workspace-b').success).toBe(false)
    expect(listNotebookEntries(workspaceRootPath, 'workspace-b')).toHaveLength(1)
  })

  it('deletes Notebook documents without deleting linked workspace objects', () => {
    const notebook = createNotebookDocument(workspaceRootPath, workspaceId, {
      title: 'Delete collection',
      links: { docIds: ['doc-a'], outputIds: ['output-a'] },
    }).notebook!

    expect(deleteNotebookDocument(workspaceRootPath, notebook.id, workspaceId).success).toBe(true)
    expect(readNotebookDocument(workspaceRootPath, notebook.id, workspaceId)).toBeNull()
    expect(listNotebookEntries(workspaceRootPath, workspaceId)).toHaveLength(0)
  })

  it.each(['../forbidden', 'sub/dir/id', '..', 'id with spaces', 'C:\\Windows\\System32'])('rejects unsafe Notebook ID: %s', (unsafeId) => {
    expect(() => getNotebookDocumentPath(workspaceRootPath, unsafeId)).toThrow()
  })
})
