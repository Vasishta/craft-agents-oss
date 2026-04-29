import { describe, it, expect } from 'bun:test'
import { isCompoundRoute } from '../route-parser'

/**
 * Regression tests for isCompoundRoute.
 *
 * The fast-path char-code switch must cover every prefix family that the
 * full parseCompoundRoute supports, including sub-routes with slashes.
 * A previous bug had the 'a' fast-path returning early (missing
 * 'automations') and the 's' fast-path returning early (missing 'state').
 */
describe('isCompoundRoute: all prefix families', () => {
  // --- 'a' prefix ---
  it.each([
    'allSessions',
    'allSessions/session/abc',
    'archived',
    'archived/session/abc',
    'automations',
    'automations/scheduled',
    'automations/event',
    'automations/agentic',
    'automations/automation/id-1',
    'automations/scheduled/automation/id-1',
    'artifact/session/s1/message/m1',
  ])('recognises "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(true)
  })

  // --- 's' prefix ---
  it.each([
    'sources',
    'sources/api',
    'sources/mcp',
    'sources/local',
    'sources/source/github',
    'search',
    'settings',
    'settings/app',
    'settings/shortcuts',
    'skills',
    'skills/skill/my-skill',
    'state',
    'state/todo',
    'state/in-progress',
  ])('recognises "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(true)
  })

  // --- 'p' prefix ---
  it.each([
    'pages',
    'pages/from-message/s1/m1',
    'pages/page/abc-123',
  ])('recognises "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(true)
  })

  // --- 'f' prefix ---
  it.each([
    'flagged',
    'flagged/session/abc',
  ])('recognises "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(true)
  })

  // --- 'v' prefix ---
  it.each([
    'view',
    'view/my-view',
    'view/my-view/session/abc',
  ])('recognises "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(true)
  })

  // --- 'l' prefix ---
  it.each([
    'label',
    'label/my-label',
    'label/my-label/session/abc',
  ])('recognises "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(true)
  })

  // --- Non-compound routes ---
  it.each([
    'session-id-plain',
    'random-string',
    'home',
    '',
    'pages/',
  ])('rejects "%s"', (route) => {
    expect(isCompoundRoute(route)).toBe(false)
  })
})
