import type {
  Board,
  BoardGroup,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'

import { getBoardOutlineWithJoints } from './board-finger-joint'
import {
  getBoundsFromPoints,
  sampleShapePoints,
} from './geometry'

export interface NestingOptions {
  allowRotation?: boolean
  edgePadding?: number
  gutter?: number
  sheetHeight?: number
  sheetWidth?: number
}

export interface NestingBoardFootprint {
  boardId: string
  height: number
  holes: ControlPoint[][]
  name: string
  outline: ControlPoint[]
  thickness: number
  width: number
}

export interface NestingPlacement {
  boardId: string
  height: number
  holes: ControlPoint[][]
  name: string
  outline: ControlPoint[]
  rotation: 0 | 90
  sheetIndex: number
  thickness: number
  width: number
  x: number
  y: number
}

export interface NestingSheet {
  height: number
  index: number
  placements: NestingPlacement[]
  width: number
}

export interface NestingResult {
  footprints: NestingBoardFootprint[]
  sheets: NestingSheet[]
}

interface ShelfState {
  height: number
  widthUsed: number
  y: number
}

interface CandidatePlacement {
  placement: NestingPlacement
  shelfIndex: number
  score: number
}

const DEFAULT_SHEET_HEIGHT = 2440
const DEFAULT_SHEET_WIDTH = 1220
const DEFAULT_GUTTER = 12
const DEFAULT_EDGE_PADDING = 24

function normalizePoints(points: ControlPoint[], minX: number, minY: number) {
  return points.map(point => ({
    x: point.x - minX,
    y: point.y - minY,
  }))
}

function rotateNormalizedPoints90(points: ControlPoint[], width: number) {
  return points.map(point => ({
    x: width - point.y,
    y: point.x,
  }))
}

function buildFootprint(board: Board, groups: BoardGroup[], allBoards: Board[]): NestingBoardFootprint {
  const outlinePoints = sampleShapePoints(getBoardOutlineWithJoints(board, groups, allBoards))
  const bounds = getBoundsFromPoints(outlinePoints)
  const normalizedOutline = normalizePoints(outlinePoints, bounds.minX, bounds.minY)
  const normalizedHoles = board.holes.map((hole) => {
    const holePoints = sampleShapePoints(hole)
    return normalizePoints(holePoints, bounds.minX, bounds.minY)
  })

  return {
    boardId: board.id,
    height: Math.max(1, bounds.height),
    holes: normalizedHoles,
    name: board.name,
    outline: normalizedOutline,
    thickness: board.thickness,
    width: Math.max(1, bounds.width),
  }
}

function createEmptySheet(index: number, width: number, height: number, edgePadding: number) {
  return {
    height,
    index,
    placements: [] as NestingPlacement[],
    shelves: [{
      height: 0,
      widthUsed: edgePadding,
      y: edgePadding,
    }] satisfies ShelfState[],
    width,
  }
}

function createPlacement(
  footprint: NestingBoardFootprint,
  x: number,
  y: number,
  sheetIndex: number,
  rotation: 0 | 90,
): NestingPlacement {
  if (rotation === 90) {
    return {
      boardId: footprint.boardId,
      height: footprint.width,
      holes: footprint.holes.map(points => rotateNormalizedPoints90(points, footprint.width)),
      name: footprint.name,
      outline: rotateNormalizedPoints90(footprint.outline, footprint.width),
      rotation,
      sheetIndex,
      thickness: footprint.thickness,
      width: footprint.height,
      x,
      y,
    }
  }

  return {
    boardId: footprint.boardId,
    height: footprint.height,
    holes: footprint.holes,
    name: footprint.name,
    outline: footprint.outline,
    rotation,
    sheetIndex,
    thickness: footprint.thickness,
    width: footprint.width,
    x,
    y,
  }
}

function scorePlacement(
  sheetWidth: number,
  placement: NestingPlacement,
  shelf: ShelfState,
  shelfIndex: number,
) {
  const remainingWidth = sheetWidth - (placement.x + placement.width)
  const shelfGrowth = Math.max(0, placement.height - shelf.height)
  return shelfIndex * 100000 + shelfGrowth * 100 + remainingWidth
}

function findPlacementCandidate(
  footprint: NestingBoardFootprint,
  sheet: ReturnType<typeof createEmptySheet>,
  options: Required<NestingOptions>,
): CandidatePlacement | null {
  const rotations: Array<0 | 90> = options.allowRotation ? [0, 90] : [0]
  const usableWidth = sheet.width - options.edgePadding
  const usableHeight = sheet.height - options.edgePadding
  let bestCandidate: CandidatePlacement | null = null

  for (const rotation of rotations) {
    const footprintWidth = rotation === 90 ? footprint.height : footprint.width
    const footprintHeight = rotation === 90 ? footprint.width : footprint.height

    for (let shelfIndex = 0; shelfIndex < sheet.shelves.length; shelfIndex += 1) {
      const shelf = sheet.shelves[shelfIndex]
      if (!shelf) {
        continue
      }

      const x = shelf.widthUsed
      const y = shelf.y
      const nextHeight = Math.max(shelf.height, footprintHeight)
      const fitsWidth = x + footprintWidth <= usableWidth
      const fitsHeight = y + nextHeight <= usableHeight

      if (!fitsWidth || !fitsHeight) {
        continue
      }

      const placement = createPlacement(
        footprint,
        x,
        y,
        sheet.index,
        rotation,
      )
      const score = scorePlacement(sheet.width, placement, shelf, shelfIndex)

      if (!bestCandidate || score < bestCandidate.score) {
        bestCandidate = {
          placement,
          score,
          shelfIndex,
        }
      }
    }

    const lastShelf = sheet.shelves.at(-1)
    if (!lastShelf) {
      continue
    }

    const nextShelfY = lastShelf.y + lastShelf.height + options.gutter
    const fitsNewShelfWidth = options.edgePadding + footprintWidth <= usableWidth
    const fitsNewShelfHeight = nextShelfY + footprintHeight <= usableHeight

    if (!fitsNewShelfWidth || !fitsNewShelfHeight) {
      continue
    }

    const placement = createPlacement(
      footprint,
      options.edgePadding,
      nextShelfY,
      sheet.index,
      rotation,
    )
    const score = scorePlacement(
      sheet.width,
      placement,
      {
        height: 0,
        widthUsed: options.edgePadding,
        y: nextShelfY,
      },
      sheet.shelves.length,
    )

    if (!bestCandidate || score < bestCandidate.score) {
      bestCandidate = {
        placement,
        score,
        shelfIndex: sheet.shelves.length,
      }
    }
  }

  return bestCandidate
}

function sortFootprints(footprints: NestingBoardFootprint[]) {
  return footprints.toSorted((left, right) => {
    const maxSideDelta = Math.max(right.width, right.height) - Math.max(left.width, left.height)
    if (maxSideDelta !== 0) {
      return maxSideDelta
    }

    const areaDelta = right.width * right.height - left.width * left.height
    if (areaDelta !== 0) {
      return areaDelta
    }

    return left.boardId.localeCompare(right.boardId)
  })
}

function placeCandidateOnSheet(
  sheet: ReturnType<typeof createEmptySheet>,
  candidate: CandidatePlacement,
  gutter: number,
) {
  const shelf = sheet.shelves[candidate.shelfIndex]
  if (shelf) {
    shelf.widthUsed = candidate.placement.x + candidate.placement.width + gutter
    shelf.height = Math.max(shelf.height, candidate.placement.height)
  }
  else {
    sheet.shelves.push({
      height: candidate.placement.height,
      widthUsed: candidate.placement.x + candidate.placement.width + gutter,
      y: candidate.placement.y,
    })
  }

  sheet.placements.push(candidate.placement)
}

function getTrimmedSheetSize(
  sheet: ReturnType<typeof createEmptySheet>,
  edgePadding: number,
) {
  if (sheet.placements.length === 0) {
    return {
      height: sheet.height,
      width: sheet.width,
    }
  }

  let maxRight = edgePadding
  let maxBottom = edgePadding

  for (const placement of sheet.placements) {
    maxRight = Math.max(maxRight, placement.x + placement.width)
    maxBottom = Math.max(maxBottom, placement.y + placement.height)
  }

  return {
    height: Math.min(sheet.height, maxBottom + edgePadding),
    width: Math.min(sheet.width, maxRight + edgePadding),
  }
}

export function getBoardFootprints(document: PatternDocument) {
  return document.boards.map(board => buildFootprint(board, document.boardGroups, document.boards))
}

export function buildNestingLayout(
  document: PatternDocument,
  options: NestingOptions = {},
): NestingResult {
  const resolvedOptions: Required<NestingOptions> = {
    allowRotation: options.allowRotation ?? true,
    edgePadding: options.edgePadding ?? DEFAULT_EDGE_PADDING,
    gutter: options.gutter ?? DEFAULT_GUTTER,
    sheetHeight: options.sheetHeight ?? DEFAULT_SHEET_HEIGHT,
    sheetWidth: options.sheetWidth ?? DEFAULT_SHEET_WIDTH,
  }
  const footprints = sortFootprints(getBoardFootprints(document))
  const sheets: Array<ReturnType<typeof createEmptySheet>> = []

  for (const footprint of footprints) {
    let placed = false

    for (const sheet of sheets) {
      const candidate = findPlacementCandidate(footprint, sheet, resolvedOptions)
      if (!candidate) {
        continue
      }

      placeCandidateOnSheet(sheet, candidate, resolvedOptions.gutter)
      placed = true
      break
    }

    if (placed) {
      continue
    }

    const nextSheet = createEmptySheet(
      sheets.length,
      resolvedOptions.sheetWidth,
      resolvedOptions.sheetHeight,
      resolvedOptions.edgePadding,
    )
    const candidate = findPlacementCandidate(footprint, nextSheet, resolvedOptions)
    if (!candidate) {
      continue
    }

    placeCandidateOnSheet(nextSheet, candidate, resolvedOptions.gutter)
    sheets.push(nextSheet)
  }

  return {
    footprints,
    sheets: sheets.map(sheet => ({
      ...getTrimmedSheetSize(sheet, resolvedOptions.edgePadding),
      index: sheet.index,
      placements: sheet.placements,
    })),
  }
}
