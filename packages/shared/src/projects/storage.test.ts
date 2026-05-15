import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  assertSafeProjectId,
  createProjectDocument,
  deleteProjectDocument,
  getProjectDocumentPath,
  getProjectIndexLockPath,
  linkProjectObjects,
  listProjectEntries,
  loadProjectIndex,
  readProjectDocument,
  rebuildProjectIndex,
  unlinkProjectObjects,
  updateProjectDocument,
} from './storage'

describe('Project Storage', () => {
  let workspaceRootPath: string
  const workspaceId = 'test-workspace'

  beforeEach(() => {
    workspaceRootPath = join(tmpdir(), `craft-project-test-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(workspaceRootPath, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(workspaceRootPath)) {
      rmSync(workspaceRootPath, { recursive: true, force: true })
    }
  })

  it('creates and reads a workspace-scoped Project with optional links', () => {
    const result = createProjectDocument(workspaceRootPath, workspaceId, {
      name: 'Launch Plan',
      description: 'Ship the first project model',
      status: 'active',
      links: {
        sessionIds: ['session-a'],
        docIds: ['doc-a'],
        outputIds: ['output-a'],
        workItemIds: ['workitem-a'],
      },
    })

    expect(result.success).toBe(true)
    expect(result.project?.id).toStartWith('project_')
    expect(result.project?.workspaceId).toBe(workspaceId)
    expect(result.project?.links.sessionIds).toEqual(['session-a'])
    expect(result.project?.links.docIds).toEqual(['doc-a'])
    expect(result.project?.links.outputIds).toEqual(['output-a'])
    expect(result.project?.links.workItemIds).toEqual(['workitem-a'])

    const read = readProjectDocument(workspaceRootPath, result.project!.id, workspaceId)
    expect(read?.name).toBe('Launch Plan')
    expect(read?.links.sourceIds).toEqual([])
  })

  it('normalizes project links and external refs without requiring object migration', () => {
    const result = createProjectDocument(workspaceRootPath, workspaceId, {
      name: 'Optional Links',
      links: {
        sessionIds: [' session-a ', 'session-a', '', 'session-b'],
        decisionIds: ['decision-a'],
      },
      externalRefs: [' https://github.com/example/project ', '', 'https://github.com/example/project'],
    })

    expect(result.project?.links.sessionIds).toEqual(['session-a', 'session-b'])
    expect(result.project?.links.decisionIds).toEqual(['decision-a'])
    expect(result.project?.externalRefs).toEqual(['https://github.com/example/project'])
  })

  it('updates Project metadata and replaces explicit link sets', () => {
    const project = createProjectDocument(workspaceRootPath, workspaceId, {
      name: 'Original',
      links: { docIds: ['doc-a'] },
    }).project!

    const updated = updateProjectDocument(workspaceRootPath, project.id, {
      name: 'Updated',
      status: 'paused',
      links: { outputIds: ['output-a'] },
    }, workspaceId)

    expect(updated.success).toBe(true)
    expect(updated.project?.name).toBe('Updated')
    expect(updated.project?.status).toBe('paused')
    expect(updated.project?.links.docIds).toEqual([])
    expect(updated.project?.links.outputIds).toEqual(['output-a'])
  })

  it('links and unlinks objects idempotently while keeping index counts current', () => {
    const project = createProjectDocument(workspaceRootPath, workspaceId, { name: 'Linked Project' }).project!

    const linked = linkProjectObjects(workspaceRootPath, project.id, {
      docIds: ['doc-a', 'doc-a', 'doc-b'],
      workItemIds: ['workitem-a'],
    }, workspaceId)

    expect(linked.success).toBe(true)
    expect(linked.project?.links.docIds).toEqual(['doc-a', 'doc-b'])
    expect(linked.project?.links.workItemIds).toEqual(['workitem-a'])

    const unlinked = unlinkProjectObjects(workspaceRootPath, project.id, {
      docIds: ['doc-a', 'missing-doc'],
    }, workspaceId)

    expect(unlinked.success).toBe(true)
    expect(unlinked.project?.links.docIds).toEqual(['doc-b'])

    const entry = listProjectEntries(workspaceRootPath, workspaceId)[0]
    expect(entry?.linkCounts.docCount).toBe(1)
    expect(entry?.linkCounts.workItemCount).toBe(1)
  })

  it('lists Projects sorted by updatedAt through the index', async () => {
    createProjectDocument(workspaceRootPath, workspaceId, { name: 'Oldest' })
    await new Promise(resolve => setTimeout(resolve, 20))
    createProjectDocument(workspaceRootPath, workspaceId, { name: 'Newest' })

    const entries = listProjectEntries(workspaceRootPath, workspaceId)

    expect(entries).toHaveLength(2)
    expect(entries[0]!.name).toBe('Newest')
    expect(entries[1]!.name).toBe('Oldest')
  })

  it('rebuilds the index from project files when missing', () => {
    createProjectDocument(workspaceRootPath, workspaceId, { name: 'Project A' })
    createProjectDocument(workspaceRootPath, workspaceId, { name: 'Project B' })
    const indexPath = join(workspaceRootPath, 'projects', 'index.json')
    rmSync(indexPath)

    const rebuilt = rebuildProjectIndex(workspaceRootPath)

    expect(rebuilt.projects).toHaveLength(2)
    expect(existsSync(indexPath)).toBe(true)
  })

  it('recovers from a corrupt index file', () => {
    createProjectDocument(workspaceRootPath, workspaceId, { name: 'Safe Project' })
    const indexPath = join(workspaceRootPath, 'projects', 'index.json')
    writeFileSync(indexPath, '{ "corrupt": "missing closing bracket"')

    const index = loadProjectIndex(workspaceRootPath)

    expect(index.projects).toHaveLength(1)
    expect(index.projects[0]!.name).toBe('Safe Project')
  })

  it('enforces workspace isolation for reads and mutations', () => {
    const project = createProjectDocument(workspaceRootPath, 'workspace-a', { name: 'Workspace A' }).project!
    createProjectDocument(workspaceRootPath, 'workspace-b', { name: 'Workspace B' })

    expect(readProjectDocument(workspaceRootPath, project.id, 'workspace-b')).toBeNull()
    expect(updateProjectDocument(workspaceRootPath, project.id, { name: 'Stolen' }, 'workspace-b').success).toBe(false)
    expect(linkProjectObjects(workspaceRootPath, project.id, { docIds: ['stolen'] }, 'workspace-b').success).toBe(false)
    expect(unlinkProjectObjects(workspaceRootPath, project.id, { docIds: ['doc-a'] }, 'workspace-b').success).toBe(false)
    expect(deleteProjectDocument(workspaceRootPath, project.id, 'workspace-b').success).toBe(false)
    expect(listProjectEntries(workspaceRootPath, 'workspace-a')).toHaveLength(1)
    expect(listProjectEntries(workspaceRootPath, 'workspace-b')).toHaveLength(1)
  })

  it('releases the index lock after index mutations', () => {
    const project = createProjectDocument(workspaceRootPath, workspaceId, { name: 'Locked Project' }).project!
    const lockPath = getProjectIndexLockPath(workspaceRootPath)

    expect(existsSync(lockPath)).toBe(false)
    expect(updateProjectDocument(workspaceRootPath, project.id, { name: 'Updated Locked Project' }, workspaceId).success).toBe(true)
    expect(existsSync(lockPath)).toBe(false)
    expect(linkProjectObjects(workspaceRootPath, project.id, { docIds: ['doc-a'] }, workspaceId).success).toBe(true)
    expect(existsSync(lockPath)).toBe(false)
    expect(deleteProjectDocument(workspaceRootPath, project.id, workspaceId).success).toBe(true)
    expect(existsSync(lockPath)).toBe(false)
  })

  it.each([
    '../forbidden',
    'sub/dir/id',
    '..',
    'id with spaces',
    'C:\\Windows\\System32',
  ])('rejects unsafe Project ID: %s', (unsafeId) => {
    expect(() => assertSafeProjectId(unsafeId)).toThrow()
    expect(() => getProjectDocumentPath(workspaceRootPath, unsafeId)).toThrow()
  })
})
