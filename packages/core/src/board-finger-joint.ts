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

  if (anchor === 'top' || anchor === 'bottom') {
    if (board.transform.orientation !== 'hinged') {
      return null
    }

    const normal = { x: -baseline.direction.y, y: baseline.direction.x }
    const flipFactor = board.transform.flipPitch ? -1 : 1
    const topDirection = {
      x: normal.x * flipFactor,
      y: normal.y * flipFactor,
    }

    if (anchor === 'top') {
      return topDirection
    }

    return {
      x: -topDirection.x,
      y: -topDirection.y,
    }
  }

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

  // cross > 0.342 means angle is greater than 20 degrees
  if (cross > 0.342) {
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
  horizontal = false,
  subtractive = false,
): ControlPoint[] {
  const points: ControlPoint[] = []
  const direction = yEnd > yStart ? 1 : -1

  // If subtractive, we pull the tabs INSIDE the board instead of pushing them OUT
  const effectiveTabDir = subtractive ? -tabDir : tabDir

  for (let i = 0; i < fingerCount; i++) {
    const isTab = startWithTab ? i % 2 === 0 : i % 2 !== 0
    const offset = yStart + direction * i * fingerWidth
    const nextOffset = yStart + direction * (i + 1) * fingerWidth

    if (horizontal) {
      if (isTab) {
        // Tab depth extends along Y axis
        points.push({ x: offset, y: xBase + effectiveTabDir * depth })
        points.push({ x: nextOffset, y: xBase + effectiveTabDir * depth })
      } else {
        // Socket stays on baseline
        points.push({ x: offset, y: xBase })
        points.push({ x: nextOffset, y: xBase })
      }
    }
    else {
      if (isTab) {
        // Tab depth extends along X axis
        points.push({ x: xBase + effectiveTabDir * depth, y: offset })
        points.push({ x: xBase + effectiveTabDir * depth, y: nextOffset })
      } else {
        // Socket stays on baseline
        points.push({ x: xBase, y: offset })
        points.push({ x: xBase, y: nextOffset })
      }
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
  subtractive?: boolean
  segmentEnd?: number
  segmentStart?: number
}

function buildOutlineWithFingerJoints(
  length: number,
  height: number,
  leftEdge: EdgeOptions | null,
  rightEdge: EdgeOptions | null,
  topEdge: EdgeOptions | null,
  bottomEdge: EdgeOptions | null,
): Path2DShape {
  const points: ControlPoint[] = []

  // Bottom edge: left → right (y = 0)
  if (bottomEdge) {
    const edgePoints = buildFingerEdgePoints(
      0, 0, length, bottomEdge.depth, -1,
      bottomEdge.fingerWidth, bottomEdge.fingerCount, bottomEdge.startWithTab,
      true, // horizontal
      bottomEdge.subtractive,
    )
    points.push(...edgePoints)
  }
  else {
    points.push({ x: 0, y: 0 })
    points.push({ x: length, y: 0 })
  }

  // Right edge: bottom → top (y = 0 → height)
  if (rightEdge) {
    const edgePoints = buildFingerEdgePoints(
      length, 0, height, rightEdge.depth, 1,
      rightEdge.fingerWidth, rightEdge.fingerCount, rightEdge.startWithTab,
      false,
      rightEdge.subtractive,
    )
    // skip duplicate first point
    points.push(...edgePoints.slice(1))
  }
  else {
    points.push({ x: length, y: height })
  }

  // Top edge: right → left (x = length → 0 at y = height)
  if (topEdge) {
    const segmentEnd = topEdge.segmentEnd ?? length
    const segmentStart = topEdge.segmentStart ?? 0

    if (segmentEnd !== length) {
      points.push({ x: segmentEnd, y: height })
    }

    const edgePoints = buildFingerEdgePoints(
      segmentEnd, height, segmentStart, topEdge.depth, 1,
      topEdge.fingerWidth, topEdge.fingerCount, topEdge.startWithTab,
      true, // horizontal
      topEdge.subtractive,
    )
    // skip duplicate first point
    points.push(...edgePoints.slice(1))

    if (segmentStart !== 0) {
      points.push({ x: 0, y: height })
    }
  }
  else {
    points.push({ x: 0, y: height })
  }

  // Left edge: top → bottom (y = height → 0)
  if (leftEdge) {
    const edgePoints = buildFingerEdgePoints(
      0, height, 0, leftEdge.depth, -1,
      leftEdge.fingerWidth, leftEdge.fingerCount, leftEdge.startWithTab,
      false,
      leftEdge.subtractive,
    )
    // skip duplicate first point
    points.push(...edgePoints.slice(1))
  }
  // closing point implicit

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
  let topEdge: EdgeOptions | null = null
  let bottomEdge: EdgeOptions | null = null

  for (const { connection, isA } of relevantConnections) {
    const myAnchor = isA ? connection.a.anchor : connection.b.anchor
    const otherBoardId = isA ? connection.b.boardId : connection.a.boardId
    const otherBoard = allBoards.find(b => b.id === otherBoardId)

    if (!otherBoard) {
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

    // Depth should be the thickness of the other board, but strictly orthogonal.
    // Our buildFingerEdgePoints already handles orthogonality via xBase/yBase.
    const depth = otherBoard.thickness

    const dimension = (myAnchor === 'left' || myAnchor === 'right') ? height : length
    const { fingerCount, fingerWidth } = computeFingerPattern(dimension, board.thickness)
    const otherAnchor = isA ? connection.b.anchor : connection.a.anchor
    const isHingedRidgeConnection =
      myAnchor === 'top'
      && otherAnchor === 'top'
      && board.transform.orientation === 'hinged'
      && otherBoard.transform.orientation === 'hinged'

    // Wall/roof eave connections should not change wall height, but roof ridge
    // connections should still produce visible interlocking tabs.
    const startWithTab = (myAnchor === 'top' || myAnchor === 'bottom')
      ? (isHingedRidgeConnection ? isA : false)
      : isA

    const edgeOptions: EdgeOptions = {
      depth,
      fingerCount,
      fingerWidth,
      startWithTab,
      subtractive: (myAnchor === 'top' || myAnchor === 'bottom') && !isHingedRidgeConnection,
    }

    if (isHingedRidgeConnection) {
      const inset = Math.max(depth * 2, fingerWidth * 2)
      const segmentStart = inset
      const segmentEnd = Math.max(inset, length - inset)
      const segmentLength = Math.max(fingerWidth, segmentEnd - segmentStart)
      const ridgePattern = computeFingerPattern(segmentLength, board.thickness)

      edgeOptions.segmentStart = segmentStart
      edgeOptions.segmentEnd = segmentEnd
      edgeOptions.fingerCount = ridgePattern.fingerCount
      edgeOptions.fingerWidth = ridgePattern.fingerWidth
    }

    if (myAnchor === 'left') leftEdge = edgeOptions
    if (myAnchor === 'right') rightEdge = edgeOptions
    if (myAnchor === 'top') topEdge = edgeOptions
    if (myAnchor === 'bottom') bottomEdge = edgeOptions
  }

  if (!leftEdge && !rightEdge && !topEdge && !bottomEdge) {
    return board.outline
  }

  return buildOutlineWithFingerJoints(length, height, leftEdge, rightEdge, topEdge, bottomEdge)
}
