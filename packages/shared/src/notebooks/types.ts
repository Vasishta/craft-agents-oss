/**
 * Notebook Types
 *
 * Notebooks are curated views over workspace objects. They link to docs,
 * outputs, sources, decisions, and chats without owning or moving them.
 */

export type NotebookStatus = 'active' | 'archived';

export interface NotebookLinks {
  projectIds: string[];
  sessionIds: string[];
  docIds: string[];
  outputIds: string[];
  workItemIds: string[];
  sourceIds: string[];
  decisionIds: string[];
}

export interface NotebookLinkCounts {
  projectCount: number;
  sessionCount: number;
  docCount: number;
  outputCount: number;
  workItemCount: number;
  sourceCount: number;
  decisionCount: number;
}

export interface NotebookSection {
  id: string;
  title: string;
  description?: string;
  links: Partial<NotebookLinks>;
}

export interface NotebookDocument {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: NotebookStatus;

  createdAt: number;
  updatedAt: number;

  links: NotebookLinks;
  sections: NotebookSection[];
  externalRefs?: string[];
}

export interface NotebookIndexEntry {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: NotebookStatus;
  createdAt: number;
  updatedAt: number;
  projectIds: string[];
  sectionCount: number;
  linkCounts: NotebookLinkCounts;
}

export interface NotebookIndex {
  version: number;
  notebooks: NotebookIndexEntry[];
}

export interface CreateNotebookInput {
  title: string;
  description?: string;
  status?: NotebookStatus;
  links?: Partial<NotebookLinks>;
  sections?: Array<Omit<NotebookSection, 'id'> & { id?: string }>;
  externalRefs?: string[];
}

export interface UpdateNotebookInput {
  title?: string;
  description?: string;
  status?: NotebookStatus;
  links?: Partial<NotebookLinks>;
  sections?: Array<Omit<NotebookSection, 'id'> & { id?: string }>;
  externalRefs?: string[];
}

export interface NotebookMutationResult {
  success: boolean;
  notebook?: NotebookDocument;
  error?: string;
}

export interface DeleteNotebookResult {
  success: boolean;
  error?: string;
}
