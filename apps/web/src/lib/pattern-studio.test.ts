/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'
import type { PatternDocument } from '@xtool-demo/protocol'
import {
  createDefaultPatternDocument,
  createRectangleShape,
} from '@xtool-demo/protocol'

import {
  commitBoxelAtColumn,
  createEditorSelection,
  removeBoxelFromAssembly,
  normalizeEditorSelection,
  selectSingleAssembly,
  toggleAssemblySelection,
} from './pattern-studio'

describe('pattern studio selection helpers', () => {
  test('can select a single assembly without board selection', () => {
    expect(selectSingleAssembly('assembly-1')).toEqual({
      activeAssemblyId: 'assembly-1',
      activeBoardId: '',
      selectedAssemblyIds: ['assembly-1'],
      selectedBoardIds: [],
    })
  })

  test('normalizes selection when the active assembly no longer exists', () => {
    const document: PatternDocument = {
      ...createDefaultPatternDocument(),
      boards: [{
        id: 'board-1',
        name: 'Panel',
        thickness: 18,
        material: 'birch',
        transform: { x: 0, y: 0, rotation: 0, orientation: 'flat' },
        outline: createRectangleShape(100, 40),
        holes: [],
      }],
      assemblies: [],
    }

    const selection = {
      ...createEditorSelection(''),
      activeAssemblyId: 'missing-assembly',
      selectedAssemblyIds: ['missing-assembly'],
    }

    expect(normalizeEditorSelection(document, selection)).toEqual({
      activeAssemblyId: '',
      activeBoardId: 'board-1',
      selectedAssemblyIds: [],
      selectedBoardIds: ['board-1'],
    })
  })

  test('toggles assembly multi-selection', () => {
    const selection = selectSingleAssembly('assembly-1')

    expect(toggleAssemblySelection(selection, 'assembly-2')).toEqual({
      activeAssemblyId: 'assembly-2',
      activeBoardId: '',
      selectedAssemblyIds: ['assembly-1', 'assembly-2'],
      selectedBoardIds: [],
    })
  })
})

describe('pattern studio boxel commit helpers', () => {
  test('creates a new assembly when clicking an empty column', () => {
    const document = createDefaultPatternDocument()
    const result = commitBoxelAtColumn(document, { x: 80, y: 120 })

    expect(result.document.assemblies).toHaveLength(1)
    expect(result.selection).toEqual({
      activeAssemblyId: result.document.assemblies[0]?.id ?? '',
      activeBoardId: '',
      selectedAssemblyIds: [result.document.assemblies[0]?.id ?? ''],
      selectedBoardIds: [],
    })
    expect(result.document.assemblies[0]?.cells).toEqual([{ x: 0, y: 0, z: 0 }])
  })

  test('stacks upward when clicking the same assembly column', () => {
    const firstCommit = commitBoxelAtColumn(createDefaultPatternDocument(), { x: 80, y: 120 })
    const secondCommit = commitBoxelAtColumn(firstCommit.document, { x: 80, y: 120 })

    expect(secondCommit.document.assemblies).toHaveLength(1)
    expect(secondCommit.document.assemblies[0]?.cells).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ])
  })

  test('adds a lateral face-connected boxel into the same assembly', () => {
    const firstCommit = commitBoxelAtColumn(createDefaultPatternDocument(), { x: 80, y: 120 })
    const secondCommit = commitBoxelAtColumn(firstCommit.document, { x: 120, y: 120 })

    expect(secondCommit.document.assemblies).toHaveLength(1)
    expect(secondCommit.document.assemblies[0]?.cells).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ])
  })

  test('bridges multiple assemblies into one connected result', () => {
    const firstCommit = commitBoxelAtColumn(createDefaultPatternDocument(), { x: 80, y: 120 })
    const secondCommit = commitBoxelAtColumn(firstCommit.document, { x: 160, y: 120 })
    const bridgeCommit = commitBoxelAtColumn(secondCommit.document, { x: 120, y: 120 })

    expect(bridgeCommit.document.assemblies).toHaveLength(1)
    expect(bridgeCommit.document.assemblies[0]?.cells).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ])
  })

  test('removes one boxel and splits disconnected remnants into separate assemblies', () => {
    const firstCommit = commitBoxelAtColumn(createDefaultPatternDocument(), { x: 80, y: 120 })
    const secondCommit = commitBoxelAtColumn(firstCommit.document, { x: 120, y: 120 })
    const thirdCommit = commitBoxelAtColumn(secondCommit.document, { x: 160, y: 120 })
    const assembly = thirdCommit.document.assemblies[0]

    expect(assembly).toBeDefined()
    if (!assembly) {
      return
    }

    const result = removeBoxelFromAssembly(thirdCommit.document, assembly.id, { x: 1, y: 0, z: 0 })

    expect(result.document.assemblies).toHaveLength(2)
    expect(result.document.assemblies.map(currentAssembly => currentAssembly.cells)).toEqual([
      [{ x: 0, y: 0, z: 0 }],
      [{ x: 0, y: 0, z: 0 }],
    ])
  })
})
