/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'
import type { PatternDocument } from '@platform-demo/protocol'
import {
  createDefaultPatternDocument,
  createRectangleShape,
} from '@platform-demo/protocol'

import {
  addGableRoofToGroup,
  commitBoxelAtColumn,
  commitBoxelFromAssemblyCell,
  createEditorSelection,
  removeBoxelFromAssembly,
  normalizeEditorSelection,
  selectSingleAssembly,
  toggleAssemblySelection,
} from './pattern-studio'
import {
  applyAiCommand,
  interpretAiPrompt,
  runManufacturingChecks,
} from './pattern-studio-ai'

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

function getShapeHeight(shape: PatternDocument['boards'][number]['outline']) {
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  shape.segments.forEach((segment) => {
    segment.points.forEach((point) => {
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    })
  })

  return maxY - minY
}

describe('pattern studio gable roof helpers', () => {
  test('computes roof board height from perpendicular wall span, not wall origin distance', () => {
    const document: PatternDocument = {
      ...createDefaultPatternDocument(),
      boards: [
        {
          id: 'wall-a',
          name: 'Wall A',
          thickness: 18,
          material: 'birch',
          transform: { x: 0, y: 0, rotation: 0, orientation: 'upright' },
          outline: createRectangleShape(200, 100),
          holes: [],
        },
        {
          id: 'wall-b',
          name: 'Wall B',
          thickness: 18,
          material: 'birch',
          transform: { x: 200, y: 100, rotation: 180, orientation: 'upright' },
          outline: createRectangleShape(200, 100),
          holes: [],
        },
      ],
      assemblies: [],
      boardGroups: [{
        id: 'group-1',
        name: 'Group 1',
        boardIds: ['wall-a', 'wall-b'],
        connections: [],
      }],
    }

    const result = addGableRoofToGroup(document, 'group-1')

    expect(result).not.toBeNull()
    if (!result) {
      return
    }

    const roofBoards = result.document.boards.filter(board => board.name.startsWith('Roof panel'))
    expect(roofBoards).toHaveLength(2)

    const expectedRoofHeight = 50 / Math.cos((30 * Math.PI) / 180)
    roofBoards.forEach((board) => {
      expect(getShapeHeight(board.outline)).toBeCloseTo(expectedRoofHeight, 5)
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

  test('stacks upward when clicking the top face of an existing boxel', () => {
    const firstCommit = commitBoxelAtColumn(createDefaultPatternDocument(), { x: 80, y: 120 })
    const assembly = firstCommit.document.assemblies[0]

    expect(assembly).toBeDefined()
    if (!assembly) {
      return
    }

    const result = commitBoxelFromAssemblyCell(
      firstCommit.document,
      assembly.id,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    )

    expect(result.document.assemblies).toHaveLength(1)
    expect(result.document.assemblies[0]?.cells).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ])
  })

  test('adds laterally when clicking the side face of an existing boxel', () => {
    const firstCommit = commitBoxelAtColumn(createDefaultPatternDocument(), { x: 80, y: 120 })
    const assembly = firstCommit.document.assemblies[0]

    expect(assembly).toBeDefined()
    if (!assembly) {
      return
    }

    const result = commitBoxelFromAssemblyCell(
      firstCommit.document,
      assembly.id,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    )

    expect(result.document.assemblies).toHaveLength(1)
    expect(result.document.assemblies[0]?.cells).toEqual([
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

describe('pattern studio ai prompt parser', () => {
  test('parses a generate prompt into a ready box command', () => {
    const command = interpretAiPrompt('生成一个 120x80x60mm 的收纳盒，板厚 3mm，使用指接榫，带提手孔')

    expect(command.status).toBe('ready')
    expect(command.mode).toBe('generate')
    expect(command.summary).toContain('box')
    if (command.command?.type !== 'generate-structure') {
      throw new Error('Expected generate command')
    }

    expect(command.command.structure).toBe('box')
    expect(command.command.dimensions).toEqual({
      width: 120,
      height: 80,
      depth: 60,
    })
    expect(command.command.material.thickness).toBe(3)
    expect(command.command.joints.type).toBe('finger-joint')
    expect(command.command.features.handleCutout).toBe(true)
  })

  test('parses a patch prompt into controlled operations', () => {
    const command = interpretAiPrompt('把高度增加 20mm，再加一个提手孔，并把板厚改成 4mm')

    expect(command.status).toBe('ready')
    expect(command.mode).toBe('patch')
    if (command.command?.type !== 'patch-structure') {
      throw new Error('Expected patch command')
    }

    expect(command.command.operations).toEqual([
      { type: 'resize', height: 20, mode: 'delta' },
      { type: 'toggle-handle-cutout', enabled: true },
      { type: 'adjust-thickness', thickness: 4 },
    ])
  })

  test('marks a missing thickness generate prompt as partial', () => {
    const command = interpretAiPrompt('生成一个 120x80x60mm 的收纳盒')

    expect(command.status).toBe('partial')
    expect(command.missing).toEqual(['material thickness'])
  })

  test('fails unsupported prompts cleanly', () => {
    const command = interpretAiPrompt('帮我做一个宇宙飞船')

    expect(command.status).toBe('failed')
    expect(command.command).toBeNull()
  })
})

describe('pattern studio ai command executor', () => {
  test('generates a box document with deterministic boards', () => {
    const result = applyAiCommand(
      createDefaultPatternDocument(),
      interpretAiPrompt('生成一个 120x80x60mm 的收纳盒，板厚 3mm，使用指接榫，带提手孔'),
    )

    expect(result.changed).toBe(true)
    expect(result.document.boards).toHaveLength(5)
    expect(result.document.boards.map(board => board.name)).toEqual([
      'Front panel',
      'Back panel',
      'Left panel',
      'Right panel',
      'Bottom panel',
    ])
    expect(result.executionSteps).toEqual([
      'Parse prompt into structure intent',
      'Create box panels',
      'Apply finger-joint intent',
      'Apply handle cutout',
      'Lay out flat pattern',
    ])
    expect(result.document.boards[0]?.holes).toHaveLength(1)
  })

  test('patches the current structure with controlled operations', () => {
    const generated = applyAiCommand(
      createDefaultPatternDocument(),
      interpretAiPrompt('生成一个 120x80x60mm 的收纳盒，板厚 3mm，使用指接榫'),
    )

    const patched = applyAiCommand(
      generated.document,
      interpretAiPrompt('把高度增加 20mm，再加一个提手孔，并把板厚改成 4mm'),
    )

    expect(patched.changed).toBe(true)
    expect(patched.document.boards.every(board => board.thickness === 4)).toBe(true)
    expect(patched.document.boards[0]?.holes).toHaveLength(1)
    const frontPanel = patched.document.boards.find(board => board.name === 'Front panel')
    expect(frontPanel?.outline.segments[2]?.points[0]?.y).toBe(100)
  })
})

describe('pattern studio ai manufacturing checks', () => {
  test('warns when a panel becomes too slender for manufacturing confidence', () => {
    const generated = applyAiCommand(
      createDefaultPatternDocument(),
      interpretAiPrompt('生成一个 120x80x20mm 的收纳盒，板厚 18mm，使用插槽'),
    )

    const checks = runManufacturingChecks(generated.document, generated.command)

    expect(checks.some(check => check.severity === 'warning' && check.code === 'thin-span')).toBe(true)
  })

  test('returns passing checks for a healthy generated box', () => {
    const generated = applyAiCommand(
      createDefaultPatternDocument(),
      interpretAiPrompt('生成一个 120x80x60mm 的收纳盒，板厚 3mm，使用指接榫'),
    )

    const checks = runManufacturingChecks(generated.document, generated.command)

    expect(checks.some(check => check.severity === 'pass' && check.code === 'flat-layout-ready')).toBe(true)
    expect(checks.some(check => check.severity === 'warning')).toBe(false)
  })
})
