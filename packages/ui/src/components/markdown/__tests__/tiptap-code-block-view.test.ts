import { describe, expect, it } from 'bun:test'
import {
  buildDuplicateCodeBlockPayload,
  getCodeBlockEmptyPlaceholder,
  normalizeCodeBlockWrap,
} from '../TiptapCodeBlockView'

describe('tiptap code block view helpers', () => {
  it('normalizes wrap attributes from boolean-like values', () => {
    expect(normalizeCodeBlockWrap(true)).toBe(true)
    expect(normalizeCodeBlockWrap('true')).toBe(true)
    expect(normalizeCodeBlockWrap(false)).toBe(false)
    expect(normalizeCodeBlockWrap(undefined)).toBe(false)
  })

  it('builds language-aware empty placeholders', () => {
    expect(getCodeBlockEmptyPlaceholder(null)).toBe('Paste a snippet or start typing.')
    expect(getCodeBlockEmptyPlaceholder('tsx')).toContain('TSX')
    expect(getCodeBlockEmptyPlaceholder('python')).toContain('Python')
  })

  it('duplicates code blocks with their language, wrap preference, and text content', () => {
    const payload = buildDuplicateCodeBlockPayload({
      attrs: {
        language: 'typescript',
        wrap: true,
      },
      textContent: 'const value = 42',
    } as never)

    expect(payload).toEqual({
      type: 'codeBlock',
      attrs: {
        language: 'typescript',
        wrap: true,
      },
      content: [
        {
          type: 'text',
          text: 'const value = 42',
        },
      ],
    })
  })

  it('preserves an editable placeholder when duplicating an empty block', () => {
    const payload = buildDuplicateCodeBlockPayload({
      attrs: {
        language: null,
        wrap: false,
      },
      textContent: '',
    } as never)

    expect(payload.content[0]?.text).toBe(' ')
    expect(payload.attrs.language).toBe('plaintext')
  })
})
