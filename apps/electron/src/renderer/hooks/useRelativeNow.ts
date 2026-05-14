import * as React from 'react'

interface UseRelativeNowOptions {
  intervalMs?: number
}

/**
 * Coarse-grained "now" value for relative timestamps so list-heavy views do
 * not recompute on every unrelated render.
 */
export function useRelativeNow({ intervalMs = 60_000 }: UseRelativeNowOptions = {}): number {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
