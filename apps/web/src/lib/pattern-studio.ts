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

export type RouteKey = 'home' | 'editor' | 'generator'
export type ShapePreset = 'rectangle' | 'rounded-rectangle' | 'circle'

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

export function getRouteFromPath(pathname: string): RouteKey {
  if (pathname === '/editor') {
    return 'editor'
  }

  if (pathname === '/generator') {
    return 'generator'
  }

  return 'home'
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

export function mapBoardColor(index: number) {
  return BOARD_SWATCHES[index % BOARD_SWATCHES.length] ?? BOARD_SWATCHES[0]
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
