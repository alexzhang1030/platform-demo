/// <reference types="bun" />
import { beforeEach, describe, expect, test } from 'bun:test'

import { getStoredTheme, resolveTheme } from './theme-provider'

const storageState = new Map<string, string>()
const mockStorage: Storage = {
  get length() {
    return storageState.size
  },
  clear() {
    storageState.clear()
  },
  getItem(key) {
    return storageState.get(key) ?? null
  },
  key(index) {
    const keys = [...storageState.keys()]
    return keys[index] ?? null
  },
  removeItem(key) {
    storageState.delete(key)
  },
  setItem(key, value) {
    storageState.set(key, value)
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: mockStorage,
})

describe('theme provider helpers', () => {
  beforeEach(() => {
    mockStorage.clear()
  })

  test('getStoredTheme returns stored supported value', () => {
    localStorage.setItem('theme', 'dark')

    expect(getStoredTheme('theme', 'system')).toBe('dark')
  })

  test('getStoredTheme falls back to default for unsupported values', () => {
    localStorage.setItem('theme', 'sepia')

    expect(getStoredTheme('theme', 'system')).toBe('system')
  })

  test('resolveTheme maps system to current system theme', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark')
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
  })
})
