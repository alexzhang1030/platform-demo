/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'
import type { Board, BoardGroup } from '@platform-demo/protocol'
import { createRectangleShape } from '@platform-demo/protocol'

import {
  findAnchorConnections,
  getBoardAnchorPositions,
  mergeBoardsThroughConnection,
  splitBoardGroupAfterRemoval,
} from './board-group'

function makeBoard(id: string, x: number, y: number, width = 200, height = 20): Board {
  return {
    id,
    name: id,
    thickness: 18,
    transform: { x, y, rotation: 0 },
    outline: createRectangleShape(width, height),
    holes: [],
  }
}

describe('getBoardAnchorPositions', () => {
  test('returns correct midpoint anchors for a flat board', () => {
    const board = makeBoard('b1', 0, 0, 200, 100)
    const anchors = getBoardAnchorPositions(board)

    expect(anchors.top).toEqual({ x: 100, y: 0 })
    expect(anchors.bottom).toEqual({ x: 100, y: 100 })
    expect(anchors.left).toEqual({ x: 0, y: 50 })
    expect(anchors.right).toEqual({ x: 200, y: 50 })
  })

  test('offsets anchor positions by board transform', () => {
    const board = makeBoard('b1', 50, 30, 100, 40)
    const anchors = getBoardAnchorPositions(board)

    expect(anchors.top).toEqual({ x: 100, y: 30 })
    expect(anchors.bottom).toEqual({ x: 100, y: 70 })
    expect(anchors.left).toEqual({ x: 50, y: 50 })
    expect(anchors.right).toEqual({ x: 150, y: 50 })
  })
})

describe('findAnchorConnections', () => {
  test('finds connection when two board anchors are within threshold', () => {
    // b1 right anchor at (200, 50), b2 left anchor at (205, 50) — distance 5
    const b1 = makeBoard('b1', 0, 40, 200, 20)
    const b2 = makeBoard('b2', 205, 40, 200, 20)

    const connections = findAnchorConnections([b1, b2], 40)
    expect(connections).toHaveLength(1)
    expect(connections[0]).toMatchObject({
      a: { boardId: 'b1', anchor: 'right' },
      b: { boardId: 'b2', anchor: 'left' },
    })
  })

  test('returns empty when boards are far apart', () => {
    const b1 = makeBoard('b1', 0, 0, 100, 20)
    const b2 = makeBoard('b2', 500, 0, 100, 20)

    expect(findAnchorConnections([b1, b2], 40)).toHaveLength(0)
  })

  test('returns empty for a single board', () => {
    const b1 = makeBoard('b1', 0, 0)
    expect(findAnchorConnections([b1], 40)).toHaveLength(0)
  })
})

describe('mergeBoardsThroughConnection', () => {
  test('creates a new group from two ungrouped boards', () => {
    const connection = {
      a: { boardId: 'b1', anchor: 'right' as const },
      b: { boardId: 'b2', anchor: 'left' as const },
    }

    const result = mergeBoardsThroughConnection([], connection)
    expect(result).toHaveLength(1)
    expect(result[0]?.boardIds).toContain('b1')
    expect(result[0]?.boardIds).toContain('b2')
    expect(result[0]?.connections).toHaveLength(1)
  })

  test('extends an existing group when a new board connects to a member', () => {
    const existingGroup: BoardGroup = {
      id: 'g1',
      name: 'Group 1',
      boardIds: ['b1', 'b2'],
      connections: [{ a: { boardId: 'b1', anchor: 'right' }, b: { boardId: 'b2', anchor: 'left' } }],
    }
    const connection = {
      a: { boardId: 'b2', anchor: 'right' as const },
      b: { boardId: 'b3', anchor: 'left' as const },
    }

    const result = mergeBoardsThroughConnection([existingGroup], connection)
    expect(result).toHaveLength(1)
    const merged = result[0]
    expect(merged?.boardIds).toContain('b1')
    expect(merged?.boardIds).toContain('b2')
    expect(merged?.boardIds).toContain('b3')
    expect(merged?.connections).toHaveLength(2)
  })

  test('merges two separate groups when a connection bridges them', () => {
    const g1: BoardGroup = {
      id: 'g1',
      name: 'G1',
      boardIds: ['b1', 'b2'],
      connections: [{ a: { boardId: 'b1', anchor: 'right' }, b: { boardId: 'b2', anchor: 'left' } }],
    }
    const g2: BoardGroup = {
      id: 'g2',
      name: 'G2',
      boardIds: ['b3', 'b4'],
      connections: [{ a: { boardId: 'b3', anchor: 'right' }, b: { boardId: 'b4', anchor: 'left' } }],
    }
    const bridgeConnection = {
      a: { boardId: 'b2', anchor: 'bottom' as const },
      b: { boardId: 'b3', anchor: 'top' as const },
    }

    const result = mergeBoardsThroughConnection([g1, g2], bridgeConnection)
    expect(result).toHaveLength(1)
    const merged = result[0]
    expect(merged?.boardIds).toHaveLength(4)
    expect(merged?.connections).toHaveLength(3)
  })
})

describe('splitBoardGroupAfterRemoval', () => {
  test('splits group when bridge board is removed', () => {
    const group: BoardGroup = {
      id: 'g1',
      name: 'G1',
      boardIds: ['b1', 'b2', 'b3'],
      connections: [
        { a: { boardId: 'b1', anchor: 'right' }, b: { boardId: 'b2', anchor: 'left' } },
        { a: { boardId: 'b2', anchor: 'right' }, b: { boardId: 'b3', anchor: 'left' } },
      ],
    }

    const result = splitBoardGroupAfterRemoval([group], 'b2')
    // b1 and b3 are now disconnected — each has only 1 board, so no groups
    expect(result).toHaveLength(0)
  })

  test('preserves group when non-bridge board is removed from 3-board chain', () => {
    const group: BoardGroup = {
      id: 'g1',
      name: 'G1',
      boardIds: ['b1', 'b2', 'b3'],
      connections: [
        { a: { boardId: 'b1', anchor: 'right' }, b: { boardId: 'b2', anchor: 'left' } },
        { a: { boardId: 'b2', anchor: 'right' }, b: { boardId: 'b3', anchor: 'left' } },
      ],
    }

    const result = splitBoardGroupAfterRemoval([group], 'b1')
    expect(result).toHaveLength(1)
    expect(result[0]?.boardIds).toContain('b2')
    expect(result[0]?.boardIds).toContain('b3')
    expect(result[0]?.boardIds).not.toContain('b1')
  })

  test('removes group entirely when fewer than 2 boards remain', () => {
    const group: BoardGroup = {
      id: 'g1',
      name: 'G1',
      boardIds: ['b1', 'b2'],
      connections: [{ a: { boardId: 'b1', anchor: 'right' }, b: { boardId: 'b2', anchor: 'left' } }],
    }

    const result = splitBoardGroupAfterRemoval([group], 'b1')
    expect(result).toHaveLength(0)
  })

  test('does not affect groups that do not contain the removed board', () => {
    const g1: BoardGroup = {
      id: 'g1',
      name: 'G1',
      boardIds: ['b1', 'b2'],
      connections: [{ a: { boardId: 'b1', anchor: 'right' }, b: { boardId: 'b2', anchor: 'left' } }],
    }
    const g2: BoardGroup = {
      id: 'g2',
      name: 'G2',
      boardIds: ['b3', 'b4'],
      connections: [{ a: { boardId: 'b3', anchor: 'right' }, b: { boardId: 'b4', anchor: 'left' } }],
    }

    const result = splitBoardGroupAfterRemoval([g1, g2], 'b1')
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('g2')
  })
})
