import type { PageDocument } from '../pages/types'

export type OutputKind =
  | 'assistant_response'
  | 'tool_result'
  | 'generated_doc'
  | 'code_review'
  | 'research_note'
  | 'generic'

export type OutputContentType = 'markdown' | 'text' | 'json'

export type OutputStatus = 'saved' | 'promoted' | 'archived'

export interface OutputDocument {
  id: string
  workspaceId: string
  title: string
  kind: OutputKind
  content: string
  contentType: OutputContentType
  sourceSessionId?: string
  sourceMessageId?: string
  sourceToolCallId?: string
  createdAt: number
  updatedAt: number
  promotedDocId?: string
  status: OutputStatus
}

export interface OutputIndexEntry {
  id: string
  workspaceId: string
  title: string
  kind: OutputKind
  contentType: OutputContentType
  sourceSessionId?: string
  sourceMessageId?: string
  sourceToolCallId?: string
  createdAt: number
  updatedAt: number
  promotedDocId?: string
  status: OutputStatus
  preview: string
}

export interface OutputIndex {
  version: number
  outputs: OutputIndexEntry[]
}

export interface CreateOutputInput {
  title?: string
  kind?: OutputKind
  content: string
  contentType?: OutputContentType
  sourceSessionId?: string
  sourceMessageId?: string
  sourceToolCallId?: string
  status?: OutputStatus
}

export interface UpdateOutputInput {
  title?: string
  kind?: OutputKind
  content?: string
  contentType?: OutputContentType
  sourceSessionId?: string
  sourceMessageId?: string
  sourceToolCallId?: string
  promotedDocId?: string
  status?: OutputStatus
}

export interface OutputMutationResult {
  success: boolean
  output?: OutputDocument
  error?: string
}

export interface DeleteOutputResult {
  success: boolean
  error?: string
}

export interface PromoteOutputResult {
  success: boolean
  output?: OutputDocument
  page?: PageDocument
  error?: string
}
