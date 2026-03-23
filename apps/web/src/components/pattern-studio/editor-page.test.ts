/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'

import { getToolAfterEscape } from './editor-page'

describe('editor page tool escape handling', () => {
  test('returns select for transient creation tools', () => {
    expect(getToolAfterEscape('boxel-mode')).toBe('select')
    expect(getToolAfterEscape('boxel-remove')).toBe('select')
    expect(getToolAfterEscape('create-board')).toBe('select')
    expect(getToolAfterEscape('pen-sketch')).toBe('select')
  })

  test('keeps select unchanged', () => {
    expect(getToolAfterEscape('select')).toBe('select')
  })
})
