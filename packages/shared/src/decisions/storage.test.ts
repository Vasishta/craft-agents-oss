import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createDecisionDocument,
  deleteDecisionDocument,
  getDecisionDocumentPath,
  getDecisionIndexPath,
  linkDecisionObjects,
  listDecisionEntries,
  loadDecisionIndex,
  readDecisionDocument,
  unlinkDecisionObjects,
  updateDecisionDocument,
} from './storage'

describe('Decision Storage', () => {
  let workspaceRootPath: string
  const workspaceId = 'workspace-a'

  beforeEach(() => {
    workspaceRootPath = mkdtempSync(join(tmpdir(), 'decision-storage-'))
  })

  afterEach(() => {
    rmSync(workspaceRootPath, { recursive: true, force: true })
  })

  it('creates and reads a workspace-scoped Decision with provenance', () => {
    const result = createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Use explicit outputs',
      context: 'Assistant responses need reviewable artifacts.',
      decision: 'Store saved assistant responses as Outputs before docs.',
      sourceSessionId: 'session-a',
      sourceMessageId: 'message-a',
      sourceOutputId: 'output-a',
      links: {
        projectIds: ['project-a'],
        docIds: ['doc-a'],
      },
    })

    expect(result.success).toBe(true)
    expect(result.decision?.id).toStartWith('decision_')

    const read = readDecisionDocument(workspaceRootPath, result.decision!.id, workspaceId)
    expect(read?.title).toBe('Use explicit outputs')
    expect(read?.sourceSessionId).toBe('session-a')
    expect(read?.links.projectIds).toEqual(['project-a'])
  })

  it('rejects missing title or decision body', () => {
    expect(createDecisionDocument(workspaceRootPath, workspaceId, { title: '', decision: 'Body' }).success).toBe(false)
    expect(createDecisionDocument(workspaceRootPath, workspaceId, { title: 'Title', decision: ' ' }).success).toBe(false)
  })

  it('normalizes links and external refs', () => {
    const result = createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Normalize links',
      decision: 'Deduplicate linked object IDs.',
      links: {
        projectIds: [' project-a ', 'project-a', ''],
        supersedesDecisionIds: ['decision-old', 'decision-old'],
      },
      externalRefs: [' https://example.com/adr ', 'https://example.com/adr', ''],
    })

    expect(result.decision?.links.projectIds).toEqual(['project-a'])
    expect(result.decision?.links.supersedesDecisionIds).toEqual(['decision-old'])
    expect(result.decision?.externalRefs).toEqual(['https://example.com/adr'])
  })

  it('updates metadata and replaces explicit link sets', () => {
    const decision = createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Old',
      decision: 'Old body',
      links: { projectIds: ['project-a'] },
    }).decision!

    const updated = updateDecisionDocument(workspaceRootPath, decision.id, {
      title: 'New',
      status: 'accepted',
      decision: 'New body',
      links: { projectIds: ['project-b'], docIds: ['doc-b'] },
    }, workspaceId)

    expect(updated.success).toBe(true)
    expect(updated.decision?.title).toBe('New')
    expect(updated.decision?.status).toBe('accepted')
    expect(updated.decision?.links.projectIds).toEqual(['project-b'])
    expect(updated.decision?.links.docIds).toEqual(['doc-b'])
  })

  it('links and unlinks objects idempotently while keeping index counts current', () => {
    const decision = createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Linking',
      decision: 'Keep link mutations idempotent.',
    }).decision!

    linkDecisionObjects(workspaceRootPath, decision.id, {
      projectIds: ['project-a', 'project-a'],
      docIds: ['doc-a'],
    }, workspaceId)
    unlinkDecisionObjects(workspaceRootPath, decision.id, { projectIds: ['missing'] }, workspaceId)
    unlinkDecisionObjects(workspaceRootPath, decision.id, { projectIds: ['project-a'] }, workspaceId)

    const read = readDecisionDocument(workspaceRootPath, decision.id, workspaceId)
    expect(read?.links.projectIds).toEqual([])
    expect(read?.links.docIds).toEqual(['doc-a'])

    const entry = listDecisionEntries(workspaceRootPath, workspaceId)[0]!
    expect(entry.linkCounts.projectCount).toBe(0)
    expect(entry.linkCounts.docCount).toBe(1)
  })

  it('lists Decisions sorted by updatedAt and can filter by project', () => {
    createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Oldest',
      decision: 'Old',
      links: { projectIds: ['project-a'] },
    })
    const newest = createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Newest',
      decision: 'New',
      links: { projectIds: ['project-b'] },
    }).decision!

    const all = listDecisionEntries(workspaceRootPath, workspaceId)
    const newestEntry = all[0]!
    expect(newestEntry.id).toBe(newest.id)

    const projectB = listDecisionEntries(workspaceRootPath, workspaceId, 'project-b')
    expect(projectB.map(entry => entry.id)).toEqual([newest.id])
  })

  it('rebuilds the index from decision files when missing', () => {
    createDecisionDocument(workspaceRootPath, workspaceId, { title: 'A', decision: 'A' })
    createDecisionDocument(workspaceRootPath, workspaceId, { title: 'B', decision: 'B' })
    unlinkSync(getDecisionIndexPath(workspaceRootPath))

    const rebuilt = loadDecisionIndex(workspaceRootPath)
    expect(rebuilt.decisions).toHaveLength(2)
  })

  it('recovers from a corrupt index file', () => {
    createDecisionDocument(workspaceRootPath, workspaceId, { title: 'Safe', decision: 'Safe' })
    writeFileSync(getDecisionIndexPath(workspaceRootPath), '{bad json')

    const rebuilt = loadDecisionIndex(workspaceRootPath)
    expect(rebuilt.decisions).toHaveLength(1)
    expect(rebuilt.decisions[0]!.title).toBe('Safe')
  })

  it('enforces workspace isolation for reads and mutations', () => {
    const decision = createDecisionDocument(workspaceRootPath, 'workspace-a', {
      title: 'Workspace A',
      decision: 'Only workspace A can mutate this.',
    }).decision!
    createDecisionDocument(workspaceRootPath, 'workspace-b', { title: 'Workspace B', decision: 'B' })

    expect(readDecisionDocument(workspaceRootPath, decision.id, 'workspace-b')).toBeNull()
    expect(updateDecisionDocument(workspaceRootPath, decision.id, { title: 'Stolen' }, 'workspace-b').success).toBe(false)
    expect(linkDecisionObjects(workspaceRootPath, decision.id, { docIds: ['stolen'] }, 'workspace-b').success).toBe(false)
    expect(unlinkDecisionObjects(workspaceRootPath, decision.id, { docIds: ['doc-a'] }, 'workspace-b').success).toBe(false)
    expect(deleteDecisionDocument(workspaceRootPath, decision.id, 'workspace-b').success).toBe(false)
    expect(listDecisionEntries(workspaceRootPath, 'workspace-b')).toHaveLength(1)
  })

  it('deletes Decision documents without deleting linked objects', () => {
    const decision = createDecisionDocument(workspaceRootPath, workspaceId, {
      title: 'Delete link record',
      decision: 'Deleting a Decision removes only the decision file.',
      links: { docIds: ['doc-a'], outputIds: ['output-a'] },
    }).decision!

    expect(deleteDecisionDocument(workspaceRootPath, decision.id, workspaceId).success).toBe(true)
    expect(readDecisionDocument(workspaceRootPath, decision.id, workspaceId)).toBeNull()
    expect(listDecisionEntries(workspaceRootPath, workspaceId)).toHaveLength(0)
  })

  it.each(['../forbidden', 'sub/dir/id', '..', 'id with spaces', 'C:\\Windows\\System32'])('rejects unsafe Decision ID: %s', (unsafeId) => {
    expect(() => getDecisionDocumentPath(workspaceRootPath, unsafeId)).toThrow()
  })
})
