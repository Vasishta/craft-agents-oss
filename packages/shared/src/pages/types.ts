/**
 * Page Document Types
 */

export interface PageDocument {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  workspaceId: string
  sourceSessionId?: string
  sourceMessageId?: string
  notebookId?: string
  outputIds?: string[]
}

export interface PageIndex {
  version: number
  pages: PageDocument[]
}

export interface CreatePageInput {
  title?: string
  content?: string
  sourceSessionId?: string
  sourceMessageId?: string
  notebookId?: string
  outputIds?: string[]
}

export interface UpdatePageInput {
  title?: string
  content?: string
  outputIds?: string[]
}

export interface PageListEntry {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  workspaceId: string
  sourceSessionId?: string
  sourceMessageId?: string
  notebookId?: string
  outputIdCount: number
}

export interface CreatePageResult {
  success: boolean
  page?: PageDocument
  error?: string
}

export interface UpdatePageResult {
  success: boolean
  page?: PageDocument
  error?: string
}

export interface DeletePageResult {
  success: boolean
  error?: string
}
