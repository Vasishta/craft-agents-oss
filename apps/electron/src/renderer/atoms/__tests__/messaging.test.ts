import { describe, expect, it } from 'bun:test'
import { createStore } from 'jotai'
import {
  messagingBindingsAtom,
  messagingBindingsBySessionAtom,
  messagingBindingsForSessionAtomFamily,
  type MessagingBinding,
} from '../messaging'

const binding = (overrides: Partial<MessagingBinding>): MessagingBinding => ({
  id: overrides.id ?? 'binding-1',
  workspaceId: overrides.workspaceId ?? 'ws-1',
  sessionId: overrides.sessionId ?? 'session-1',
  platform: overrides.platform ?? 'telegram',
  channelId: overrides.channelId ?? 'channel-1',
  channelName: overrides.channelName,
  enabled: overrides.enabled ?? true,
  createdAt: overrides.createdAt ?? 1,
})

describe('messaging atoms', () => {
  it('exposes per-session bindings without forcing callers through the grouped map', () => {
    const store = createStore()
    store.set(messagingBindingsAtom, [
      binding({ id: 'binding-1', sessionId: 'session-1' }),
      binding({ id: 'binding-2', sessionId: 'session-2', platform: 'whatsapp' }),
      binding({ id: 'binding-3', sessionId: 'session-1', enabled: false }),
    ])

    expect(store.get(messagingBindingsForSessionAtomFamily('session-1')).map((item) => item.id)).toEqual(['binding-1'])
    expect(store.get(messagingBindingsForSessionAtomFamily('session-2')).map((item) => item.id)).toEqual(['binding-2'])

    const grouped = store.get(messagingBindingsBySessionAtom)
    expect(grouped.get('session-1')?.map((item) => item.id)).toEqual(['binding-1'])
    expect(grouped.get('session-2')?.map((item) => item.id)).toEqual(['binding-2'])
  })
})
