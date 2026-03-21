import type {
  Board,
  ControlPoint,
  Path2DShape,
} from '@xtool-demo/protocol'
import { createLineShape } from '@xtool-demo/protocol'

import {
  getBoundsFromPoints,
  rotatePoint,
  sampleShapePoints,
  transformBoardPoints,
} from './geometry'

export interface BoardSpan {
  end: ControlPoint
  start: ControlPoint
}

export interface UprightBoardJointOptions {
  anchor: 'end' | 'start'
  boardHeight: number
}

export interface UprightBoardSnap {
  boardId: string
  distance: number
  localX: number
  point: ControlPoint
}

export interface UprightBoardMoveSnap extends UprightBoardSnap {
  anchor: 'end' | 'start'
  offset: ControlPoint
}

export interface UprightBoardBaseline {
  direction: ControlPoint
  end: ControlPoint
  length: number
  start: ControlPoint
}

const DEFAULT_MINIMUM_LENGTH = 40
const DEFAULT_SNAP_DISTANCE = 24
const DOVETAIL_MARGIN = 24
const DOVETAIL_MIN_DEPTH = 14
const DOVETAIL_MAX_DEPTH = 28

function getDovetailDimensions(boardHeight: number) {
  const tailHeight = Math.max(40, Math.min(boardHeight * 0.24, 78))
  const neckHeight = tailHeight * 0.58
  const depth = Math.max(
    DOVETAIL_MIN_DEPTH,
    Math.min(boardHeight * 0.11, DOVETAIL_MAX_DEPTH),
  )

  return {
    depth,
    neckHeight,
    tailHeight,
  }
}

function clampJointCenterX(length: number, localX: number, boardHeight: number) {
  const { tailHeight } = getDovetailDimensions(boardHeight)
  const halfTail = tailHeight / 2
  return Math.max(
    DOVETAIL_MARGIN + halfTail,
    Math.min(length - DOVETAIL_MARGIN - halfTail, localX),
  )
}

export function normalizeUprightBoardSpan(
  span: BoardSpan,
  minimumLength = DEFAULT_MINIMUM_LENGTH,
): BoardSpan {
  const deltaX = span.end.x - span.start.x
  const deltaY = span.end.y - span.start.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < 0.001) {
    return {
      start: span.start,
      end: {
        x: span.start.x + minimumLength,
        y: span.start.y,
      },
    }
  }

  if (length >= minimumLength) {
    return span
  }

  const scale = minimumLength / length
  return {
    start: span.start,
    end: {
      x: span.start.x + deltaX * scale,
      y: span.start.y + deltaY * scale,
    },
  }
}

export function createUprightBoardOutline(
  length: number,
  boardHeight: number,
  joint: UprightBoardJointOptions | null = null,
): Path2DShape {
  if (!joint) {
    return createLineShape([
      { x: 0, y: 0 },
      { x: length, y: 0 },
      { x: length, y: boardHeight },
      { x: 0, y: boardHeight },
    ])
  }

  const { depth, neckHeight, tailHeight } = getDovetailDimensions(boardHeight)
  const centerY = boardHeight / 2
  const halfNeck = neckHeight / 2
  const halfTail = tailHeight / 2

  if (joint.anchor === 'start') {
    return createLineShape([
      { x: 0, y: 0 },
      { x: length, y: 0 },
      { x: length, y: boardHeight },
      { x: 0, y: boardHeight },
      { x: 0, y: centerY + halfNeck },
      { x: -depth, y: centerY + halfTail },
      { x: -depth, y: centerY - halfTail },
      { x: 0, y: centerY - halfNeck },
    ])
  }

  return createLineShape([
    { x: 0, y: 0 },
    { x: length, y: 0 },
    { x: length, y: centerY - halfNeck },
    { x: length + depth, y: centerY - halfTail },
    { x: length + depth, y: centerY + halfTail },
    { x: length, y: centerY + halfNeck },
    { x: length, y: boardHeight },
    { x: 0, y: boardHeight },
  ])
}

export function createDovetailSocket(
  length: number,
  boardHeight: number,
  localX: number,
): Path2DShape {
  const { depth, neckHeight, tailHeight } = getDovetailDimensions(boardHeight)
  const centerX = clampJointCenterX(length, localX, boardHeight)
  const centerY = boardHeight / 2
  const halfNeck = neckHeight / 2
  const halfTail = tailHeight / 2

  return createLineShape([
    { x: centerX - halfTail, y: centerY - depth },
    { x: centerX - halfNeck, y: centerY },
    { x: centerX - halfTail, y: centerY + depth },
    { x: centerX + halfTail, y: centerY + depth },
    { x: centerX + halfNeck, y: centerY },
    { x: centerX + halfTail, y: centerY - depth },
  ])
}

export function getUprightBoardLength(board: Board) {
  if (board.transform.orientation !== 'upright' && board.transform.orientation !== 'hinged') {
    return null
  }

  const bounds = getBoundsFromPoints(sampleShapePoints(board.outline))
  return Math.max(1, bounds.width)
}

export function getUprightBoardHeight(board: Board) {
  if (board.transform.orientation !== 'upright' && board.transform.orientation !== 'hinged') {
    return null
  }

  const bounds = getBoundsFromPoints(sampleShapePoints(board.outline))
  return Math.max(1, bounds.height)
}

export function getUprightBoardBaseline(board: Board): UprightBoardBaseline | null {
  const length = getUprightBoardLength(board)
  if (!length) {
    return null
  }

  const rotation = board.transform.rotation
  const direction = rotatePoint({ x: 1, y: 0 }, rotation)
  const start = {
    x: board.transform.x,
    y: board.transform.y,
  }
  const end = {
    x: start.x + direction.x * length,
    y: start.y + direction.y * length,
  }

  return {
    direction,
    end,
    length,
    start,
  }
}

export function getBoardGroundFootprint(board: Board): ControlPoint[] {
  if (board.transform.orientation !== 'upright') {
    return transformBoardPoints(board)
  }

  const baseline = getUprightBoardBaseline(board)
  if (!baseline) {
    return transformBoardPoints(board)
  }

  const perpendicular = {
    x: -baseline.direction.y,
    y: baseline.direction.x,
  }
  const halfThickness = board.thickness / 2

  return [
    {
      x: baseline.start.x + perpendicular.x * halfThickness,
      y: baseline.start.y + perpendicular.y * halfThickness,
    },
    {
      x: baseline.end.x + perpendicular.x * halfThickness,
      y: baseline.end.y + perpendicular.y * halfThickness,
    },
    {
      x: baseline.end.x - perpendicular.x * halfThickness,
      y: baseline.end.y - perpendicular.y * halfThickness,
    },
    {
      x: baseline.start.x - perpendicular.x * halfThickness,
      y: baseline.start.y - perpendicular.y * halfThickness,
    },
  ]
}

export function findClosestUprightBoardSnap(
  boards: Board[],
  point: ControlPoint,
  maxDistance = DEFAULT_SNAP_DISTANCE,
): UprightBoardSnap | null {
  let bestSnap: UprightBoardSnap | null = null

  for (const board of boards) {
    const baseline = getUprightBoardBaseline(board)
    const boardHeight = getUprightBoardHeight(board)
    if (!baseline || !boardHeight) {
      continue
    }

    const deltaX = point.x - baseline.start.x
    const deltaY = point.y - baseline.start.y
    const projection = deltaX * baseline.direction.x + deltaY * baseline.direction.y
    const clampedProjection = Math.max(0, Math.min(baseline.length, projection))
    const snapX = baseline.start.x + baseline.direction.x * clampedProjection
    const snapY = baseline.start.y + baseline.direction.y * clampedProjection
    const distance = Math.hypot(point.x - snapX, point.y - snapY)
    const { tailHeight } = getDovetailDimensions(boardHeight)
    const minOffset = DOVETAIL_MARGIN + tailHeight / 2
    const maxOffset = baseline.length - DOVETAIL_MARGIN - tailHeight / 2

    if (
      distance > maxDistance
      || clampedProjection < minOffset
      || clampedProjection > maxOffset
    ) {
      continue
    }

    if (!bestSnap || distance < bestSnap.distance) {
      bestSnap = {
        boardId: board.id,
        distance,
        localX: clampedProjection,
        point: {
          x: snapX,
          y: snapY,
        },
      }
    }
  }

  return bestSnap
}

export function findClosestUprightBoardMoveSnap(
  board: Board,
  boards: Board[],
  maxDistance = DEFAULT_SNAP_DISTANCE,
): UprightBoardMoveSnap | null {
  const baseline = getUprightBoardBaseline(board)
  if (!baseline) {
    return null
  }

  const otherBoards = boards.filter(candidate => candidate.id !== board.id)
  const startSnap = findClosestUprightBoardSnap(otherBoards, baseline.start, maxDistance)
  const endSnap = findClosestUprightBoardSnap(otherBoards, baseline.end, maxDistance)

  let bestSnap: UprightBoardMoveSnap | null = null

  if (startSnap) {
    bestSnap = {
      ...startSnap,
      anchor: 'start',
      offset: {
        x: startSnap.point.x - baseline.start.x,
        y: startSnap.point.y - baseline.start.y,
      },
    }
  }

  if (endSnap && (!bestSnap || endSnap.distance < bestSnap.distance)) {
    bestSnap = {
      ...endSnap,
      anchor: 'end',
      offset: {
        x: endSnap.point.x - baseline.end.x,
        y: endSnap.point.y - baseline.end.y,
      },
    }
  }

  return bestSnap
}
