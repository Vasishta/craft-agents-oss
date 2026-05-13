/**
 * WorkItem Types
 *
 * Core domain models for WorkItems.
 * A WorkItem represents a durable "thing to do" that is independent of a chat session.
 */

export type WorkItemStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'in_review'
  | 'blocked'
  | 'done';

export type WorkItemPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type WorkItemType =
  | 'task'
  | 'bug'
  | 'tech_debt'
  | 'spike'
  | 'story'
  | 'epic';

export interface WorkItemLinkCounts {
  sessionCount: number;
  docCount: number;
  outputCount: number;
}

/**
 * Full WorkItem document stored on disk.
 */
export interface WorkItemDocument {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority?: WorkItemPriority;
  type?: WorkItemType;
  area?: string;

  createdAt: number;
  updatedAt: number;

  linkedSessionIds: string[];
  linkedDocIds: string[];
  linkedOutputIds: string[];

  /** External references (e.g., GitHub issue URLs, Jira IDs) */
  externalRefs?: string[];
}

/**
 * Lightweight entry for the WorkItem index.
 */
export interface WorkItemIndexEntry {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority?: WorkItemPriority;
  type?: WorkItemType;
  area?: string;
  createdAt: number;
  updatedAt: number;
  linkCounts: WorkItemLinkCounts;
}

/**
 * WorkItem index file structure.
 */
export interface WorkItemIndex {
  version: number;
  workItems: WorkItemIndexEntry[];
}

/**
 * Input for creating a new WorkItem.
 */
export interface CreateWorkItemInput {
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  type?: WorkItemType;
  area?: string;
  linkedSessionIds?: string[];
  linkedDocIds?: string[];
  linkedOutputIds?: string[];
  externalRefs?: string[];
}

/**
 * Input for updating an existing WorkItem.
 */
export interface UpdateWorkItemInput {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  type?: WorkItemType;
  area?: string;
  linkedSessionIds?: string[];
  linkedDocIds?: string[];
  linkedOutputIds?: string[];
  externalRefs?: string[];
}

/**
 * Result of a WorkItem mutation.
 */
export interface WorkItemMutationResult {
  success: boolean;
  workItem?: WorkItemDocument;
  error?: string;
}

/**
 * Result of a WorkItem deletion.
 */
export interface DeleteWorkItemResult {
  success: boolean;
  error?: string;
}
