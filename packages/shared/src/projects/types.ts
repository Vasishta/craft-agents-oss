/**
 * Project Types
 *
 * A Project is an optional workspace-scoped collection of related objects.
 * It does not replace Workspace and existing objects do not need to belong to a Project.
 */

export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface ProjectLinks {
  sessionIds: string[];
  docIds: string[];
  outputIds: string[];
  workItemIds: string[];
  sourceIds: string[];
  decisionIds: string[];
  notebookIds: string[];
}

export interface ProjectLinkCounts {
  sessionCount: number;
  docCount: number;
  outputCount: number;
  workItemCount: number;
  sourceCount: number;
  decisionCount: number;
  notebookCount: number;
}

/**
 * Full Project document stored on disk.
 */
export interface ProjectDocument {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  icon?: string;

  createdAt: number;
  updatedAt: number;

  links: ProjectLinks;

  /** External references such as GitHub project URLs or roadmap docs. */
  externalRefs?: string[];
}

/**
 * Lightweight entry for fast Project list views.
 */
export interface ProjectIndexEntry {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  linkCounts: ProjectLinkCounts;
}

export interface ProjectIndex {
  version: number;
  projects: ProjectIndexEntry[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  icon?: string;
  links?: Partial<ProjectLinks>;
  externalRefs?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  icon?: string;
  links?: Partial<ProjectLinks>;
  externalRefs?: string[];
}

export interface ProjectMutationResult {
  success: boolean;
  project?: ProjectDocument;
  error?: string;
}

export interface DeleteProjectResult {
  success: boolean;
  error?: string;
}
