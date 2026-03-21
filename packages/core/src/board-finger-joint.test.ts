/// <reference types="bun" />
import { describe, expect, test } from 'bun:test'
import type { Board, BoardGroup } from '@xtool-demo/protocol'
import { createLineShape, createRectangleShape } from '@xtool-demo/protocol'

import {
  classifyConnectionAngle,
  computeFingerPattern,
  getBoardOutlineWithJoints,
} from './board-finger-joint'

// Upright board: outline is width×height in local space, transform has orientation='upright'
function makeUprightBoard(
  id: string,
  x: number,
  y: number,
  rotation: number,
  width = 200,
  height = 100,
  thickness = 18,
): Board {
  return {
    id,
    name: id,
    thickness,
    transform: { x, y, rotation, orientation: 'upright' },
    outline: createLineShape([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ]),
    holes: [],
  }
}

// Flat board (no orientation): outline is width×height
function makeFlatBoard(id: string, x: number, y: number, width = 200, height = 20): Board {
  return {
    id,
    name: id,
    thickness: 18,
    transform: { x, y, rotation: 0 },
    outline: createRectangleShape(width, height),
    holes: [],
  }
}

describe('classifyConnectionAngle', () => {
  test('classifies 90-degree L-joint correctly', () => {
    // boardA goes right (rotation 0), boardB goes up (rotation 90)
    const boardA = makeUprightBoard('a', 0, 0, 0)
    const boardB = makeUprightBoard('b', 200, 0, 90)
    const connection = {
      a: { boardId: 'a', anchor: 'right' as const },
      b: { boardId: 'b', anchor: 'left' as const },
    }
    expect(classifyConnectionAngle(boardA, boardB, connection)).toBe('L-joint')
  })

  test('classifies 0-degree straight joint correctly (same direction)', () => {
    // Both boards go right (rotation 0), meeting end-to-end
    const boardA = makeUprightBoard('a', 0, 0, 0)
    const boardB = makeUprightBoard('b', 200, 0, 0)
    const connection = {
      a: { boardId: 'a', anchor: 'right' as const },
      b: { boardId: 'b', anchor: 'left' as const },
    }
    expect(classifyConnectionAngle(boardA, boardB, connection)).toBe('straight')
  })

  test('classifies 180-degree inline joint as straight', () => {
    // boardA goes right, boardB goes right but we connect right-to-right (opposite outward dirs)
    const boardA = makeUprightBoard('a', 0, 0, 0)
    const boardB = makeUprightBoard('b', 200, 0, 0)
    const connection = {
      a: { boardId: 'a', anchor: 'right' as const },
      b: { boardId: 'b', anchor: 'right' as const },
    }
    expect(classifyConnectionAngle(boardA, boardB, connection)).toBe('straight')
  })

  test('returns unsupported for top/bottom anchors', () => {
    const boardA = makeUprightBoard('a', 0, 0, 0)
    const boardB = makeUprightBoard('b', 200, 0, 0)
    const connection = {
      a: { boardId: 'a', anchor: 'top' as const },
      b: { boardId: 'b', anchor: 'left' as const },
    }
    expect(classifyConnectionAngle(boardA, boardB, connection)).toBe('unsupported')
  })

  test('returns unsupported for non-upright boards', () => {
    const boardA = makeFlatBoard('a', 0, 0)
    const boardB = makeFlatBoard('b', 200, 0)
    const connection = {
      a: { boardId: 'a', anchor: 'right' as const },
      b: { boardId: 'b', anchor: 'left' as const },
    }
    expect(classifyConnectionAngle(boardA, boardB, connection)).toBe('unsupported')
  })
})

describe('computeFingerPattern', () => {
  test('returns odd finger count', () => {
    const { fingerCount } = computeFingerPattern(100, 18)
    expect(fingerCount % 2).toBe(1)
  })

  test('clamps to minimum of 3 fingers', () => {
    // Very thin board: fingerCount would be very low
    const { fingerCount } = computeFingerPattern(10, 18)
    expect(fingerCount).toBe(3)
  })

  test('clamps to maximum of 15 fingers', () => {
    // Very tall board with thin thickness
    const { fingerCount } = computeFingerPattern(1000, 5)
    expect(fingerCount).toBe(15)
  })

  test('fingerWidth equals height divided by fingerCount', () => {
    const height = 120
    const { fingerCount, fingerWidth } = computeFingerPattern(height, 18)
    expect(fingerWidth).toBeCloseTo(height / fingerCount, 5)
  })

  test('enforces odd count when natural count is even', () => {
    // height=72, thickness=18 → round(72/36)=2 → bump to 3
    const { fingerCount } = computeFingerPattern(72, 18)
    expect(fingerCount % 2).toBe(1)
  })
})

describe('getBoardOutlineWithJoints', () => {
  test('returns original outline when board has no connections', () => {
    const board = makeUprightBoard('a', 0, 0, 0)
    const result = getBoardOutlineWithJoints(board, [], [board])
    expect(result).toBe(board.outline)
  })

  test('returns original outline when board is not in any group', () => {
    const board = makeUprightBoard('a', 0, 0, 0)
    const otherGroup: BoardGroup = {
      id: 'g1',
      name: 'g1',
      boardIds: ['x', 'y'],
      connections: [],
    }
    const result = getBoardOutlineWithJoints(board, [otherGroup], [board])
    expect(result).toBe(board.outline)
  })

  test('returns original outline for non-upright boards', () => {
    const board = makeFlatBoard('a', 0, 0)
    const group: BoardGroup = {
      id: 'g1',
      name: 'g1',
      boardIds: ['a', 'b'],
      connections: [{
        a: { boardId: 'a', anchor: 'right' },
        b: { boardId: 'b', anchor: 'left' },
      }],
    }
    const boardB = makeFlatBoard('b', 200, 0)
    const result = getBoardOutlineWithJoints(board, [group], [board, boardB])
    expect(result).toBe(board.outline)
  })

  test('returns a different outline when an L-joint connection exists', () => {
    const boardA = makeUprightBoard('a', 0, 0, 0, 200, 100, 18)
    const boardB = makeUprightBoard('b', 200, 0, 90, 200, 100, 18)
    const group: BoardGroup = {
      id: 'g1',
      name: 'g1',
      boardIds: ['a', 'b'],
      connections: [{
        a: { boardId: 'a', anchor: 'right' },
        b: { boardId: 'b', anchor: 'left' },
      }],
    }
    const result = getBoardOutlineWithJoints(boardA, [group], [boardA, boardB])
    // Should not be the same object — joint was applied
    expect(result).not.toBe(boardA.outline)
    // Should have more points than a simple rectangle (4 points)
    expect(result.segments.length).toBeGreaterThan(4)
  })

  test('modified outline has more points than the base rectangle', () => {
    const boardA = makeUprightBoard('a', 0, 0, 0, 200, 100, 18)
    const boardB = makeUprightBoard('b', 200, 0, 90, 200, 100, 18)
    const group: BoardGroup = {
      id: 'g1',
      name: 'g1',
      boardIds: ['a', 'b'],
      connections: [{
        a: { boardId: 'a', anchor: 'right' },
        b: { boardId: 'b', anchor: 'left' },
      }],
    }
    const { fingerCount } = computeFingerPattern(100, 18)
    const result = getBoardOutlineWithJoints(boardA, [group], [boardA, boardB])
    // Each finger edge adds fingerCount * 2 points; base rect has 4 points
    // rough lower bound: at least 4 + fingerCount points
    expect(result.segments.length).toBeGreaterThanOrEqual(4 + fingerCount)
  })
})
