/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'

import {
  createDefaultPatternDocument,
  parsePatternDocument,
  parsePatternJson,
  stringifyPatternDocument,
} from './index'

describe('pattern document boxel assemblies', () => {
  test('default pattern document includes an empty assemblies collection', () => {
    const document = createDefaultPatternDocument()

    expect(document.assemblies).toEqual([])
  })

  test('parses documents that include persisted boxel assemblies', () => {
    const parsed = parsePatternDocument({
      version: '1.0',
      metadata: {
        name: 'Boxel stack',
        unit: 'mm',
        createdAt: '2026-03-21T00:00:00.000Z',
        updatedAt: '2026-03-21T00:00:00.000Z',
      },
      boards: [],
      assemblies: [
        {
          id: 'assembly-1',
          name: 'Tower',
          cellSize: 40,
          origin: { x: 120, y: 80 },
          cells: [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
          ],
        },
      ],
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.value.assemblies).toHaveLength(1)
    expect(parsed.value.assemblies[0]?.cells).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ])
  })

  test('round-trips boxel assemblies through json helpers', () => {
    const document = {
      ...createDefaultPatternDocument(),
      assemblies: [
        {
          id: 'assembly-1',
          name: 'Tower',
          cellSize: 40,
          origin: { x: 0, y: 0 },
          cells: [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: 2 },
          ],
        },
      ],
    }

    const json = stringifyPatternDocument(document)
    const parsed = parsePatternJson(json)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.value.assemblies).toEqual(document.assemblies)
  })
})
