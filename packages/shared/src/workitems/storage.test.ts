import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { rmSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createWorkItemDocument,
  readWorkItemDocument,
  updateWorkItemDocument,
  deleteWorkItemDocument,
  listWorkItemEntries,
  rebuildWorkItemIndex,
  assertSafeWorkItemId,
  getWorkItemDocumentPath,
  getWorkItemIndexLockPath,
  loadWorkItemIndex,
} from './storage'

describe('WorkItem Storage', () => {
  let workspaceRootPath: string
  const workspaceId = 'test-workspace'

  beforeEach(() => {
    workspaceRootPath = join(tmpdir(), `craft-workitem-test-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(workspaceRootPath, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(workspaceRootPath)) {
      rmSync(workspaceRootPath, { recursive: true, force: true })
    }
  })

  it('should create and read a WorkItem', () => {
    const result = createWorkItemDocument(workspaceRootPath, workspaceId, {
      title: 'Test Task',
      description: 'A test description',
      status: 'ready',
      priority: 'P1',
    })

    expect(result.success).toBe(true)
    expect(result.workItem).toBeDefined()
    const workItemId = result.workItem!.id
    expect(workItemId).toStartWith('workitem_')

    const read = readWorkItemDocument(workspaceRootPath, workItemId)
    expect(read).not.toBeNull()
    expect(read!.title).toBe('Test Task')
    expect(read!.status).toBe('ready')
    expect(read!.priority).toBe('P1')
    expect(read!.workspaceId).toBe(workspaceId)
  })

  it('should update a WorkItem', () => {
    const createResult = createWorkItemDocument(workspaceRootPath, workspaceId, {
      title: 'Original Title',
      status: 'backlog',
    })

    const workItemId = createResult.workItem!.id
    const updateResult = updateWorkItemDocument(workspaceRootPath, workItemId, {
      title: 'Updated Title',
      status: 'in_progress',
    })

    expect(updateResult.success).toBe(true)
    expect(updateResult.workItem!.title).toBe('Updated Title')
    expect(updateResult.workItem!.status).toBe('in_progress')

    const read = readWorkItemDocument(workspaceRootPath, workItemId)
    expect(read!.title).toBe('Updated Title')
    expect(read!.status).toBe('in_progress')
  })

  it('should delete a WorkItem and update the index', () => {
    const createResult = createWorkItemDocument(workspaceRootPath, workspaceId, {
      title: 'To Delete',
    })

    const workItemId = createResult.workItem!.id
    expect(listWorkItemEntries(workspaceRootPath)).toHaveLength(1)

    const deleteResult = deleteWorkItemDocument(workspaceRootPath, workItemId)
    expect(deleteResult.success).toBe(true)
    expect(readWorkItemDocument(workspaceRootPath, workItemId)).toBeNull()
    expect(listWorkItemEntries(workspaceRootPath)).toHaveLength(0)
  })

  it('should list WorkItems sorted by updatedAt', async () => {
    createWorkItemDocument(workspaceRootPath, workspaceId, { title: 'Oldest' })

    // Ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 20))

    createWorkItemDocument(workspaceRootPath, workspaceId, { title: 'Newest' })

    const entries = listWorkItemEntries(workspaceRootPath)
    expect(entries).toHaveLength(2)
    expect(entries[0].title).toBe('Newest')
    expect(entries[1].title).toBe('Oldest')
  })

  it('should rebuild the index from files if missing', () => {
    createWorkItemDocument(workspaceRootPath, workspaceId, { title: 'Task 1' })
    createWorkItemDocument(workspaceRootPath, workspaceId, { title: 'Task 2' })

    // Manually delete the index file
    const indexPath = join(workspaceRootPath, 'workitems', 'index.json')
    if (existsSync(indexPath)) {
      rmSync(indexPath)
    }
    expect(existsSync(indexPath)).toBe(false)

    const rebuiltIndex = rebuildWorkItemIndex(workspaceRootPath)
    expect(rebuiltIndex.workItems).toHaveLength(2)
    expect(existsSync(indexPath)).toBe(true)
  })

  it('should recover from a corrupt index file', () => {
    createWorkItemDocument(workspaceRootPath, workspaceId, { title: 'Safe Task' })
    const indexPath = join(workspaceRootPath, 'workitems', 'index.json')

    // Write corrupt JSON to index
    writeFileSync(indexPath, '{ "corrupt": "missing closing bracket"')

    // loadWorkItemIndex should trigger a rebuild
    const index = loadWorkItemIndex(workspaceRootPath)
    expect(index.workItems).toHaveLength(1)
    expect(index.workItems[0].title).toBe('Safe Task')
  })

  it('should enforce workspace isolation for mutations', () => {
    const result = createWorkItemDocument(workspaceRootPath, 'workspace-a', { title: 'Task A' })
    const workItemId = result.workItem!.id

    // Attempt to read from wrong workspace
    expect(readWorkItemDocument(workspaceRootPath, workItemId, 'workspace-b')).toBeNull()

    // Attempt to update from wrong workspace
    const updateResult = updateWorkItemDocument(workspaceRootPath, workItemId, { title: 'Stolen' }, 'workspace-b')
    expect(updateResult.success).toBe(false)
    expect(updateResult.error).toBe('WorkItem not found')

    // Attempt to delete from wrong workspace
    const deleteResult = deleteWorkItemDocument(workspaceRootPath, workItemId, 'workspace-b')
    expect(deleteResult.success).toBe(false)
    expect(deleteResult.error).toBe('WorkItem not found')

    // List should be isolated
    expect(listWorkItemEntries(workspaceRootPath, 'workspace-a')).toHaveLength(1)
    expect(listWorkItemEntries(workspaceRootPath, 'workspace-b')).toHaveLength(0)
  })

  it('should release the index lock after index mutations', () => {
    const createResult = createWorkItemDocument(workspaceRootPath, workspaceId, { title: 'Locked Task' })
    const workItemId = createResult.workItem!.id
    const lockPath = getWorkItemIndexLockPath(workspaceRootPath)

    expect(existsSync(lockPath)).toBe(false)

    const updateResult = updateWorkItemDocument(workspaceRootPath, workItemId, { title: 'Updated Locked Task' })
    expect(updateResult.success).toBe(true)
    expect(existsSync(lockPath)).toBe(false)

    const deleteResult = deleteWorkItemDocument(workspaceRootPath, workItemId)
    expect(deleteResult.success).toBe(true)
    expect(existsSync(lockPath)).toBe(false)
  })

  it.each([
    '../forbidden',
    'sub/dir/id',
    '..',
    'id with spaces',
    'C:\\Windows\\System32',
  ])('should prevent path traversal and unsafe characters in ID: %s', (unsafeId) => {
    expect(() => assertSafeWorkItemId(unsafeId)).toThrow()
    expect(() => getWorkItemDocumentPath(workspaceRootPath, unsafeId)).toThrow()
  })
})
