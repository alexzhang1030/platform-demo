import type {
  Board,
  BoardAnchorSide,
  BoardConnection,
  BoardGroup,
  ControlPoint,
  Path2DShape,
} from '@xtool-demo/protocol'
import { createLineShape } from '@xtool-demo/protocol'

import { getUprightBoardBaseline, getUprightBoardHeight, getUprightBoardLength } from './upright-board'

export type ConnectionAngle = 'L-joint' | 'straight' | 'unsupported'

/**
 * Returns the outward direction vector from a board at a given anchor side.
 * For left/right anchors (the ends of the baseline): the outward direction
 * points away from the board body.
 */
function getOutwardDirection(board: Board, anchor: BoardAnchorSide): ControlPoint | null {
  const baseline = getUprightBoardBaseline(board)
  if (!baseline) {
    return null
  }

  if (anchor === 'left') {
    return { x: -baseline.direction.x, y: -baseline.direction.y }
  }

  if (anchor === 'right') {
    return { x: baseline.direction.x, y: baseline.direction.y }
  }

  // top/bottom anchors are mid-face — not supported for finger joints
  return null
}

/**
 * Classifies the connection angle between two boards at a given anchor pair.
 * Uses the cross product magnitude to determine the angle between boards:
 *   |cross| > 0.5  → L-joint (angle between ~30° and ~150°)
 *   |cross| ≤ 0.5  → straight / inline joint (angle ≤ 30° or ≥ 150°)
 */
export function classifyConnectionAngle(
  boardA: Board,
  boardB: Board,
  connection: BoardConnection,
): ConnectionAngle {
  const dirA = getOutwardDirection(boardA, connection.a.anchor)
  const dirB = getOutwardDirection(boardB, connection.b.anchor)

  if (!dirA || !dirB) {
    return 'unsupported'
  }

  const cross = Math.abs(dirA.x * dirB.y - dirA.y * dirB.x)

  if (cross > 0.5) {
    return 'L-joint'
  }

  return 'straight'
}

/**
 * Computes finger count and width for a board of given height and thickness.
 * fingerCount is always odd (so both ends of the edge start and end with a tab).
 * Clamped to [3, 15].
 */
export function computeFingerPattern(
  height: number,
  thickness: number,
): { fingerCount: number; fingerWidth: number } {
  let count = Math.round(height / (2 * thickness))
  count = Math.max(3, Math.min(15, count))

  // Enforce odd count
  if (count % 2 === 0) {
    count += 1
  }

  return {
    fingerCount: count,
    fingerWidth: height / count,
  }
}

/**
 * Generates the points for one edge of a finger joint in local board space.
 * The edge runs along the Y axis (from yStart to yEnd) at a fixed X position.
 *
 * @param xBase      — X coordinate of the edge face (0 for left, length for right)
 * @param yStart     — Y at which the edge starts (in the outline winding order)
 * @param yEnd       — Y at which the edge ends
 * @param depth      — How far tabs protrude outward (positive = outward)
 * @param tabDir     — Direction tabs protrude: +1 for right edge, -1 for left edge
 * @param fingerWidth — Height of each finger
 * @param fingerCount — Total number of fingers (must be odd)
 * @param startWithTab — Whether the first finger (at yStart) is a tab
 */
function buildFingerEdgePoints(
  xBase: number,
  yStart: number,
  yEnd: number,
  depth: number,
  tabDir: 1 | -1,
  fingerWidth: number,
  fingerCount: number,
  startWithTab: boolean,
): ControlPoint[] {
  const points: ControlPoint[] = []
  const direction = yEnd > yStart ? 1 : -1

  for (let i = 0; i < fingerCount; i++) {
    const isTab = startWithTab ? i % 2 === 0 : i % 2 !== 0
    const yA = yStart + direction * i * fingerWidth
    const yB = yStart + direction * (i + 1) * fingerWidth

    if (isTab) {
      points.push({ x: xBase + tabDir * depth, y: yA })
      points.push({ x: xBase + tabDir * depth, y: yB })
    } else {
      points.push({ x: xBase, y: yA })
      points.push({ x: xBase, y: yB })
    }
  }

  return points
}

/**
 * Builds the complete outline points for an upright board with finger joints
 * applied at the specified edges.
 *
 * @param length          — Board length (local X extent)
 * @param height          — Board height (local Y extent)
 * @param leftEdge        — Finger joint parameters for the left edge (or null)
 * @param rightEdge       — Finger joint parameters for the right edge (or null)
 */
interface EdgeOptions {
  depth: number
  fingerCount: number
  fingerWidth: number
  startWithTab: boolean
}

function buildOutlineWithFingerJoints(
  length: number,
  height: number,
  leftEdge: EdgeOptions | null,
  rightEdge: EdgeOptions | null,
): Path2DShape {
  const points: ControlPoint[] = []

  // Bottom edge: left → right (y = 0)
  points.push({ x: 0, y: 0 })
  points.push({ x: length, y: 0 })

  // Right edge: bottom → top (y = 0 → height)
  if (rightEdge) {
    const edgePoints = buildFingerEdgePoints(
      length, 0, height, rightEdge.depth, 1,
      rightEdge.fingerWidth, rightEdge.fingerCount, rightEdge.startWithTab,
    )
    // The first point duplicates (length, 0) — skip it; last point leads to (length, height)
    points.push(...edgePoints.slice(1))
  } else {
    points.push({ x: length, y: height })
  }

  // Top edge: right → left (y = height)
  points.push({ x: 0, y: height })

  // Left edge: top → bottom (y = height → 0)
  if (leftEdge) {
    const edgePoints = buildFingerEdgePoints(
      0, height, 0, leftEdge.depth, -1,
      leftEdge.fingerWidth, leftEdge.fingerCount, leftEdge.startWithTab,
    )
    // The first point duplicates (0, height) — skip it; last point leads to (0, 0)
    points.push(...edgePoints.slice(1))
  }
  // closing back to (0, 0) is implicit in the shape

  return createLineShape(points)
}

/**
 * Returns the board's outline with all finger joint modifications applied
 * for its active connections. The stored `Board.outline` is never mutated.
 *
 * Only upright boards with left/right anchor connections are supported.
 * Flat boards and top/bottom anchor connections return the original outline.
 */
export function getBoardOutlineWithJoints(
  board: Board,
  groups: BoardGroup[],
  allBoards: Board[],
): Path2DShape {
  const length = getUprightBoardLength(board)
  const height = getUprightBoardHeight(board)

  if (!length || !height) {
    return board.outline
  }

  // Collect all connections involving this board from all groups
  const relevantConnections: { connection: BoardConnection; isA: boolean }[] = []

  for (const group of groups) {
    if (!group.boardIds.includes(board.id)) {
      continue
    }

    for (const connection of group.connections) {
      if (connection.a.boardId === board.id || connection.b.boardId === board.id) {
        relevantConnections.push({
          connection,
          isA: connection.a.boardId === board.id,
        })
      }
    }
  }

  if (relevantConnections.length === 0) {
    return board.outline
  }

  let leftEdge: EdgeOptions | null = null
  let rightEdge: EdgeOptions | null = null

  for (const { connection, isA } of relevantConnections) {
    const myAnchor = isA ? connection.a.anchor : connection.b.anchor
    const otherBoardId = isA ? connection.b.boardId : connection.a.boardId
    const otherBoard = allBoards.find(b => b.id === otherBoardId)

    if (!otherBoard || (myAnchor !== 'left' && myAnchor !== 'right')) {
      continue
    }

    const boardA = isA ? board : otherBoard
    const boardB = isA ? otherBoard : board
    const angle = classifyConnectionAngle(boardA, boardB, connection)

    if (angle === 'unsupported') {
      continue
    }

    const otherHeight = getUprightBoardHeight(otherBoard)
    const otherLength = getUprightBoardLength(otherBoard)
    if (!otherHeight || !otherLength) {
      continue
    }

    const depth = angle === 'L-joint'
      ? otherBoard.thickness
      : Math.min(board.thickness, length * 0.25)

    const { fingerCount, fingerWidth } = computeFingerPattern(height, board.thickness)
    // The 'a' endpoint board always starts with a tab
    const startWithTab = isA

    const edgeOptions: EdgeOptions = { depth, fingerCount, fingerWidth, startWithTab }

    if (myAnchor === 'left') {
      leftEdge = edgeOptions
    } else {
      rightEdge = edgeOptions
    }
  }

  if (!leftEdge && !rightEdge) {
    return board.outline
  }

  return buildOutlineWithFingerJoints(length, height, leftEdge, rightEdge)
}
