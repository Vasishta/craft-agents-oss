import { describe, it, expect } from 'bun:test'
import type { Editor } from '@tiptap/core'
import { createTableBubbleActions, shouldShowTableBubbleMenu } from '../TiptapBubbleMenus'

function createMockEditor({ inTable = true, headerActive = false, codeBlockActive = false } = {}) {
  const calls: string[] = []

  const chainApi = {
    focus: () => {
      calls.push('focus')
      return chainApi
    },
    addRowAfter: () => {
      calls.push('addRowAfter')
      return chainApi
    },
    addColumnAfter: () => {
      calls.push('addColumnAfter')
      return chainApi
    },
    toggleHeaderRow: () => {
      calls.push('toggleHeaderRow')
      return chainApi
    },
    deleteTable: () => {
      calls.push('deleteTable')
      return chainApi
    },
    run: () => {
      calls.push('run')
      return true
    },
  }

  const editor = {
    isActive: (name: string) => {
      if (name === 'table') return inTable
      if (name === 'tableHeader') return headerActive
      if (name === 'codeBlock') return codeBlockActive
      return false
    },
    chain: () => chainApi,
  }

  return {
    editor: editor as unknown as Editor,
    calls,
  }
}

describe('tiptap table bubble menu helpers', () => {
  it('shows the table bubble only while a table is active outside code blocks', () => {
    const { editor } = createMockEditor({ inTable: true, codeBlockActive: false })
    expect(shouldShowTableBubbleMenu(editor)).toBe(true)

    const { editor: outsideTable } = createMockEditor({ inTable: false, codeBlockActive: false })
    expect(shouldShowTableBubbleMenu(outsideTable)).toBe(false)

    const { editor: insideCodeBlock } = createMockEditor({ inTable: true, codeBlockActive: true })
    expect(shouldShowTableBubbleMenu(insideCodeBlock)).toBe(false)
  })

  it('maps table actions to the expected chain calls', () => {
    const { editor, calls } = createMockEditor({ inTable: true, headerActive: true })
    const actions = createTableBubbleActions(editor)

    expect(actions.find((action) => action.id === 'toggle-header-row')?.isActive).toBe(true)

    actions.find((action) => action.id === 'add-row')?.run()
    expect(calls.slice(-3)).toEqual(['focus', 'addRowAfter', 'run'])

    actions.find((action) => action.id === 'add-column')?.run()
    expect(calls.slice(-3)).toEqual(['focus', 'addColumnAfter', 'run'])

    actions.find((action) => action.id === 'toggle-header-row')?.run()
    expect(calls.slice(-3)).toEqual(['focus', 'toggleHeaderRow', 'run'])

    actions.find((action) => action.id === 'delete-table')?.run()
    expect(calls.slice(-3)).toEqual(['focus', 'deleteTable', 'run'])
  })
})
