import { describe, it, expect } from 'bun:test'
import { isCompoundRoute, parseCompoundRoute } from '../route-parser'

describe('route parser performance', () => {
  it('isCompoundRoute handles 1000 calls efficiently', () => {
    const routes = [
      'pages/from-message/session-123/message-456',
      'artifact/session/session-abc/message/message-def',
      'allSessions',
      'flagged',
      'sources/source/github',
      'settings/shortcuts',
      'label/urgent',
    ]
    
    const iterations = 1000
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      for (const route of routes) {
        isCompoundRoute(route)
      }
    }
    
    const elapsed = performance.now() - start
    const callsPerMs = (routes.length * iterations) / elapsed
    
    console.log(`isCompoundRoute: ${callsPerMs.toFixed(0)} calls/ms (${elapsed.toFixed(2)}ms for ${routes.length * iterations} calls)`)
    
    // Keep this as a low floor so regressions are visible without making CI hardware-sensitive.
    expect(callsPerMs).toBeGreaterThan(100)
  })

  it('parseCompoundRoute handles pageCanvas routes efficiently', () => {
    const iterations = 10000
    const route = 'pages/from-message/session-abc123/message-def456'
    
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      parseCompoundRoute(route)
    }
    
    const elapsed = performance.now() - start
    const callsPerMs = iterations / elapsed
    
    console.log(`parseCompoundRoute (pageCanvas): ${callsPerMs.toFixed(0)} calls/ms (${elapsed.toFixed(2)}ms for ${iterations} calls)`)
    
    // Keep this as a low floor so regressions are visible without making CI hardware-sensitive.
    expect(callsPerMs).toBeGreaterThan(100)
  })

  it('supports legacy artifact route format efficiently', () => {
    const iterations = 10000
    const route = 'artifact/session/session-abc/message/message-def'
    
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      parseCompoundRoute(route)
    }
    
    const elapsed = performance.now() - start
    const callsPerMs = iterations / elapsed
    
    console.log(`parseCompoundRoute (legacy): ${callsPerMs.toFixed(0)} calls/ms (${elapsed.toFixed(2)}ms for ${iterations} calls)`)
    
    // Keep this as a low floor so regressions are visible without making CI hardware-sensitive.
    expect(callsPerMs).toBeGreaterThan(100)
  })
})
