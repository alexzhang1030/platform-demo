import type {
  Board,
  BoardAnchorSide,
  BoardConnection,
  BoardGroup,
  ControlPoint,
} from '@xtool-demo/protocol'

import { getBoundsFromPoints, transformBoardPoints } from './geometry'
import {
  getUprightBoardBaseline,
  getUprightBoardHeight,
} from './upright-board'

export interface AnchorPoint3D {
  x: number
  y: number
  z: number
}

export interface BoardAnchorMoveSnap {
  movingAnchor: BoardAnchorSide
  targetBoardId: string
  targetAnchor: BoardAnchorSide
  /** 2D delta (document coords) to move the board so anchors align */
  offset: ControlPoint
  /** 2D point (document coords) for snap indicator visualization */
  snapPoint: ControlPoint
}

/**
 * Anchor positions in document 2D (for snap detection / connectivity).
 * For upright boards the outline height is vertical (Z) not a Y extent on the
 * ground plane, so we derive positions from the baseline endpoints/midpoint.
 * For flat boards we fall back to the bounding box of the transformed outline.
 */
export function getBoardAnchorPositions(board: Board): Record<BoardAnchorSide, ControlPoint> {
  const baseline = getUprightBoardBaseline(board)

  if (baseline) {
    const midX = (baseline.start.x + baseline.end.x) / 2
    const midY = (baseline.start.y + baseline.end.y) / 2

    return {
      left: { x: baseline.start.x, y: baseline.start.y },
      right: { x: baseline.end.x, y: baseline.end.y },
      top: { x: midX, y: midY },
      bottom: { x: midX, y: midY },
    }
  }

  const points = transformBoardPoints(board)
  const bounds = getBoundsFromPoints(points)
  const midX = (bounds.minX + bounds.maxX) / 2
  const midY = (bounds.minY + bounds.maxY) / 2

  return {
    top: { x: midX, y: bounds.minY },
    bottom: { x: midX, y: bounds.maxY },
    left: { x: bounds.minX, y: midY },
    right: { x: bounds.maxX, y: midY },
  }
}

/**
 * Anchor positions in ThreeJS world space (Y flipped, Z = height).
 * Used by the 3D viewport to place anchor indicator meshes.
 */
export function getBoardAnchorPositions3D(board: Board): Record<BoardAnchorSide, AnchorPoint3D> {
  const baseline = getUprightBoardBaseline(board)
  const boardHeight = getUprightBoardHeight(board)

  if (baseline && boardHeight) {
    const midX = (baseline.start.x + baseline.end.x) / 2
    const midY = (baseline.start.y + baseline.end.y) / 2

    return {
      left: { x: baseline.start.x, y: -baseline.start.y, z: boardHeight / 2 },
      right: { x: baseline.end.x, y: -baseline.end.y, z: boardHeight / 2 },
      top: { x: midX, y: -midY, z: boardHeight },
      bottom: { x: midX, y: -midY, z: 0 },
    }
  }

  const points = transformBoardPoints(board)
  const bounds = getBoundsFromPoints(points)
  const midX = (bounds.minX + bounds.maxX) / 2
  const midY = (bounds.minY + bounds.maxY) / 2
  const z = board.thickness / 2

  return {
    top: { x: midX, y: -bounds.minY, z },
    bottom: { x: midX, y: -bounds.maxY, z },
    left: { x: bounds.minX, y: -midY, z },
    right: { x: bounds.maxX, y: -midY, z },
  }
}

function distanceBetween(a: ControlPoint, b: ControlPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const ANCHOR_SIDES: BoardAnchorSide[] = ['top', 'left', 'right', 'bottom']

export function findAnchorConnections(boards: Board[], threshold: number): BoardConnection[] {
  const connections: BoardConnection[] = []

  for (let i = 0; i < boards.length; i += 1) {
    const boardA = boards[i]
    if (!boardA) {
      continue
    }
    const anchorsA = getBoardAnchorPositions(boardA)

    for (let j = i + 1; j < boards.length; j += 1) {
      const boardB = boards[j]
      if (!boardB) {
        continue
      }
      const anchorsB = getBoardAnchorPositions(boardB)

      let bestDistance = threshold
      let bestConnection: BoardConnection | null = null

      for (const sideA of ANCHOR_SIDES) {
        for (const sideB of ANCHOR_SIDES) {
          const dist = distanceBetween(anchorsA[sideA], anchorsB[sideB])
          if (dist < bestDistance) {
            bestDistance = dist
            bestConnection = {
              a: { boardId: boardA.id, anchor: sideA },
              b: { boardId: boardB.id, anchor: sideB },
            }
          }
        }
      }

      if (bestConnection) {
        connections.push(bestConnection)
      }
    }
  }

  return connections
}

/**
 * Finds the closest anchor-to-anchor snap between the moving board and any
 * other board. Returns the snap data needed to position the board and create a
 * BoardConnection on drop.
 */
export function findBoardAnchorMoveSnap(
  movingBoard: Board,
  boards: Board[],
  threshold: number,
): BoardAnchorMoveSnap | null {
  const movingAnchors = getBoardAnchorPositions(movingBoard)
  const otherBoards = boards.filter(b => b.id !== movingBoard.id)

  let bestDist = threshold
  let best: BoardAnchorMoveSnap | null = null

  for (const targetBoard of otherBoards) {
    const targetAnchors = getBoardAnchorPositions(targetBoard)

    for (const movingSide of ANCHOR_SIDES) {
      for (const targetSide of ANCHOR_SIDES) {
        const movingPos = movingAnchors[movingSide]
        const targetPos = targetAnchors[targetSide]
        const dist = distanceBetween(movingPos, targetPos)

        if (dist < bestDist) {
          bestDist = dist
          best = {
            movingAnchor: movingSide,
            targetBoardId: targetBoard.id,
            targetAnchor: targetSide,
            offset: {
              x: targetPos.x - movingPos.x,
              y: targetPos.y - movingPos.y,
            },
            snapPoint: targetPos,
          }
        }
      }
    }
  }

  return best
}

function getBoardIdsConnectedTo(boardId: string, connections: BoardConnection[]): string[] {
  const neighbors: string[] = []

  for (const connection of connections) {
    if (connection.a.boardId === boardId) {
      neighbors.push(connection.b.boardId)
    }
    else if (connection.b.boardId === boardId) {
      neighbors.push(connection.a.boardId)
    }
  }

  return neighbors
}

function collectConnectedBoardComponents(boardIds: string[], connections: BoardConnection[]): string[][] {
  const remaining = new Set(boardIds)
  const components: string[][] = []

  while (remaining.size > 0) {
    const start = remaining.values().next().value
    if (!start) {
      break
    }

    const stack = [start]
    const component: string[] = []
    remaining.delete(start)

    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) {
        continue
      }

      component.push(current)

      for (const neighbor of getBoardIdsConnectedTo(current, connections)) {
        if (remaining.has(neighbor)) {
          remaining.delete(neighbor)
          stack.push(neighbor)
        }
      }
    }

    components.push(component)
  }

  return components
}

export function mergeBoardsThroughConnection(
  groups: BoardGroup[],
  connection: BoardConnection,
  newBoardId?: string,
): BoardGroup[] {
  const boardIdA = connection.a.boardId
  const boardIdB = connection.b.boardId

  const groupOfA = groups.find(group => group.boardIds.includes(boardIdA))
  const groupOfB = groups.find(group => group.boardIds.includes(boardIdB))

  const involvedGroups = [groupOfA, groupOfB].filter((group): group is BoardGroup => group !== undefined)
  const uniqueInvolvedIds = new Set(involvedGroups.map(group => group.id))

  const existingBoardIds = new Set(involvedGroups.flatMap(group => group.boardIds))
  const existingConnections = involvedGroups.flatMap(group => group.connections)

  const allBoardIds = [...existingBoardIds]
  if (newBoardId && !existingBoardIds.has(newBoardId)) {
    allBoardIds.push(newBoardId)
  }
  if (!existingBoardIds.has(boardIdA)) {
    allBoardIds.push(boardIdA)
  }
  if (!existingBoardIds.has(boardIdB)) {
    allBoardIds.push(boardIdB)
  }

  const baseGroup = involvedGroups[0]
  const mergedGroupId = baseGroup?.id ?? `group-${boardIdA}-${boardIdB}`
  const mergedGroupName = baseGroup?.name ?? 'Board Group'

  const mergedGroup: BoardGroup = {
    id: mergedGroupId,
    name: mergedGroupName,
    boardIds: [...new Set(allBoardIds)],
    connections: [...existingConnections, connection],
  }

  const unchangedGroups = groups.filter(group => !uniqueInvolvedIds.has(group.id))

  return [...unchangedGroups, mergedGroup]
}

export function splitBoardGroupAfterRemoval(
  groups: BoardGroup[],
  removedBoardId: string,
): BoardGroup[] {
  const result: BoardGroup[] = []

  for (const group of groups) {
    if (!group.boardIds.includes(removedBoardId)) {
      result.push(group)
      continue
    }

    const remainingBoardIds = group.boardIds.filter(id => id !== removedBoardId)
    const remainingConnections = group.connections.filter(
      connection =>
        connection.a.boardId !== removedBoardId
        && connection.b.boardId !== removedBoardId,
    )

    if (remainingBoardIds.length <= 1) {
      continue
    }

    const components = collectConnectedBoardComponents(remainingBoardIds, remainingConnections)

    for (let index = 0; index < components.length; index += 1) {
      const componentIds = components[index]
      if (!componentIds || componentIds.length <= 1) {
        continue
      }

      const componentIdSet = new Set(componentIds)
      const componentConnections = remainingConnections.filter(
        connection =>
          componentIdSet.has(connection.a.boardId)
          && componentIdSet.has(connection.b.boardId),
      )

      const splitGroup: BoardGroup = {
        id: index === 0 ? group.id : `${group.id}-split-${index + 1}`,
        name: group.name,
        boardIds: componentIds,
        connections: componentConnections,
      }

      result.push(splitGroup)
    }
  }

  return result
}
