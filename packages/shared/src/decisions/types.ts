/**
 * Decision Types
 *
 * Decisions capture durable product or architecture choices separately from
 * transient chats, docs, outputs, and project organization.
 */

export type DecisionStatus = 'proposed' | 'accepted' | 'superseded' | 'deprecated';

export interface DecisionLinks {
  projectIds: string[];
  sessionIds: string[];
  docIds: string[];
  outputIds: string[];
  workItemIds: string[];
  sourceIds: string[];
  notebookIds: string[];
  supersedesDecisionIds: string[];
}

export interface DecisionLinkCounts {
  projectCount: number;
  sessionCount: number;
  docCount: number;
  outputCount: number;
  workItemCount: number;
  sourceCount: number;
  notebookCount: number;
  supersedesDecisionCount: number;
}

export interface DecisionDocument {
  id: string;
  workspaceId: string;
  title: string;
  status: DecisionStatus;
  context: string;
  decision: string;
  consequences?: string;

  createdAt: number;
  updatedAt: number;

  links: DecisionLinks;

  sourceSessionId?: string;
  sourceMessageId?: string;
  sourceOutputId?: string;
  externalRefs?: string[];
}

export interface DecisionIndexEntry {
  id: string;
  workspaceId: string;
  title: string;
  status: DecisionStatus;
  updatedAt: number;
  createdAt: number;
  projectIds: string[];
  linkCounts: DecisionLinkCounts;
}

export interface DecisionIndex {
  version: number;
  decisions: DecisionIndexEntry[];
}

export interface CreateDecisionInput {
  title: string;
  status?: DecisionStatus;
  context?: string;
  decision: string;
  consequences?: string;
  links?: Partial<DecisionLinks>;
  sourceSessionId?: string;
  sourceMessageId?: string;
  sourceOutputId?: string;
  externalRefs?: string[];
}

export interface UpdateDecisionInput {
  title?: string;
  status?: DecisionStatus;
  context?: string;
  decision?: string;
  consequences?: string;
  links?: Partial<DecisionLinks>;
  sourceSessionId?: string;
  sourceMessageId?: string;
  sourceOutputId?: string;
  externalRefs?: string[];
}

export interface DecisionMutationResult {
  success: boolean;
  decision?: DecisionDocument;
  error?: string;
}

export interface DeleteDecisionResult {
  success: boolean;
  error?: string;
}
