import { debug } from './debug'
import { withFileLock } from './file-lock'

export const DEFAULT_LOCAL_INDEX_LOCK_TIMEOUT_MS = 5_000
export const DEFAULT_STALE_LOCAL_INDEX_LOCK_MS = 30_000

export interface SerializedLocalIndexMutationOptions<TIndex> {
  label: string
  lockPath: string
  ensureDirectory: () => void
  loadIndex: () => TIndex
  saveIndex: (index: TIndex) => void
  timeoutMs?: number
  staleMs?: number
}

export function mutateSerializedLocalIndex<TIndex, TResult>(
  options: SerializedLocalIndexMutationOptions<TIndex>,
  mutation: (index: TIndex) => TResult
): TResult {
  options.ensureDirectory()
  return withFileLock(
    options.lockPath,
    {
      label: options.label,
      timeoutMs: options.timeoutMs ?? DEFAULT_LOCAL_INDEX_LOCK_TIMEOUT_MS,
      staleMs: options.staleMs ?? DEFAULT_STALE_LOCAL_INDEX_LOCK_MS,
    },
    () => {
      const index = options.loadIndex()
      const result = mutation(index)
      options.saveIndex(index)
      return result
    }
  )
}

export function trySaveLocalIndex(label: string, save: () => void): void {
  try {
    save()
  } catch (error) {
    debug(`[${label}] Failed to save local index:`, error)
  }
}
