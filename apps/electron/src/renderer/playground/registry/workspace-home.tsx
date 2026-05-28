import * as React from 'react'
import { useSetAtom } from 'jotai'
import WorkspaceHome from '@/pages/WorkspaceHome'
import { sessionMetaMapAtom, type SessionMeta } from '@/atoms/sessions'
import { sourcesAtom } from '@/atoms/sources'
import { mockElectronAPI, mockSources } from '../mock-utils'
import type { ComponentEntry } from './types'

const PLAYGROUND_WORKSPACE_ID = 'playground-workspace'

type HomeDensity = 'sparse' | 'active' | 'library-heavy'

type BasicEntry = {
  id: string
  title: string
  updatedAt: number
}

type ProjectEntry = {
  id: string
  name: string
  updatedAt: number
  status?: string
}

type WorkItemEntry = BasicEntry & {
  status: 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'blocked' | 'done'
}

const now = Date.now()

const BASE_SESSIONS: SessionMeta[] = [
  {
    id: 'home-session-1',
    workspaceId: PLAYGROUND_WORKSPACE_ID,
    name: 'Ship the workspace home polish pass',
    lastMessageAt: now - 1000 * 60 * 18,
    createdAt: now - 1000 * 60 * 80,
    hasUnread: true,
    sessionStatus: 'in_progress',
  },
  {
    id: 'home-session-2',
    workspaceId: PLAYGROUND_WORKSPACE_ID,
    name: 'Review markdown table editing regressions',
    lastMessageAt: now - 1000 * 60 * 75,
    createdAt: now - 1000 * 60 * 160,
    sessionStatus: 'open',
  },
  {
    id: 'home-session-3',
    workspaceId: PLAYGROUND_WORKSPACE_ID,
    name: 'Capture docs polish follow-ons',
    lastMessageAt: now - 1000 * 60 * 160,
    createdAt: now - 1000 * 60 * 220,
    sessionStatus: 'open',
  },
]

function buildPages(density: HomeDensity): BasicEntry[] {
  switch (density) {
    case 'sparse':
      return []
    case 'active':
      return [
        { id: 'page-1', title: 'Workspace Home notes', updatedAt: now - 1000 * 60 * 30 },
        { id: 'page-2', title: 'Editor parity checklist', updatedAt: now - 1000 * 60 * 95 },
      ]
    case 'library-heavy':
      return [
        { id: 'page-1', title: 'Workspace Home notes', updatedAt: now - 1000 * 60 * 30 },
        { id: 'page-2', title: 'Editor parity checklist', updatedAt: now - 1000 * 60 * 95 },
        { id: 'page-3', title: 'Search ranking rationale', updatedAt: now - 1000 * 60 * 210 },
        { id: 'page-4', title: 'Loop-style polish backlog', updatedAt: now - 1000 * 60 * 420 },
      ]
  }
}

function buildOutputs(density: HomeDensity): BasicEntry[] {
  if (density === 'sparse') return []
  return [
    { id: 'output-1', title: 'Renderer cleanup summary', updatedAt: now - 1000 * 60 * 55 },
    { id: 'output-2', title: 'Docs polish diff review', updatedAt: now - 1000 * 60 * 185 },
  ]
}

function buildProjects(density: HomeDensity): ProjectEntry[] {
  if (density === 'sparse') return []
  return density === 'library-heavy'
    ? [
        { id: 'project-1', name: 'Durable knowledge workspace', updatedAt: now - 1000 * 60 * 65, status: 'Active' },
        { id: 'project-2', name: 'Docs editor polish', updatedAt: now - 1000 * 60 * 260, status: 'Draft' },
      ]
    : [{ id: 'project-1', name: 'Docs editor polish', updatedAt: now - 1000 * 60 * 260, status: 'Draft' }]
}

function buildDecisions(density: HomeDensity): BasicEntry[] {
  if (density !== 'library-heavy') return []
  return [
    { id: 'decision-1', title: 'Keep Workspace Home resume-oriented', updatedAt: now - 1000 * 60 * 140 },
  ]
}

function buildNotebooks(density: HomeDensity): BasicEntry[] {
  if (density !== 'library-heavy') return []
  return [
    { id: 'notebook-1', title: 'Polish experiments', updatedAt: now - 1000 * 60 * 110 },
  ]
}

function buildWorkItems(density: HomeDensity): WorkItemEntry[] {
  switch (density) {
    case 'sparse':
      return []
    case 'active':
      return [
        { id: 'work-1', title: 'Tighten table resize affordances', updatedAt: now - 1000 * 60 * 12, status: 'in_progress' },
        { id: 'work-2', title: 'Document visual verification path', updatedAt: now - 1000 * 60 * 90, status: 'ready' },
      ]
    case 'library-heavy':
      return [
        { id: 'work-1', title: 'Tighten table resize affordances', updatedAt: now - 1000 * 60 * 12, status: 'in_progress' },
        { id: 'work-2', title: 'Document visual verification path', updatedAt: now - 1000 * 60 * 90, status: 'ready' },
        { id: 'work-3', title: 'Close legacy markdown branch', updatedAt: now - 1000 * 60 * 320, status: 'done' },
      ]
  }
}

function buildSessions(density: HomeDensity): SessionMeta[] {
  if (density === 'sparse') return []
  return BASE_SESSIONS
}

const noopSubscription = () => () => undefined

const HOME_RESOURCE_METHOD_KEYS = [
  'listPages',
  'onPagesChanged',
  'listOutputs',
  'onOutputsChanged',
  'listProjects',
  'onProjectsChanged',
  'listDecisions',
  'onDecisionsChanged',
  'listNotebooks',
  'onNotebooksChanged',
  'listWorkItems',
  'onWorkItemsChanged',
] as const

function installHomeResourceMocks(density: HomeDensity) {
  const api = mockElectronAPI as Record<string, unknown>
  const previousEntries = HOME_RESOURCE_METHOD_KEYS.map((key) => [key, api[key]] as const)

  Object.assign(api, {
    listPages: async (_workspaceId: string) => buildPages(density),
    onPagesChanged: noopSubscription,
    listOutputs: async (_workspaceId: string) => buildOutputs(density),
    onOutputsChanged: noopSubscription,
    listProjects: async (_workspaceId: string) => buildProjects(density),
    onProjectsChanged: noopSubscription,
    listDecisions: async (_workspaceId: string) => buildDecisions(density),
    onDecisionsChanged: noopSubscription,
    listNotebooks: async (_workspaceId: string) => buildNotebooks(density),
    onNotebooksChanged: noopSubscription,
    listWorkItems: async (_workspaceId: string) => buildWorkItems(density),
    onWorkItemsChanged: noopSubscription,
  })

  return () => {
    for (const [key, value] of previousEntries) {
      if (typeof value === 'undefined') delete api[key]
      else api[key] = value
    }
  }
}

export interface WorkspaceHomePreviewProps {
  density?: HomeDensity
}

export function WorkspaceHomePreview({
  density = 'active',
}: WorkspaceHomePreviewProps) {
  const setSessionMetaMap = useSetAtom(sessionMetaMapAtom)
  const setSources = useSetAtom(sourcesAtom)

  React.useEffect(() => {
    return installHomeResourceMocks(density)
  }, [density])

  React.useEffect(() => {
    const sessions = buildSessions(density)
    setSessionMetaMap((prev) => {
      const next = new Map(prev)
      for (const session of sessions) next.set(session.id, session)
      return next
    })
    setSources(density === 'sparse' ? [] : mockSources)

    return () => {
      setSessionMetaMap((prev) => {
        const next = new Map(prev)
        for (const session of sessions) next.delete(session.id)
        return next
      })
      setSources([])
    }
  }, [density, setSessionMetaMap, setSources])

  return <WorkspaceHome workspaceId={PLAYGROUND_WORKSPACE_ID} />
}

export const workspaceHomeComponents: ComponentEntry[] = [
  {
    id: 'workspace-home',
    name: 'Workspace Home',
    category: 'Island',
    description: 'Browser-visible preview of the real Workspace Home surface with seeded resume, activity, and library states.',
    component: WorkspaceHomePreview,
    layout: 'full',
    previewOverflow: 'auto',
    props: [
      {
        name: 'density',
        description: 'Seeded workspace state to preview the Home surface.',
        control: {
          type: 'select',
          options: [
            { label: 'Sparse', value: 'sparse' },
            { label: 'Active', value: 'active' },
            { label: 'Library Heavy', value: 'library-heavy' },
          ],
        },
        defaultValue: 'active',
      },
    ],
    variants: [
      {
        name: 'Active Workspace',
        description: 'Resume-oriented Home with current work, activity, and a few sources.',
        props: { density: 'active' },
      },
      {
        name: 'Sparse Workspace',
        description: 'Low-context Home state before durable work has accumulated.',
        props: { density: 'sparse' },
      },
      {
        name: 'Library Heavy',
        description: 'Home state with stronger durable-work density across docs, outputs, projects, and decisions.',
        props: { density: 'library-heavy' },
      },
    ],
  },
]
