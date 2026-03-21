/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'
import type { BoxelAssembly } from '@xtool-demo/protocol'

import {
  appendBoxelCellAboveColumn,
  buildBoxelAssemblyBounds,
  buildJointCandidates,
  findFaceAdjacentAssemblies,
  getBoxelCellWorldPosition,
  getBoxelColumnHeight,
  splitAssemblyIntoConnectedComponents,
  isBoxelCellOccupied,
} from './boxel'

const assembly: BoxelAssembly = {
  id: 'assembly-1',
  name: 'Tower',
  cellSize: 40,
  origin: { x: 120, y: 80 },
  cells: [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
  ],
}

describe('boxel helpers', () => {
  test('reports occupied cells and per-column height', () => {
    expect(isBoxelCellOccupied(assembly, { x: 0, y: 0, z: 1 })).toBe(true)
    expect(isBoxelCellOccupied(assembly, { x: 0, y: 0, z: 2 })).toBe(false)
    expect(getBoxelColumnHeight(assembly, { x: 0, y: 0 })).toBe(2)
  })

  test('appends one cell above the current highest cell in a column', () => {
    const nextAssembly = appendBoxelCellAboveColumn(assembly, { x: 0, y: 0 })

    expect(nextAssembly.cells).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: 2 },
    ])
  })

  test('converts integer cell coordinates to world-space cube positions', () => {
    expect(getBoxelCellWorldPosition(assembly, { x: 0, y: 0, z: 1 })).toEqual({
      x: 140,
      y: 100,
      z: 60,
    })
  })

  test('builds assembly bounds from occupied cells', () => {
    expect(buildBoxelAssemblyBounds(assembly)).toEqual({
      minX: 120,
      minY: 80,
      minZ: 0,
      maxX: 160,
      maxY: 120,
      maxZ: 80,
      width: 40,
      height: 40,
      depth: 80,
    })
  })

  test('finds assemblies that share an X or Y face with a new cell', () => {
    const adjacentAssemblies: BoxelAssembly[] = [
      assembly,
      {
        id: 'assembly-2',
        name: 'Neighbor',
        cellSize: 40,
        origin: { x: 120, y: 80 },
        cells: [{ x: 2, y: 0, z: 0 }],
      },
    ]

    const touched = findFaceAdjacentAssemblies(adjacentAssemblies, { x: 4, y: 2, z: 0 })

    expect(touched.map(currentAssembly => currentAssembly.id)).toEqual([
      'assembly-1',
      'assembly-2',
    ])
  })

  test('derives joint candidates from face-connected cells in the same assembly', () => {
    const faceConnectedAssembly: BoxelAssembly = {
      ...assembly,
      cells: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 },
      ],
    }

    expect(buildJointCandidates(faceConnectedAssembly)).toEqual([
      {
        axis: 'x',
        from: { x: 0, y: 0, z: 0 },
        to: { x: 1, y: 0, z: 0 },
      },
      {
        axis: 'y',
        from: { x: 1, y: 0, z: 0 },
        to: { x: 1, y: 1, z: 0 },
      },
    ])
  })

  test('splits an assembly into multiple connected components after a bridge cell is removed', () => {
    const bridgedAssembly: BoxelAssembly = {
      ...assembly,
      cells: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
      ],
    }

    const components = splitAssemblyIntoConnectedComponents({
      ...bridgedAssembly,
      cells: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
      ],
    })

    expect(components).toHaveLength(2)
    expect(components.map(component => component.cells)).toEqual([
      [{ x: 0, y: 0, z: 0 }],
      [{ x: 0, y: 0, z: 0 }],
    ])
  })
})
