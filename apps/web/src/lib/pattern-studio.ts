import type {
  Board,
  BoardGroup,
  BoxelAssembly,
  BoxelCell,
  ControlPoint,
  Path2DShape,
  PatternDocument,
} from '@xtool-demo/protocol'
import {
  appendBoxelCellAboveColumn,
  buildJointCandidates,
  calculatePathArea,
  calculatePathPerimeter,
  createDovetailSocket,
  createUprightBoardOutline,
  findAnchorConnections,
  findFaceAdjacentAssemblies,
  findClosestUprightBoardMoveSnap,
  getBoundsFromPoints,
  getUprightBoardHeight,
  getUprightBoardLength,
  mergeBoardsThroughConnection,
  mergeAssembliesThroughWorldCell,
  normalizeUprightBoardSpan,
  splitAssemblyIntoConnectedComponents,
  splitBoardGroupAfterRemoval,
} from '@xtool-demo/core'

export {
  getUprightBoardHeight,
  getUprightBoardLength,
} from '@xtool-demo/core'
import {
  createCircleShape,
  createRectangleShape,
  createRoundedRectangleShape,
} from '@xtool-demo/protocol'

import { getRandomId } from '@/lib/utils'

export type RouteKey = 'editor' | 'generator'
export type ShapePreset = 'rectangle' | 'rounded-rectangle' | 'circle'

export interface EditorSelectionState {
  activeAssemblyId: string
  activeBoardId: string
  selectedAssemblyIds: string[]
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

export interface BoardMoveConnection {
  anchor: 'end' | 'start'
  boardId: string
  localX: number
  offset: ControlPoint
  point: ControlPoint
}

export interface BoardMoveConnectionPreview {
  boards: Board[]
  point: ControlPoint
}

export interface BoxelCommitResult {
  assembly: BoxelAssembly
  document: PatternDocument
  selection: EditorSelectionState
}

export interface BoxelRemoveResult {
  document: PatternDocument
  removed: boolean
  selection: EditorSelectionState
}

export interface BoardGeometrySnapshot {
  boardId: string
  holes: Path2DShape[]
  outline: Path2DShape
}

export interface PresetOption {
  id: ShapePreset
  label: string
  description: string
}

export const CREATE_BOARD_GRID_SIZE = 40
export const CREATE_BOARD_DEFAULT_LENGTH = CREATE_BOARD_GRID_SIZE
export const CREATE_BOARD_DEFAULT_HEIGHT = 220
export const CREATE_BOARD_DEFAULT_THICKNESS = 18
export const BOXEL_DEFAULT_CELL_SIZE = CREATE_BOARD_GRID_SIZE

export function normalizeCreateBoardSpan(
  span: BoardSpan,
  minimumLength = CREATE_BOARD_DEFAULT_LENGTH,
): BoardSpan {
  return normalizeUprightBoardSpan(span, minimumLength)
}

function getCreateBoardRotation(span: BoardSpan) {
  const deltaX = span.end.x - span.start.x
  const deltaY = span.end.y - span.start.y
  return (Math.atan2(deltaY, deltaX) * 180) / Math.PI
}

function getCreateBoardLength(span: BoardSpan) {
  const deltaX = span.end.x - span.start.x
  const deltaY = span.end.y - span.start.y
  return Math.hypot(deltaX, deltaY)
}

function buildStandingBoard(
  span: BoardSpan,
): Board {
  const normalizedSpan = normalizeCreateBoardSpan(span)
  const length = getCreateBoardLength(normalizedSpan)

  return {
    id: getRandomId('board'),
    name: 'Standing board',
    thickness: CREATE_BOARD_DEFAULT_THICKNESS,
    material: 'birch-ply',
    transform: {
      x: normalizedSpan.start.x,
      y: normalizedSpan.start.y,
      rotation: getCreateBoardRotation(normalizedSpan),
      orientation: 'upright',
    },
    outline: createUprightBoardOutline(
      length,
      CREATE_BOARD_DEFAULT_HEIGHT,
      null,
    ),
    holes: [],
  }
}

function applyConnectionSocket(board: Board, localX: number): Board {
  const boardHeight = getUprightBoardHeight(board)
  const boardLength = getUprightBoardLength(board)
  if (!boardHeight || !boardLength) {
    return board
  }

  return {
    ...board,
    holes: [...board.holes, createDovetailSocket(boardLength, boardHeight, localX)],
  }
}

function clonePathShape(shape: Path2DShape): Path2DShape {
  return {
    closed: shape.closed,
    segments: shape.segments.map(segment => ({
      kind: segment.kind,
      points: segment.points.map(point => ({
        x: point.x,
        y: point.y,
      })),
    })),
  }
}

export function snapshotBoardGeometry(board: Board): BoardGeometrySnapshot {
  return {
    boardId: board.id,
    holes: board.holes.map(clonePathShape),
    outline: clonePathShape(board.outline),
  }
}

export function restoreBoardGeometry(
  document: PatternDocument,
  snapshots: BoardGeometrySnapshot[],
): PatternDocument {
  const snapshotMap = new Map(snapshots.map(snapshot => [snapshot.boardId, snapshot]))

  return {
    ...document,
    boards: document.boards.map((board) => {
      const snapshot = snapshotMap.get(board.id)
      if (!snapshot) {
        return board
      }

      return {
        ...board,
        holes: snapshot.holes.map(clonePathShape),
        outline: clonePathShape(snapshot.outline),
      }
    }),
  }
}

export function createStandingBoardPreview(
  span: BoardSpan,
): Board {
  return buildStandingBoard(span)
}

export function commitStandingBoardFromSpan(
  span: BoardSpan,
) {
  return buildStandingBoard(span)
}

export function hingeExtrudeBoard(parentBoard: Board, document?: PatternDocument): Board | null {
  const height = getUprightBoardHeight(parentBoard)
  const length = getUprightBoardLength(parentBoard)

  if (!height || !length) {
    return null
  }

  let flipPitch = false

  // Smart direction detection: if part of a group, point towards centroid
  if (document) {
    const group = getBoardGroupForBoard(document.boardGroups, parentBoard.id)
    if (group && group.boardIds.length > 2) {
      const groupBoards = document.boards.filter(b => group.boardIds.includes(b.id))
      const centroid = { x: 0, y: 0 }
      groupBoards.forEach((b) => {
        centroid.x += b.transform.x
        centroid.y += b.transform.y
      })
      centroid.x /= groupBoards.length
      centroid.y /= groupBoards.length

      // Vector from board start to centroid
      const toCentroid = {
        x: centroid.x - parentBoard.transform.x,
        y: centroid.y - parentBoard.transform.y,
      }

      // Board rotation in radians
      const rad = (parentBoard.transform.rotation * Math.PI) / 180
      // Normal vector pointing "inward" (90 deg counter-clockwise from baseline)
      const normal = {
        x: -Math.sin(rad),
        y: Math.cos(rad),
      }

      // Dot product to check if normal points towards centroid
      const dot = toCentroid.x * normal.x + toCentroid.y * normal.y
      if (dot < 0) {
        flipPitch = true
      }
    }
  }

  return {
    id: getRandomId('board'),
    name: 'Hinged board',
    thickness: parentBoard.thickness,
    material: parentBoard.material,
    transform: {
      x: parentBoard.transform.x,
      y: parentBoard.transform.y,
      rotation: parentBoard.transform.rotation,
      orientation: 'hinged',
      pitch: 0,
      z: height,
      flipPitch,
    },
    outline: createRectangleShape(length, height),
    holes: [],
  }
}

export function findBoardMoveConnection(
  document: PatternDocument,
  movingBoardId: string,
): BoardMoveConnection | null {
  const movingBoard = document.boards.find(board => board.id === movingBoardId)
  if (!movingBoard || movingBoard.transform.orientation !== 'upright') {
    return null
  }

  const snap = findClosestUprightBoardMoveSnap(movingBoard, document.boards)
  if (!snap) {
    return null
  }

  return {
    anchor: snap.anchor,
    boardId: snap.boardId,
    localX: snap.localX,
    offset: snap.offset,
    point: snap.point,
  }
}

export function applyBoardMoveConnection(
  document: PatternDocument,
  movingBoardId: string,
  connection: BoardMoveConnection,
): PatternDocument {
  return {
    ...document,
    boards: document.boards.map((board) => {
      if (board.id === movingBoardId) {
        const boardHeight = getUprightBoardHeight(board)
        const boardLength = getUprightBoardLength(board)

        if (!boardHeight || !boardLength) {
          return board
        }

        return {
          ...board,
          outline: createUprightBoardOutline(
            boardLength,
            boardHeight,
            {
              anchor: connection.anchor,
              boardHeight,
            },
          ),
        }
      }

      if (board.id === connection.boardId) {
        return applyConnectionSocket(board, connection.localX)
      }

      return board
    }),
  }
}

export function buildBoardMoveConnectionPreview(
  document: PatternDocument,
  movingBoardId: string,
  connection: BoardMoveConnection,
): BoardMoveConnectionPreview {
  const connectedDocument = applyBoardMoveConnection(
    document,
    movingBoardId,
    connection,
  )

  return {
    boards: connectedDocument.boards.filter(board =>
      board.id === movingBoardId || board.id === connection.boardId,
    ),
    point: connection.point,
  }
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
    activeAssemblyId: '',
    activeBoardId,
    selectedAssemblyIds: [],
    selectedBoardIds: activeBoardId ? [activeBoardId] : [],
  }
}

export function normalizeEditorSelection(
  document: PatternDocument,
  selection: EditorSelectionState,
): EditorSelectionState {
  const boardIds = new Set(document.boards.map(board => board.id))
  const assemblyIds = new Set(document.assemblies.map(assembly => assembly.id))
  const nextSelectedBoardIds = selection.selectedBoardIds.filter(boardId =>
    boardIds.has(boardId),
  )
  const nextSelectedAssemblyIds = selection.selectedAssemblyIds.filter(assemblyId =>
    assemblyIds.has(assemblyId),
  )
  const nextActiveAssemblyId
    = assemblyIds.has(selection.activeAssemblyId)
      ? selection.activeAssemblyId
      : nextSelectedAssemblyIds[0] ?? ''

  const nextActiveBoardId
    = boardIds.has(selection.activeBoardId)
      ? selection.activeBoardId
      : nextSelectedBoardIds[0] ?? document.boards[0]?.id ?? ''

  if (nextActiveAssemblyId) {
    return {
      activeAssemblyId: nextActiveAssemblyId,
      activeBoardId: '',
      selectedAssemblyIds: nextSelectedAssemblyIds.includes(nextActiveAssemblyId)
        ? nextSelectedAssemblyIds
        : nextActiveAssemblyIdsWithActive(nextSelectedAssemblyIds, nextActiveAssemblyId),
      selectedBoardIds: [],
    }
  }

  if (nextSelectedBoardIds.length === 0 && nextActiveBoardId) {
    return createEditorSelection(nextActiveBoardId)
  }

  if (nextSelectedBoardIds.includes(nextActiveBoardId)) {
    return {
      activeAssemblyId: '',
      activeBoardId: nextActiveBoardId,
      selectedAssemblyIds: [],
      selectedBoardIds: nextSelectedBoardIds,
    }
  }

  return {
    activeAssemblyId: '',
    activeBoardId: nextActiveBoardId,
    selectedAssemblyIds: [],
    selectedBoardIds: nextActiveBoardIdsWithActive(nextSelectedBoardIds, nextActiveBoardId),
  }
}

function nextActiveAssemblyIdsWithActive(
  selectedAssemblyIds: string[],
  activeAssemblyId: string,
) {
  if (!activeAssemblyId) {
    return selectedAssemblyIds
  }

  return [...selectedAssemblyIds, activeAssemblyId]
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

export function selectSingleAssembly(assemblyId: string): EditorSelectionState {
  return {
    activeAssemblyId: assemblyId,
    activeBoardId: '',
    selectedAssemblyIds: assemblyId ? [assemblyId] : [],
    selectedBoardIds: [],
  }
}

export function toggleBoardSelection(
  selection: EditorSelectionState,
  boardId: string,
): EditorSelectionState {
  if (!selection.selectedBoardIds.includes(boardId)) {
    return {
      activeAssemblyId: '',
      activeBoardId: boardId,
      selectedAssemblyIds: [],
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
    activeAssemblyId: '',
    activeBoardId: nextActiveBoardId,
    selectedAssemblyIds: [],
    selectedBoardIds: nextSelectedBoardIds,
  }
}

export function toggleAssemblySelection(
  selection: EditorSelectionState,
  assemblyId: string,
): EditorSelectionState {
  if (!selection.selectedAssemblyIds.includes(assemblyId)) {
    return {
      activeAssemblyId: assemblyId,
      activeBoardId: '',
      selectedAssemblyIds: [...selection.selectedAssemblyIds, assemblyId],
      selectedBoardIds: [],
    }
  }

  const nextSelectedAssemblyIds = selection.selectedAssemblyIds.filter(
    selectedAssemblyId => selectedAssemblyId !== assemblyId,
  )
  const nextActiveAssemblyId
    = selection.activeAssemblyId === assemblyId
      ? nextSelectedAssemblyIds.at(-1) ?? ''
      : selection.activeAssemblyId

  return {
    activeAssemblyId: nextActiveAssemblyId,
    activeBoardId: '',
    selectedAssemblyIds: nextSelectedAssemblyIds,
    selectedBoardIds: [],
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

export function moveAssemblyByDelta(
  document: PatternDocument,
  assemblyId: string,
  delta: { x: number; y: number },
): PatternDocument {
  return {
    ...document,
    assemblies: document.assemblies.map((assembly) => {
      if (assembly.id !== assemblyId) {
        return assembly
      }

      return {
        ...assembly,
        origin: {
          x: assembly.origin.x + delta.x,
          y: assembly.origin.y + delta.y,
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

function findBoxelAssemblyAtColumn(
  document: PatternDocument,
  column: ControlPoint,
) {
  return document.assemblies.find(assembly =>
    assembly.origin.x === column.x && assembly.origin.y === column.y,
  ) ?? null
}

function sortAssembliesByOrigin(assemblies: BoxelAssembly[]) {
  return [...assemblies].sort((left, right) => {
    if (left.origin.x !== right.origin.x) {
      return left.origin.x - right.origin.x
    }

    if (left.origin.y !== right.origin.y) {
      return left.origin.y - right.origin.y
    }

    return left.id.localeCompare(right.id)
  })
}

function createBoxelAssembly(column: ControlPoint): BoxelAssembly {
  return {
    id: getRandomId('assembly'),
    name: 'Boxel assembly',
    cellSize: BOXEL_DEFAULT_CELL_SIZE,
    origin: {
      x: column.x,
      y: column.y,
    },
    cells: [{ x: 0, y: 0, z: 0 }],
  }
}

export function commitBoxelAtColumn(
  document: PatternDocument,
  column: ControlPoint,
): BoxelCommitResult {
  const existingAssembly = findBoxelAssemblyAtColumn(document, column)
  if (existingAssembly) {
    const assembly = appendBoxelCellAboveColumn(existingAssembly, { x: 0, y: 0 })

    return {
      assembly,
      document: updateDocumentTimestamp({
        ...document,
        assemblies: sortAssembliesByOrigin(document.assemblies.map(currentAssembly =>
          currentAssembly.id === assembly.id ? assembly : currentAssembly,
        )),
      }),
      selection: selectSingleAssembly(assembly.id),
    }
  }

  const adjacentAssemblies = findFaceAdjacentAssemblies(document.assemblies, {
    x: Math.round(column.x / BOXEL_DEFAULT_CELL_SIZE),
    y: Math.round(column.y / BOXEL_DEFAULT_CELL_SIZE),
    z: 0,
  })
  const assembly = adjacentAssemblies.length > 0
    ? mergeAssembliesThroughWorldCell(adjacentAssemblies, {
        x: Math.round(column.x / BOXEL_DEFAULT_CELL_SIZE),
        y: Math.round(column.y / BOXEL_DEFAULT_CELL_SIZE),
        z: 0,
      })
    : createBoxelAssembly(column)

  if (!assembly) {
    const fallbackAssembly = createBoxelAssembly(column)
    return {
      assembly: fallbackAssembly,
      document: updateDocumentTimestamp({
        ...document,
        assemblies: [...document.assemblies, fallbackAssembly],
      }),
      selection: selectSingleAssembly(fallbackAssembly.id),
    }
  }

  const touchedAssemblyIds = new Set(adjacentAssemblies.map(currentAssembly => currentAssembly.id))

  return {
    assembly,
    document: updateDocumentTimestamp({
      ...document,
      assemblies: sortAssembliesByOrigin(
        adjacentAssemblies.length > 0
          ? [
              ...document.assemblies.filter(currentAssembly =>
                !touchedAssemblyIds.has(currentAssembly.id),
              ),
              assembly,
            ]
          : [...document.assemblies, assembly],
      ),
    }),
    selection: selectSingleAssembly(assembly.id),
  }
}

export function removeBoxelFromAssembly(
  document: PatternDocument,
  assemblyId: string,
  cell: BoxelCell,
): BoxelRemoveResult {
  const assembly = document.assemblies.find(currentAssembly => currentAssembly.id === assemblyId)
  if (!assembly) {
    return {
      document,
      removed: false,
      selection: normalizeEditorSelection(document, createEditorSelection('')),
    }
  }

  const remainingCells = assembly.cells.filter(existingCell =>
    existingCell.x !== cell.x
    || existingCell.y !== cell.y
    || existingCell.z !== cell.z,
  )

  if (remainingCells.length === assembly.cells.length) {
    return {
      document,
      removed: false,
      selection: selectSingleAssembly(assemblyId),
    }
  }

  const replacementAssemblies = remainingCells.length > 0
    ? splitAssemblyIntoConnectedComponents({
        ...assembly,
        cells: remainingCells,
      }).map((component, index) => ({
        ...component,
        id: index === 0 ? assembly.id : getRandomId('assembly'),
      }))
    : []

  const nextDocument = updateDocumentTimestamp({
    ...document,
    assemblies: sortAssembliesByOrigin([
      ...document.assemblies.filter(currentAssembly => currentAssembly.id !== assemblyId),
      ...replacementAssemblies,
    ]),
  })

  const nextSelection = replacementAssemblies[0]
    ? selectSingleAssembly(replacementAssemblies[0].id)
    : normalizeEditorSelection(nextDocument, createEditorSelection(''))

  return {
    document: nextDocument,
    removed: true,
    selection: nextSelection,
  }
}

export function getAssemblyJointCandidates(assembly: BoxelAssembly) {
  return buildJointCandidates(assembly)
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
      transform: { x: xOffset, y: yOffset, rotation: 0, orientation: 'flat' },
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
      transform: { x: xOffset, y: yOffset, rotation: 0, orientation: 'flat' },
      outline: createCircleShape(52),
      holes: [],
    }
  }

  return {
    id: getRandomId('board'),
    name: 'Rounded panel',
    thickness: 18,
    material: 'birch-ply',
    transform: { x: xOffset, y: yOffset, rotation: 0, orientation: 'flat' },
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
      orientation: 'flat',
    },
    outline: createRectangleShape(width, height),
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

export type SketchClassification = 'circle' | 'rectangle' | 'unknown'

export function classifySketchPath(points: ControlPoint[]): SketchClassification {
  if (points.length < 5) {
    return 'unknown'
  }

  const area = calculatePathArea(points)
  const perimeter = calculatePathPerimeter(points)
  const bounds = getBoundsFromPoints(points)
  const boundsArea = bounds.width * bounds.height

  if (boundsArea === 0 || perimeter === 0) {
    return 'unknown'
  }

  const rectangularity = area / boundsArea
  const circularity = (4 * Math.PI * area) / (perimeter * perimeter)

  // Relaxed thresholds for messy human sketches
  if (circularity > 0.5) {
    return 'circle'
  }

  if (rectangularity > 0.6) {
    return 'rectangle'
  }

  // Fallback: if it's a reasonably large closed loop but messy, assume rectangle enclosure
  if (area > 1000 && points.length > 10) {
    return 'rectangle'
  }

  return 'unknown'
}

export function createCircularBoardFromBounds(points: ControlPoint[]): Board {
  const bounds = getBoundsFromPoints(points)
  const radius = (bounds.width + bounds.height) / 4
  const centerX = bounds.minX + bounds.width / 2
  const centerY = bounds.minY + bounds.height / 2

  return {
    id: getRandomId('board'),
    name: 'Circular panel',
    thickness: 18,
    material: 'birch-ply',
    transform: {
      x: centerX - radius,
      y: centerY - radius,
      rotation: 0,
      orientation: 'flat',
    },
    outline: createCircleShape(radius),
    holes: [],
  }
}

export function createBoardEnclosureFromBounds(points: ControlPoint[]): { boards: Board[]; group: BoardGroup } {
  const bounds = getBoundsFromPoints(points)
  const { minX, maxX, minY, maxY } = bounds
  const thickness = 18
  const height = CREATE_BOARD_DEFAULT_HEIGHT

  const boards: Board[] = [
    // Front
    {
      id: getRandomId('board'),
      name: 'Front wall',
      thickness,
      material: 'birch-ply',
      transform: { x: minX, y: minY, rotation: 0, orientation: 'upright' },
      outline: createUprightBoardOutline(maxX - minX, height, null),
      holes: [],
    },
    // Back
    {
      id: getRandomId('board'),
      name: 'Back wall',
      thickness,
      material: 'birch-ply',
      transform: { x: minX, y: maxY, rotation: 0, orientation: 'upright' },
      outline: createUprightBoardOutline(maxX - minX, height, null),
      holes: [],
    },
    // Left
    {
      id: getRandomId('board'),
      name: 'Left wall',
      thickness,
      material: 'birch-ply',
      transform: { x: minX, y: minY, rotation: 90, orientation: 'upright' },
      outline: createUprightBoardOutline(maxY - minY, height, null),
      holes: [],
    },
    // Right
    {
      id: getRandomId('board'),
      name: 'Right wall',
      thickness,
      material: 'birch-ply',
      transform: { x: maxX, y: minY, rotation: 90, orientation: 'upright' },
      outline: createUprightBoardOutline(maxY - minY, height, null),
      holes: [],
    },
  ]

  const group: BoardGroup = {
    id: getRandomId('group'),
    name: 'Sketch enclosure',
    boardIds: boards.map(b => b.id),
    connections: [], // Connections could be calculated but not required for MVP grouping
  }

  return { boards, group }
}

export function commitSketch(
  document: PatternDocument,
  points: ControlPoint[],
): { document: PatternDocument; selection: EditorSelectionState } {
  const classification = classifySketchPath(points)

  if (classification === 'circle') {
    const nextBoard = createCircularBoardFromBounds(points)
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: [...document.boards, nextBoard],
    })
    return {
      document: nextDocument,
      selection: selectSingleBoard(nextBoard.id),
    }
  }

  if (classification === 'rectangle') {
    const { boards: nextBoards, group } = createBoardEnclosureFromBounds(points)
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: [...document.boards, ...nextBoards],
      boardGroups: [...document.boardGroups, group],
    })
    return {
      document: nextDocument,
      selection: {
        activeAssemblyId: '',
        activeBoardId: nextBoards[0]?.id ?? '',
        selectedAssemblyIds: [],
        selectedBoardIds: nextBoards.map(b => b.id),
      },
    }
  }

  return {
    document,
    selection: {
      activeAssemblyId: '',
      activeBoardId: '',
      selectedAssemblyIds: [],
      selectedBoardIds: [],
    },
  }
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

export const BOARD_ANCHOR_SNAP_THRESHOLD = CREATE_BOARD_GRID_SIZE

export function getBoardGroupForBoard(
  groups: BoardGroup[],
  boardId: string,
): BoardGroup | null {
  return groups.find(group => group.boardIds.includes(boardId)) ?? null
}

export function evaluateBoardGroupsAfterAdd(
  document: PatternDocument,
  addedBoardId: string,
  threshold = BOARD_ANCHOR_SNAP_THRESHOLD,
): PatternDocument {
  const connections = findAnchorConnections(document.boards, threshold)
  const addedBoardConnections = connections.filter(
    connection =>
      connection.a.boardId === addedBoardId
      || connection.b.boardId === addedBoardId,
  )

  let boardGroups = document.boardGroups

  for (const connection of addedBoardConnections) {
    boardGroups = mergeBoardsThroughConnection(boardGroups, connection, addedBoardId)
  }

  return {
    ...document,
    boardGroups,
  }
}

export function evaluateBoardGroupsAfterRemove(
  document: PatternDocument,
  removedBoardId: string,
): PatternDocument {
  const boardGroups = splitBoardGroupAfterRemoval(document.boardGroups, removedBoardId)

  return {
    ...document,
    boardGroups,
  }
}
