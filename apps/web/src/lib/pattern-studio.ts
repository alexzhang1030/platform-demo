import type {
  Board,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'
import {
  createCircleShape,
  createRectangleShape,
  createRoundedRectangleShape,
} from '@xtool-demo/protocol'

import { getRandomId } from '@/lib/utils'

export type RouteKey = 'editor' | 'generator'
export type ShapePreset = 'rectangle' | 'rounded-rectangle' | 'circle'

export interface EditorSelectionState {
  activeBoardId: string
  selectedBoardIds: string[]
}

export interface BoardMoveDelta {
  x: number
  y: number
}

export interface BoardRectangle {
  maxX: number
  maxY: number
  minX: number
  minY: number
}

export interface BoardSpan {
  end: ControlPoint
  start: ControlPoint
}

export interface PresetOption {
  id: ShapePreset
  label: string
  description: string
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    id: 'rounded-rectangle',
    label: 'Rounded panel',
    description: 'Soft outer corners for main display panels.',
  },
  {
    id: 'rectangle',
    label: 'Straight brace',
    description: 'Fast to cut and easy to pair with other boards.',
  },
  {
    id: 'circle',
    label: 'Circular cap',
    description: 'Useful for lids, dials, and accent plates.',
  },
]

export const BOARD_SWATCHES = [
  'oklch(0.67 0.11 57)',
  'oklch(0.72 0.09 108)',
  'oklch(0.67 0.12 229)',
  'oklch(0.74 0.11 18)',
]

export const BOARD_THREE_SWATCHES = [
  '#b97745',
  '#97a85f',
  '#4d7fc5',
  '#cb7b5d',
]

export function getRouteFromPath(pathname: string): RouteKey {
  if (pathname === '/generator') {
    return 'generator'
  }

  return 'editor'
}

export function createEditorSelection(activeBoardId: string): EditorSelectionState {
  return {
    activeBoardId,
    selectedBoardIds: activeBoardId ? [activeBoardId] : [],
  }
}

export function normalizeEditorSelection(
  document: PatternDocument,
  selection: EditorSelectionState,
): EditorSelectionState {
  const boardIds = new Set(document.boards.map(board => board.id))
  const nextSelectedBoardIds = selection.selectedBoardIds.filter(boardId =>
    boardIds.has(boardId),
  )

  const nextActiveBoardId
    = boardIds.has(selection.activeBoardId)
      ? selection.activeBoardId
      : nextSelectedBoardIds[0] ?? document.boards[0]?.id ?? ''

  if (nextSelectedBoardIds.length === 0 && nextActiveBoardId) {
    return createEditorSelection(nextActiveBoardId)
  }

  if (nextSelectedBoardIds.includes(nextActiveBoardId)) {
    return {
      activeBoardId: nextActiveBoardId,
      selectedBoardIds: nextSelectedBoardIds,
    }
  }

  return {
    activeBoardId: nextActiveBoardId,
    selectedBoardIds: nextActiveBoardIdsWithActive(nextSelectedBoardIds, nextActiveBoardId),
  }
}

function nextActiveBoardIdsWithActive(
  selectedBoardIds: string[],
  activeBoardId: string,
) {
  if (!activeBoardId) {
    return selectedBoardIds
  }

  return [...selectedBoardIds, activeBoardId]
}

export function selectSingleBoard(boardId: string): EditorSelectionState {
  return createEditorSelection(boardId)
}

export function toggleBoardSelection(
  selection: EditorSelectionState,
  boardId: string,
): EditorSelectionState {
  if (!selection.selectedBoardIds.includes(boardId)) {
    return {
      activeBoardId: boardId,
      selectedBoardIds: [...selection.selectedBoardIds, boardId],
    }
  }

  const nextSelectedBoardIds = selection.selectedBoardIds.filter(
    selectedBoardId => selectedBoardId !== boardId,
  )
  const nextActiveBoardId
    = selection.activeBoardId === boardId
      ? nextSelectedBoardIds.at(-1) ?? ''
      : selection.activeBoardId

  return {
    activeBoardId: nextActiveBoardId,
    selectedBoardIds: nextSelectedBoardIds,
  }
}

export function moveBoardsByDelta(
  document: PatternDocument,
  boardIds: string[],
  delta: BoardMoveDelta,
): PatternDocument {
  if (boardIds.length === 0) {
    return document
  }

  const boardIdSet = new Set(boardIds)

  return {
    ...document,
    boards: document.boards.map((board) => {
      if (!boardIdSet.has(board.id)) {
        return board
      }

      return {
        ...board,
        transform: {
          ...board.transform,
          x: board.transform.x + delta.x,
          y: board.transform.y + delta.y,
        },
      }
    }),
  }
}

export function navigateTo(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function updateDocumentTimestamp(document: PatternDocument): PatternDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function createBoardFromPreset(preset: ShapePreset, index: number): Board {
  const colorBand = index % BOARD_SWATCHES.length
  const xOffset = colorBand * 36 + index * 28
  const yOffset = colorBand * 18 + index * 16

  if (preset === 'rectangle') {
    return {
      id: getRandomId('board'),
      name: 'Brace panel',
      thickness: 12,
      material: 'birch-ply',
      transform: { x: xOffset, y: yOffset, rotation: 0 },
      outline: createRectangleShape(180, 60),
      holes: [],
    }
  }

  if (preset === 'circle') {
    return {
      id: getRandomId('board'),
      name: 'Circular cap',
      thickness: 9,
      material: 'birch-ply',
      transform: { x: xOffset, y: yOffset, rotation: 0 },
      outline: createCircleShape(52),
      holes: [],
    }
  }

  return {
    id: getRandomId('board'),
    name: 'Rounded panel',
    thickness: 18,
    material: 'birch-ply',
    transform: { x: xOffset, y: yOffset, rotation: 0 },
    outline: createRoundedRectangleShape(220, 140, 18),
    holes: [],
  }
}

export function createBoardFromRectangle(rectangle: BoardRectangle): Board {
  const width = Math.max(1, rectangle.maxX - rectangle.minX)
  const height = Math.max(1, rectangle.maxY - rectangle.minY)

  return {
    id: getRandomId('board'),
    name: 'Custom board',
    thickness: 18,
    material: 'birch-ply',
    transform: {
      x: rectangle.minX,
      y: rectangle.minY,
      rotation: 0,
    },
    outline: createRectangleShape(width, height),
    holes: [],
  }
}

export function createBoardFromSpan(span: BoardSpan, depth = 120): Board {
  const deltaX = span.end.x - span.start.x
  const deltaY = span.end.y - span.start.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < 1) {
    return createBoardFromRectangle({
      minX: span.start.x,
      minY: span.start.y,
      maxX: span.start.x + 1,
      maxY: span.start.y + 1,
    })
  }

  const directionX = deltaX / length
  const directionY = deltaY / length
  const perpendicularX = -directionY
  const perpendicularY = directionX
  const cornerX = span.start.x - perpendicularX * (depth / 2)
  const cornerY = span.start.y - perpendicularY * (depth / 2)

  return {
    id: getRandomId('board'),
    name: 'Custom board',
    thickness: 18,
    material: 'birch-ply',
    transform: {
      x: cornerX,
      y: cornerY,
      rotation: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    },
    outline: createRectangleShape(length, depth),
    holes: [],
  }
}

export function mapBoardColor(index: number) {
  return BOARD_SWATCHES[index % BOARD_SWATCHES.length] ?? BOARD_SWATCHES[0]
}

export function mapBoardThreeColor(index: number) {
  return BOARD_THREE_SWATCHES[index % BOARD_THREE_SWATCHES.length] ?? BOARD_THREE_SWATCHES[0]
}

export function replacePointAt(
  points: ControlPoint[],
  index: number,
  nextPoint: ControlPoint,
) {
  return points.map((point, currentIndex) =>
    currentIndex === index ? nextPoint : point,
  )
}

export function updateBoardOutlinePoints(board: Board, points: ControlPoint[]): Board {
  const nextSegments = points.map((point) => {
    const segment: Board['outline']['segments'][number] = {
      kind: 'line',
      points: [{ x: point.x, y: point.y }],
    }

    return segment
  })

  return {
    ...board,
    outline: {
      closed: true,
      segments: nextSegments,
    },
  }
}
