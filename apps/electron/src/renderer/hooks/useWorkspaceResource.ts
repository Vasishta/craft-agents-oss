import * as React from 'react'

type WorkspaceChangeListener<TChange> = (changedWorkspaceId: string, data: TChange) => void
type WorkspaceChangeSubscription<TChange> = (listener: WorkspaceChangeListener<TChange>) => (() => void) | undefined

interface ResourceCollectionOptions<TEntry, TChange> {
  empty: TEntry[]
  list: (workspaceId: string) => Promise<TEntry[]>
  subscribe?: WorkspaceChangeSubscription<TChange>
  errorMessage: string
}

interface ResourceDocumentOptions<TDocument, TChange> {
  empty: TDocument | null
  get: (workspaceId: string, resourceId: string) => Promise<TDocument | null>
  subscribe?: WorkspaceChangeSubscription<TChange>
  getChangedId: (change: TChange) => string | null | undefined
  errorMessage: string
}

interface ResourceMutationMessages {
  list: string
  document: string
}

interface WorkspaceCrudHookOptions<TEntry, TDocument, TCreateInput, TUpdateInput, TChange> {
  list: (workspaceId: string) => Promise<TEntry[]>
  get: (workspaceId: string, resourceId: string) => Promise<TDocument | null>
  subscribe?: WorkspaceChangeSubscription<TChange>
  getChangedId: (change: TChange) => string | null | undefined
  create: (workspaceId: string, input: TCreateInput) => Promise<TDocument | null>
  update: (workspaceId: string, resourceId: string, updates: TUpdateInput) => Promise<TDocument | null>
  remove: (workspaceId: string, resourceId: string) => Promise<void>
  errors: ResourceMutationMessages
}

export function createWorkspaceCollectionHook<TEntry, TChange = never>(
  options: ResourceCollectionOptions<TEntry, TChange>,
) {
  return function useWorkspaceCollection(workspaceId: string | null | undefined) {
    const [entries, setEntries] = React.useState<TEntry[]>(options.empty)
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const refresh = React.useCallback(async () => {
      if (!workspaceId) {
        setEntries(options.empty)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const nextEntries = await options.list(workspaceId)
        setEntries(nextEntries)
      } catch (err) {
        setError(toWorkspaceResourceErrorMessage(err, options.errorMessage))
        setEntries(options.empty)
      } finally {
        setIsLoading(false)
      }
    }, [workspaceId])

    React.useEffect(() => {
      void refresh()
    }, [refresh])

    React.useEffect(() => {
      if (!workspaceId || !options.subscribe) return
      return options.subscribe((changedWorkspaceId) => {
        if (changedWorkspaceId === workspaceId) {
          void refresh()
        }
      })
    }, [refresh, workspaceId])

    return { entries, isLoading, error, refresh }
  }
}

export function createWorkspaceDocumentHook<TDocument, TChange>(
  options: ResourceDocumentOptions<TDocument, TChange>,
) {
  return function useWorkspaceDocument(
    workspaceId: string | null | undefined,
    resourceId: string | null | undefined,
  ) {
    const [document, setDocument] = React.useState<TDocument | null>(options.empty)
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const refresh = React.useCallback(async () => {
      if (!workspaceId || !resourceId) {
        setDocument(options.empty)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const nextDocument = await options.get(workspaceId, resourceId)
        setDocument(nextDocument)
      } catch (err) {
        setError(toWorkspaceResourceErrorMessage(err, options.errorMessage))
        setDocument(options.empty)
      } finally {
        setIsLoading(false)
      }
    }, [resourceId, workspaceId])

    React.useEffect(() => {
      void refresh()
    }, [refresh])

    React.useEffect(() => {
      if (!workspaceId || !resourceId || !options.subscribe) return
      return options.subscribe((changedWorkspaceId, change) => {
        if (isMatchingWorkspaceResourceChange(changedWorkspaceId, workspaceId, options.getChangedId(change), resourceId)) {
          void refresh()
        }
      })
    }, [refresh, resourceId, workspaceId])

    return { document, isLoading, error, refresh }
  }
}

export function createWorkspaceMutationHook<TInput, TResult>(
  mutate: (workspaceId: string, input: TInput) => Promise<TResult>,
  fallback: TResult,
) {
  return function useWorkspaceMutation(workspaceId: string | null | undefined) {
    return React.useCallback(async (input: TInput): Promise<TResult> => {
      if (!workspaceId) return fallback
      return mutate(workspaceId, input)
    }, [workspaceId])
  }
}

export function createWorkspaceDeleteHook(
  remove: (workspaceId: string, resourceId: string) => Promise<void>,
) {
  return function useWorkspaceDelete(workspaceId: string | null | undefined) {
    return React.useCallback(async (resourceId: string): Promise<boolean> => {
      if (!workspaceId) return false
      await remove(workspaceId, resourceId)
      return true
    }, [workspaceId])
  }
}

export function createWorkspaceCrudHooks<TEntry, TDocument, TCreateInput, TUpdateInput, TChange>(
  options: WorkspaceCrudHookOptions<TEntry, TDocument, TCreateInput, TUpdateInput, TChange>,
) {
  const useListResource = createWorkspaceCollectionHook<TEntry, TChange>({
    empty: [],
    list: options.list,
    subscribe: options.subscribe,
    errorMessage: options.errors.list,
  })

  const useDocumentResource = createWorkspaceDocumentHook<TDocument, TChange>({
    empty: null,
    get: options.get,
    subscribe: options.subscribe,
    getChangedId: options.getChangedId,
    errorMessage: options.errors.document,
  })

  const useCreateResource = createWorkspaceMutationHook<TCreateInput, TDocument | null>(options.create, null)
  const useUpdateResource = createWorkspaceMutationHook<{ resourceId: string; updates: TUpdateInput }, TDocument | null>(
    (workspaceId, input) => options.update(workspaceId, input.resourceId, input.updates),
    null,
  )
  const useDeleteResource = createWorkspaceDeleteHook(options.remove)

  return {
    useListResource,
    useDocumentResource,
    useCreateResource,
    useUpdateResource,
    useDeleteResource,
  }
}

export function isMatchingWorkspaceResourceChange(
  changedWorkspaceId: string,
  workspaceId: string,
  changedResourceId: string | null | undefined,
  resourceId: string,
): boolean {
  return changedWorkspaceId === workspaceId && changedResourceId === resourceId
}

export function toWorkspaceResourceErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
