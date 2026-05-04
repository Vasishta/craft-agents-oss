import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { basename, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import { atomicWriteFileSync, readJsonFileSync } from '../utils/files'
import { debug } from '../utils/debug'
import { withFileLock } from '../utils/file-lock'
import type {
  CreateProjectInput,
  DeleteProjectResult,
  ProjectDocument,
  ProjectIndex,
  ProjectIndexEntry,
  ProjectLinkCounts,
  ProjectLinks,
  ProjectMutationResult,
  UpdateProjectInput,
} from './types'

const PROJECTS_DIR = 'projects'
const PROJECT_INDEX_FILE = 'projects/index.json'
const PROJECT_INDEX_LOCK_FILE = 'projects/index.json.lock'
const CURRENT_INDEX_VERSION = 1
const SAFE_PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const INDEX_LOCK_TIMEOUT_MS = 5_000
const STALE_INDEX_LOCK_MS = 30_000

const EMPTY_PROJECT_LINKS: ProjectLinks = {
  sessionIds: [],
  docIds: [],
  outputIds: [],
  workItemIds: [],
  sourceIds: [],
  decisionIds: [],
  notebookIds: [],
}

const PROJECT_LINK_KEYS = Object.keys(EMPTY_PROJECT_LINKS) as (keyof ProjectLinks)[]

export function getProjectsDirectoryPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PROJECTS_DIR)
}

export function getProjectIndexPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PROJECT_INDEX_FILE)
}

export function getProjectIndexLockPath(workspaceRootPath: string): string {
  return join(workspaceRootPath, PROJECT_INDEX_LOCK_FILE)
}

export function getProjectDocumentPath(workspaceRootPath: string, projectId: string): string {
  assertSafeProjectId(projectId)
  const projectsDir = resolve(getProjectsDirectoryPath(workspaceRootPath))
  const projectPath = resolve(projectsDir, `${projectId}.json`)
  assertPathInsideDirectory(projectPath, projectsDir)
  return projectPath
}

export function isSafeProjectId(projectId: string): boolean {
  return SAFE_PROJECT_ID_PATTERN.test(projectId)
}

export function assertSafeProjectId(projectId: string): void {
  if (
    !projectId ||
    !isSafeProjectId(projectId) ||
    projectId.includes('..') ||
    projectId.includes('/') ||
    projectId.includes('\\') ||
    projectId !== basename(projectId) ||
    resolve(projectId) === projectId
  ) {
    throw new Error('Invalid Project ID')
  }
}

function assertPathInsideDirectory(filePath: string, directoryPath: string): void {
  const relativePath = relative(directoryPath, filePath)
  if (!relativePath || relativePath.startsWith('..') || relativePath.includes('..') || resolve(relativePath) === relativePath) {
    throw new Error('Invalid Project path')
  }
}

export function ensureProjectsDirectory(workspaceRootPath: string): void {
  const projectsDir = getProjectsDirectoryPath(workspaceRootPath)
  if (!existsSync(projectsDir)) {
    mkdirSync(projectsDir, { recursive: true })
    debug('[project-storage] Created projects directory:', projectsDir)
  }
}

function normalizeStringList(values: string[] | undefined): string[] {
  if (!values) return []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values) {
    const item = value.trim()
    if (!item || seen.has(item)) continue
    seen.add(item)
    normalized.push(item)
  }
  return normalized
}

export function normalizeProjectLinks(links?: Partial<ProjectLinks>): ProjectLinks {
  const normalized: ProjectLinks = { ...EMPTY_PROJECT_LINKS }
  for (const key of PROJECT_LINK_KEYS) {
    normalized[key] = normalizeStringList(links?.[key])
  }
  return normalized
}

function mergeProjectLinks(current: ProjectLinks, links: Partial<ProjectLinks>): ProjectLinks {
  const merged: ProjectLinks = { ...current }
  for (const key of PROJECT_LINK_KEYS) {
    const additions = normalizeStringList(links[key])
    if (additions.length === 0) continue
    merged[key] = normalizeStringList([...current[key], ...additions])
  }
  return merged
}

function removeProjectLinks(current: ProjectLinks, links: Partial<ProjectLinks>): ProjectLinks {
  const updated: ProjectLinks = { ...current }
  for (const key of PROJECT_LINK_KEYS) {
    const removals = new Set(normalizeStringList(links[key]))
    if (removals.size === 0) continue
    updated[key] = current[key].filter(id => !removals.has(id))
  }
  return updated
}

function toLinkCounts(links: ProjectLinks): ProjectLinkCounts {
  return {
    sessionCount: links.sessionIds.length,
    docCount: links.docIds.length,
    outputCount: links.outputIds.length,
    workItemCount: links.workItemIds.length,
    sourceCount: links.sourceIds.length,
    decisionCount: links.decisionIds.length,
    notebookCount: links.notebookIds.length,
  }
}

function toIndexEntry(project: ProjectDocument): ProjectIndexEntry {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    status: project.status,
    color: project.color,
    icon: project.icon,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    linkCounts: toLinkCounts(project.links),
  }
}

function readProjectFile(workspaceRootPath: string, projectId: string): ProjectDocument | null {
  try {
    const projectPath = getProjectDocumentPath(workspaceRootPath, projectId)
    if (!existsSync(projectPath)) return null
    const project = readJsonFileSync<ProjectDocument>(projectPath)
    if (!project || typeof project !== 'object' || project.id !== projectId) return null
    return {
      ...project,
      links: normalizeProjectLinks(project.links),
    }
  } catch (error) {
    debug('[project-storage] Failed to read project file:', projectId, error)
    return null
  }
}

function scanProjects(workspaceRootPath: string, workspaceId?: string): ProjectDocument[] {
  ensureProjectsDirectory(workspaceRootPath)
  const projectsDir = getProjectsDirectoryPath(workspaceRootPath)
  const projects: ProjectDocument[] = []
  try {
    const entries = readdirSync(projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue
      const projectId = entry.name.slice(0, -5)
      if (!isSafeProjectId(projectId)) {
        debug('[project-storage] Skipping unsafe project filename during rebuild:', entry.name)
        continue
      }
      const project = readProjectFile(workspaceRootPath, projectId)
      if (!project) continue
      if (workspaceId && project.workspaceId !== workspaceId) continue
      projects.push(project)
    }
  } catch (error) {
    debug('[project-storage] Failed to scan projects directory:', error)
  }
  return projects
}

export function saveProjectIndex(workspaceRootPath: string, index: ProjectIndex): void {
  ensureProjectsDirectory(workspaceRootPath)
  atomicWriteFileSync(getProjectIndexPath(workspaceRootPath), JSON.stringify(index, null, 2))
}

function withProjectIndexLock<T>(workspaceRootPath: string, operation: () => T): T {
  ensureProjectsDirectory(workspaceRootPath)
  return withFileLock(
    getProjectIndexLockPath(workspaceRootPath),
    {
      label: 'project-storage',
      timeoutMs: INDEX_LOCK_TIMEOUT_MS,
      staleMs: STALE_INDEX_LOCK_MS,
    },
    operation
  )
}

export function rebuildProjectIndex(workspaceRootPath: string): ProjectIndex {
  const projects = scanProjects(workspaceRootPath)
  const index: ProjectIndex = {
    version: CURRENT_INDEX_VERSION,
    projects: projects.map(toIndexEntry),
  }
  try {
    saveProjectIndex(workspaceRootPath, index)
  } catch (error) {
    debug('[project-storage] Failed to save rebuilt index:', error)
  }
  return index
}

export function loadProjectIndex(workspaceRootPath: string): ProjectIndex {
  const indexPath = getProjectIndexPath(workspaceRootPath)
  if (!existsSync(indexPath)) {
    return rebuildProjectIndex(workspaceRootPath)
  }
  try {
    const index = readJsonFileSync<ProjectIndex>(indexPath)
    if (!index || typeof index !== 'object' || !Array.isArray(index.projects)) {
      return rebuildProjectIndex(workspaceRootPath)
    }
    return index.version === CURRENT_INDEX_VERSION
      ? index
      : { ...index, version: CURRENT_INDEX_VERSION }
  } catch (error) {
    debug('[project-storage] Failed to load index, attempting rebuild:', error)
    return rebuildProjectIndex(workspaceRootPath)
  }
}

function writeProject(workspaceRootPath: string, project: ProjectDocument): void {
  atomicWriteFileSync(getProjectDocumentPath(workspaceRootPath, project.id), JSON.stringify(project, null, 2))
}

function upsertProjectIndexEntry(workspaceRootPath: string, project: ProjectDocument): void {
  withProjectIndexLock(workspaceRootPath, () => {
    const index = loadProjectIndex(workspaceRootPath)
    const entry = toIndexEntry(project)
    const existingIndex = index.projects.findIndex(item => item.id === project.id)
    if (existingIndex === -1) {
      index.projects.push(entry)
    } else {
      index.projects[existingIndex] = entry
    }
    saveProjectIndex(workspaceRootPath, index)
  })
}

export function createProjectDocument(
  workspaceRootPath: string,
  workspaceId: string,
  input: CreateProjectInput
): ProjectMutationResult {
  try {
    ensureProjectsDirectory(workspaceRootPath)
    const name = input.name.trim()
    if (!name) return { success: false, error: 'Project name is required' }

    const projectId = `project_${randomUUID()}`
    const now = Date.now()
    const project: ProjectDocument = {
      id: projectId,
      workspaceId,
      name,
      description: input.description,
      status: input.status || 'active',
      color: input.color,
      icon: input.icon,
      createdAt: now,
      updatedAt: now,
      links: normalizeProjectLinks(input.links),
      externalRefs: normalizeStringList(input.externalRefs),
    }

    writeProject(workspaceRootPath, project)
    upsertProjectIndexEntry(workspaceRootPath, project)

    return { success: true, project }
  } catch (error) {
    debug('[project-storage] Failed to create project:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function readProjectDocument(
  workspaceRootPath: string,
  projectId: string,
  workspaceId?: string
): ProjectDocument | null {
  const project = readProjectFile(workspaceRootPath, projectId)
  if (!project) return null
  if (workspaceId && project.workspaceId !== workspaceId) return null
  return project
}

export function updateProjectDocument(
  workspaceRootPath: string,
  projectId: string,
  input: UpdateProjectInput,
  workspaceId?: string
): ProjectMutationResult {
  try {
    assertSafeProjectId(projectId)
    const project = readProjectDocument(workspaceRootPath, projectId, workspaceId)
    if (!project) return { success: false, error: 'Project not found' }

    const updatedName = input.name !== undefined ? input.name.trim() : project.name
    if (!updatedName) return { success: false, error: 'Project name is required' }

    const updated: ProjectDocument = {
      ...project,
      name: updatedName,
      description: input.description !== undefined ? input.description : project.description,
      status: input.status !== undefined ? input.status : project.status,
      color: input.color !== undefined ? input.color : project.color,
      icon: input.icon !== undefined ? input.icon : project.icon,
      links: input.links !== undefined ? normalizeProjectLinks(input.links) : project.links,
      externalRefs: input.externalRefs !== undefined ? normalizeStringList(input.externalRefs) : project.externalRefs,
      updatedAt: Date.now(),
    }

    writeProject(workspaceRootPath, updated)
    upsertProjectIndexEntry(workspaceRootPath, updated)

    return { success: true, project: updated }
  } catch (error) {
    debug('[project-storage] Failed to update project:', projectId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function linkProjectObjects(
  workspaceRootPath: string,
  projectId: string,
  links: Partial<ProjectLinks>,
  workspaceId?: string
): ProjectMutationResult {
  try {
    assertSafeProjectId(projectId)
    const project = readProjectDocument(workspaceRootPath, projectId, workspaceId)
    if (!project) return { success: false, error: 'Project not found' }

    const updated: ProjectDocument = {
      ...project,
      links: mergeProjectLinks(project.links, links),
      updatedAt: Date.now(),
    }

    writeProject(workspaceRootPath, updated)
    upsertProjectIndexEntry(workspaceRootPath, updated)

    return { success: true, project: updated }
  } catch (error) {
    debug('[project-storage] Failed to link project objects:', projectId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function unlinkProjectObjects(
  workspaceRootPath: string,
  projectId: string,
  links: Partial<ProjectLinks>,
  workspaceId?: string
): ProjectMutationResult {
  try {
    assertSafeProjectId(projectId)
    const project = readProjectDocument(workspaceRootPath, projectId, workspaceId)
    if (!project) return { success: false, error: 'Project not found' }

    const updated: ProjectDocument = {
      ...project,
      links: removeProjectLinks(project.links, links),
      updatedAt: Date.now(),
    }

    writeProject(workspaceRootPath, updated)
    upsertProjectIndexEntry(workspaceRootPath, updated)

    return { success: true, project: updated }
  } catch (error) {
    debug('[project-storage] Failed to unlink project objects:', projectId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function listProjectEntries(workspaceRootPath: string, workspaceId?: string): ProjectIndexEntry[] {
  const index = loadProjectIndex(workspaceRootPath)
  const entries = workspaceId
    ? index.projects.filter(entry => entry.workspaceId === workspaceId)
    : [...index.projects]
  return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function deleteProjectDocument(
  workspaceRootPath: string,
  projectId: string,
  workspaceId?: string
): DeleteProjectResult {
  try {
    assertSafeProjectId(projectId)
    const projectPath = getProjectDocumentPath(workspaceRootPath, projectId)

    if (workspaceId) {
      const existing = readProjectDocument(workspaceRootPath, projectId, workspaceId)
      if (!existing) return { success: false, error: 'Project not found' }
    }

    if (existsSync(projectPath)) {
      unlinkSync(projectPath)
    }

    withProjectIndexLock(workspaceRootPath, () => {
      const index = loadProjectIndex(workspaceRootPath)
      index.projects = index.projects.filter(entry => entry.id !== projectId)
      saveProjectIndex(workspaceRootPath, index)
    })

    return { success: true }
  } catch (error) {
    debug('[project-storage] Failed to delete project:', projectId, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
