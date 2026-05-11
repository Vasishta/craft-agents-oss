import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { atomicWriteFileSync, readJsonFileSync } from '../files'
import { mutateSerializedLocalIndex } from '../local-index'

interface TestIndex {
  version: number
  entries: string[]
}

describe('mutateSerializedLocalIndex', () => {
  let workspaceRootPath: string
  let indexPath: string
  let lockPath: string

  beforeEach(() => {
    workspaceRootPath = join(tmpdir(), `craft-local-index-test-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    mkdirSync(workspaceRootPath, { recursive: true })
    indexPath = join(workspaceRootPath, 'index.json')
    lockPath = join(workspaceRootPath, 'index.json.lock')
    atomicWriteFileSync(indexPath, JSON.stringify({ version: 1, entries: [] }, null, 2))
  })

  afterEach(() => {
    if (existsSync(workspaceRootPath)) {
      rmSync(workspaceRootPath, { recursive: true, force: true })
    }
  })

  function mutateIndex(entry: string): void {
    mutateSerializedLocalIndex<TestIndex, void>(
      {
        label: 'test-index',
        lockPath,
        ensureDirectory: () => mkdirSync(workspaceRootPath, { recursive: true }),
        loadIndex: () => readJsonFileSync<TestIndex>(indexPath),
        saveIndex: index => atomicWriteFileSync(indexPath, JSON.stringify(index, null, 2)),
      },
      index => {
        index.entries.push(entry)
      }
    )
  }

  it('loads the latest index for each serialized mutation', () => {
    mutateIndex('first')
    mutateIndex('second')

    expect(readJsonFileSync<TestIndex>(indexPath).entries).toEqual(['first', 'second'])
    expect(existsSync(lockPath)).toBe(false)
  })

  it('releases the lock when a mutation throws', () => {
    expect(() => {
      mutateSerializedLocalIndex<TestIndex, void>(
        {
          label: 'test-index',
          lockPath,
          ensureDirectory: () => mkdirSync(workspaceRootPath, { recursive: true }),
          loadIndex: () => readJsonFileSync<TestIndex>(indexPath),
          saveIndex: index => atomicWriteFileSync(indexPath, JSON.stringify(index, null, 2)),
        },
        () => {
          throw new Error('failed mutation')
        }
      )
    }).toThrow('failed mutation')

    expect(existsSync(lockPath)).toBe(false)
    mutateIndex('after-error')
    expect(readJsonFileSync<TestIndex>(indexPath).entries).toEqual(['after-error'])
  })
})
