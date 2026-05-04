import { closeSync, existsSync, openSync, statSync, unlinkSync } from 'fs'
import { debug } from './debug'

export interface FileLockOptions {
  label: string
  timeoutMs: number
  staleMs: number
  retryDelayMs?: number
}

function sleepSync(ms: number): void {
  const buffer = new SharedArrayBuffer(4)
  Atomics.wait(new Int32Array(buffer), 0, 0, ms)
}

function removeStaleFileLock(lockPath: string, options: FileLockOptions): void {
  try {
    if (!existsSync(lockPath)) return
    const ageMs = Date.now() - statSync(lockPath).mtimeMs
    if (ageMs > options.staleMs) {
      unlinkSync(lockPath)
      debug(`[${options.label}] Removed stale file lock:`, lockPath)
    }
  } catch (error) {
    debug(`[${options.label}] Failed to inspect file lock:`, error)
  }
}

export function withFileLock<T>(
  lockPath: string,
  options: FileLockOptions,
  operation: () => T
): T {
  const deadline = Date.now() + options.timeoutMs
  const retryDelayMs = options.retryDelayMs ?? 25

  while (true) {
    try {
      const fd = openSync(lockPath, 'wx')
      closeSync(fd)
      break
    } catch {
      removeStaleFileLock(lockPath, options)
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for ${options.label} file lock`)
      }
      sleepSync(retryDelayMs)
    }
  }

  try {
    return operation()
  } finally {
    try {
      unlinkSync(lockPath)
    } catch (error) {
      debug(`[${options.label}] Failed to release file lock:`, error)
    }
  }
}
