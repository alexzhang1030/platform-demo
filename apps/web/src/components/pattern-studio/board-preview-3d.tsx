import type { ThreeEvent } from '@react-three/fiber'
import type {
  Board,
  BoxelAssembly,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'
import type { ComponentRef, RefObject } from 'react'
import type { EditorSelectionState } from '@/lib/pattern-studio'
import { Button } from '@workspace/ui/components/button'
import {
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import {
  buildBoxelAssemblyBounds,
  getBoxelCellWorldPosition,
  getBoxelColumnHeight,
  getBoardGroundFootprint,
  getUprightBoardHeight,
  sampleShapePoints,
} from '@xtool-demo/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'

import { useTheme } from '@/components/theme-provider'
import {
  CREATE_BOARD_GRID_SIZE,
  commitBoxelAtColumn,
  getAssemblyJointCandidates,
  applyBoardMoveConnection,
  buildBoardMoveConnectionPreview,
  commitStandingBoardFromSpan,
  createStandingBoardPreview,
  findBoardMoveConnection,
  moveBoardsByDelta,
  restoreBoardGeometry,
  removeBoxelFromAssembly,
  selectSingleAssembly,
  selectSingleBoard,
  snapshotBoardGeometry,
  toggleAssemblySelection,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'
import { clamp } from '@/lib/utils'
import { PatternStudioLights } from './pattern-studio-lights'
import { SelectionOutline } from './selection-outline'
import { WebGPUGrid } from './webgpu-grid'

interface BoardPreview3DProps {
  boxelModeEnabled?: boolean
  boxelRemoveModeEnabled?: boolean
  createBoardModeEnabled?: boolean
  document: PatternDocument
  selection: EditorSelectionState
  onBoardEditRequest?: (boardId: string) => void
  onSelectionChange: (selection: EditorSelectionState) => void
  onDocumentChange: (document: PatternDocument) => void
  canvasClassName?: string
}

interface BoardMeshProps {
  board: Board
  onMeshChange: (boardId: string, object: THREE.Object3D | null) => void
  onDoubleClick?: (event: ThreeEvent<MouseEvent>, board: Board) => void
  onPointerDown?: (event: ThreeEvent<PointerEvent>, board: Board) => void
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  preview?: boolean
}

interface BoxelAssemblyMeshProps {
  assembly: BoxelAssembly
  candidateOnly?: boolean
  onMeshChange: (assemblyId: string, object: THREE.Object3D | null) => void
  onCellPointerDown?: (
    event: ThreeEvent<PointerEvent>,
    assembly: BoxelAssembly,
    cell: {
      x: number
      y: number
      z: number
    },
  ) => void
  onPointerDown?: (event: ThreeEvent<PointerEvent>, assembly: BoxelAssembly) => void
  previewCell?: {
    x: number
    y: number
    z: number
  } | null
  preview?: boolean
}

interface SceneProps extends BoardPreview3DProps {
  assemblyObjectsRef: RefObject<Map<string, THREE.Object3D>>
  boardGroupRef: RefObject<Map<string, BoardGroupRecord>>
  boardToGroupRef: RefObject<Map<string, string>>
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>
  createBoardDraft: CreateBoardDraft | null
  groupCounterRef: RefObject<number>
  initialCameraFraming: ReturnType<typeof getCameraFraming>
  isCameraPanModifierPressed: boolean
  isCreateBoardAngleSnapDisabled: boolean
  latestDocumentRef: RefObject<PatternDocument>
  onBoardEditRequest?: (boardId: string) => void
  onCreateBoardDraftChange: (draft: CreateBoardDraft | null) => void
  onGroupStateChange: (groupId: string) => void
  resolvedTheme: 'dark' | 'light'
}

interface DragState {
  document: PatternDocument
  movingBoardId: string
  pendingConnection: ReturnType<typeof findBoardMoveConnection>
  selectedBoardIds: string[]
  startPoint: THREE.Vector3
}

interface BoardGroupRecord {
  boardIds: string[]
  geometrySnapshots: ReturnType<typeof snapshotBoardGeometry>[]
  id: string
}

interface BoardWorkspaceBounds {
  center: THREE.Vector3
  maxDimension: number
}

interface WebGPUCanvasRendererParameters {
  alpha?: boolean
  antialias?: boolean
  canvas?: HTMLCanvasElement | OffscreenCanvas
  depth?: boolean
  stencil?: boolean
}

interface CreateBoardDraft {
  end: THREE.Vector3
  start: THREE.Vector3
}

interface CreateCursorPosition {
  x: number
  y: number
}

interface BoxelPreviewState {
  assemblyId: string | null
  column: ControlPoint
  previewCell: {
    x: number
    y: number
    z: number
  }
}

interface DragConnectionPreview {
  boards: Board[]
  lineEnd: CreateCursorPosition
  lineStart: CreateCursorPosition
  point: CreateCursorPosition
}

interface JointCandidateBarProps {
  assembly: BoxelAssembly
}

const MIN_CREATE_BOARD_SPAN = 1

function snapValueToGrid(value: number) {
  return Math.round(value / CREATE_BOARD_GRID_SIZE) * CREATE_BOARD_GRID_SIZE
}

function snapPointToGrid(point: THREE.Vector3) {
  return new THREE.Vector3(
    snapValueToGrid(point.x),
    snapValueToGrid(point.y),
    0,
  )
}

function snapPointTo45Degrees(start: THREE.Vector3, nextPoint: THREE.Vector3) {
  const deltaX = nextPoint.x - start.x
  const deltaY = nextPoint.y - start.y
  const distance = Math.hypot(deltaX, deltaY)

  if (distance < 0.001) {
    return start.clone()
  }

  const angle = Math.atan2(deltaY, deltaX)
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)

  return snapPointToGrid(new THREE.Vector3(
    start.x + Math.cos(snappedAngle) * distance,
    start.y + Math.sin(snappedAngle) * distance,
    0,
  ))
}

function getCreateBoardPlanePoint(point: THREE.Vector3) {
  return new THREE.Vector3(point.x, point.y, 0)
}

function toDocumentPoint(point: THREE.Vector3): ControlPoint {
  return {
    x: point.x,
    y: -point.y,
  }
}

function getCreateBoardSpanLength(start: THREE.Vector3, end: THREE.Vector3) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  return Math.hypot(deltaX, deltaY)
}

function getBoardWorkspaceBounds(document: PatternDocument): BoardWorkspaceBounds {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let maxZ = 0

  for (const board of document.boards) {
    const points = getBoardGroundFootprint(board)

    for (const point of points) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    const uprightHeight = getUprightBoardHeight(board)
    maxZ = Math.max(maxZ, uprightHeight ?? board.thickness)
  }

  for (const assembly of document.assemblies) {
    const bounds = buildBoxelAssemblyBounds(assembly)
    minX = Math.min(minX, bounds.minX)
    maxX = Math.max(maxX, bounds.maxX)
    minY = Math.min(minY, bounds.minY)
    maxY = Math.max(maxY, bounds.maxY)
    maxZ = Math.max(maxZ, bounds.maxZ)
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return {
      center: new THREE.Vector3(0, 0, 0),
      maxDimension: 400,
    }
  }

  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const depth = Math.max(1, maxZ)
  const paddedMaxDimension = Math.max(width, height, depth) * 1.3

  return {
    center: new THREE.Vector3((minX + maxX) / 2, -((minY + maxY) / 2), depth / 2),
    maxDimension: paddedMaxDimension,
  }
}

function getCameraFraming(bounds: BoardWorkspaceBounds) {
  const distance = Math.max(bounds.maxDimension * 1.9, 260)
  const position = bounds.center.clone().add(
    new THREE.Vector3(distance, -distance, distance * 0.85),
  )
  const near = clamp(distance * 0.04, 0.1, 80)
  const far = Math.max(distance * 6, bounds.maxDimension * 10)

  return {
    far,
    near,
    position,
    target: bounds.center,
  }
}

function toFlatBoardShape(points: ControlPoint[]) {
  const shape = new THREE.Shape()

  points.forEach((point, index) => {
    const x = point.x
    const y = -point.y

    if (index === 0) {
      shape.moveTo(x, y)
      return
    }

    shape.lineTo(x, y)
  })

  shape.closePath()
  return shape
}

function toUprightBoardShape(points: ControlPoint[]) {
  const shape = new THREE.Shape()

  points.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y)
      return
    }

    shape.lineTo(point.x, point.y)
  })

  shape.closePath()
  return shape
}

function BoardMesh({
  board,
  onMeshChange,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  preview = false,
}: BoardMeshProps) {
  const geometry = useMemo(() => {
    const outlinePoints = sampleShapePoints(board.outline)
    const shape = board.transform.orientation === 'upright'
      ? toUprightBoardShape(outlinePoints)
      : toFlatBoardShape(outlinePoints)

    for (const hole of board.holes) {
      const holePoints = sampleShapePoints(hole)
      const holePath = board.transform.orientation === 'upright'
        ? toUprightBoardShape(holePoints)
        : toFlatBoardShape(holePoints)
      shape.holes.push(holePath)
    }

    const nextGeometry = new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: false,
      depth: board.thickness,
      steps: 1,
    })

    if (board.transform.orientation === 'upright') {
      nextGeometry.translate(0, 0, -board.thickness / 2)
    }

    const indexCount = nextGeometry.index?.count
    if (typeof indexCount === 'number' && Number.isFinite(indexCount)) {
      nextGeometry.setDrawRange(0, indexCount)
    }
    nextGeometry.computeVertexNormals()
    return nextGeometry
  }, [board])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group
      position={[board.transform.x, -board.transform.y, 0]}
      rotation={[0, 0, (-board.transform.rotation * Math.PI) / 180]}
    >
      <mesh
        castShadow={!preview}
        receiveShadow={!preview}
        ref={(object) => {
          onMeshChange(board.id, object)
        }}
        geometry={geometry}
        rotation={board.transform.orientation === 'upright' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
        onDoubleClick={onDoubleClick ? event => onDoubleClick(event, board) : undefined}
        onPointerDown={onPointerDown ? event => onPointerDown(event, board) : undefined}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <meshStandardMaterial
          color={preview ? '#7dd3fc' : '#8f8576'}
          depthWrite={!preview}
          emissive={preview ? '#38bdf8' : '#000000'}
          emissiveIntensity={preview ? 0.18 : 0}
          metalness={0.02}
          opacity={preview ? 0.55 : 1}
          roughness={preview ? 0.62 : 0.84}
          transparent={preview}
        />
      </mesh>
    </group>
  )
}

function BoxelAssemblyMesh({
  assembly,
  candidateOnly = false,
  onMeshChange,
  onCellPointerDown,
  onPointerDown,
  preview = false,
  previewCell = null,
}: BoxelAssemblyMeshProps) {
  const cells = previewCell ? [...assembly.cells, previewCell] : assembly.cells

  return (
    <group
      ref={(object) => {
        onMeshChange(assembly.id, object)
      }}
      onPointerDown={onPointerDown ? event => onPointerDown(event, assembly) : undefined}
    >
      {cells.map((cell) => {
        const position = getBoxelCellWorldPosition(assembly, cell)

        return (
          <mesh
            key={`${assembly.id}-${cell.x}-${cell.y}-${cell.z}${previewCell === cell ? '-preview' : ''}`}
            castShadow={!preview}
            receiveShadow={!preview}
            position={[position.x, -position.y, position.z]}
            onPointerDown={onCellPointerDown ? event => onCellPointerDown(event, assembly, cell) : undefined}
          >
            <boxGeometry args={[assembly.cellSize, assembly.cellSize, assembly.cellSize]} />
            <meshStandardMaterial
              color={candidateOnly ? '#22c55e' : preview ? '#7dd3fc' : '#9f8e7b'}
              depthWrite={!preview}
              emissive={candidateOnly ? '#16a34a' : preview ? '#38bdf8' : '#000000'}
              emissiveIntensity={candidateOnly ? 0.28 : preview ? 0.16 : 0}
              metalness={0.03}
              opacity={preview ? 0.45 : 1}
              roughness={preview ? 0.58 : 0.86}
              transparent={preview}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function JointCandidateBars({ assembly }: JointCandidateBarProps) {
  const candidates = getAssemblyJointCandidates(assembly)

  return candidates.map((candidate, index) => {
    const from = getBoxelCellWorldPosition(assembly, candidate.from)
    const to = getBoxelCellWorldPosition(assembly, candidate.to)
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const midZ = (from.z + to.z) / 2
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    const angle = Math.atan2(-(to.y - from.y), to.x - from.x)

    return (
      <mesh
        key={`${assembly.id}-joint-${index}`}
        position={[midX, -midY, midZ]}
        rotation={[0, 0, angle]}
      >
        <boxGeometry args={[Math.max(12, length - assembly.cellSize * 0.55), 4, 4]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.85} />
      </mesh>
    )
  })
}

function Scene({
  assemblyObjectsRef,
  boardGroupRef,
  boardToGroupRef,
  boxelModeEnabled = false,
  boxelRemoveModeEnabled = false,
  createBoardDraft,
  createBoardModeEnabled = false,
  document,
  groupCounterRef,
  latestDocumentRef,
  onBoardEditRequest,
  selection,
  onSelectionChange,
  onCreateBoardDraftChange,
  onDocumentChange,
  onGroupStateChange,
  controlsRef,
  initialCameraFraming,
  isCameraPanModifierPressed,
  isCreateBoardAngleSnapDisabled,
  resolvedTheme,
}: SceneProps) {
  const { camera, gl } = useThree()
  const boardObjectsRef = useRef(new Map<string, THREE.Object3D>())
  const createCursorRingRef = useRef<THREE.Mesh | null>(null)
  const createCursorSphereRef = useRef<THREE.Mesh | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const dragMovedRef = useRef(false)
  const gridCursorPositionRef = useRef(new THREE.Vector2(0, 0))
  const raycasterRef = useRef(new THREE.Raycaster())
  const selectedObjectsRef = useRef<THREE.Object3D[]>([])
  const [boxelPreview, setBoxelPreview] = useState<BoxelPreviewState | null>(null)
  const [createCursorPosition, setCreateCursorPosition] = useState<CreateCursorPosition>({
    x: 0,
    y: 0,
  })
  const [dragConnectionPreview, setDragConnectionPreview] = useState<DragConnectionPreview | null>(null)
  const isBoxelEditModeActive = boxelModeEnabled || boxelRemoveModeEnabled
  const isCreateModeActive = createBoardModeEnabled || isBoxelEditModeActive
  const workspaceBounds = useMemo(() => getBoardWorkspaceBounds(document), [document])
  const groundPlaneSize = Math.max(workspaceBounds.maxDimension * 6, 2400)
  const createPreviewBoards = useMemo(() => {
    if (!createBoardDraft) {
      return []
    }

    const length = getCreateBoardSpanLength(
      createBoardDraft.start,
      createBoardDraft.end,
    )

    if (length < MIN_CREATE_BOARD_SPAN) {
      return []
    }

    return [
      createStandingBoardPreview({
        start: toDocumentPoint(createBoardDraft.start),
        end: toDocumentPoint(createBoardDraft.end),
      }),
    ]
  }, [createBoardDraft])
  const previewAssembly = useMemo(() => {
    if (!boxelPreview) {
      return null
    }

    const existingAssembly = boxelPreview.assemblyId
      ? document.assemblies.find(assembly => assembly.id === boxelPreview.assemblyId) ?? null
      : null

    if (existingAssembly) {
      return {
        assembly: existingAssembly,
        previewCell: boxelPreview.previewCell,
      }
    }

    return {
      assembly: {
        id: 'boxel-preview',
        name: 'Boxel preview',
        cellSize: CREATE_BOARD_GRID_SIZE,
        origin: {
          x: boxelPreview.column.x,
          y: boxelPreview.column.y,
        },
        cells: [],
      },
      previewCell: boxelPreview.previewCell,
    }
  }, [boxelPreview, document.assemblies])

  const syncCreateCursor = useCallback((point: THREE.Vector3) => {
    if (createCursorSphereRef.current) {
      createCursorSphereRef.current.position.set(point.x, point.y, 4)
    }

    if (createCursorRingRef.current) {
      createCursorRingRef.current.position.set(point.x, point.y, 0.5)
    }
    setCreateCursorPosition({
      x: point.x,
      y: point.y,
    })
  }, [])

  const getBoardGroup = useCallback((boardId: string) => {
    const groupId = boardToGroupRef.current.get(boardId)
    if (!groupId) {
      return null
    }

    return boardGroupRef.current.get(groupId) ?? null
  }, [boardGroupRef, boardToGroupRef])

  const registerBoardGroup = useCallback((record: BoardGroupRecord) => {
    boardGroupRef.current.set(record.id, record)

    for (const boardId of record.boardIds) {
      boardToGroupRef.current.set(boardId, record.id)
    }
  }, [boardGroupRef, boardToGroupRef])

  function getPlaneIntersectionFromRay(ray: THREE.Ray) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const point = new THREE.Vector3()
    const hit = ray.intersectPlane(plane, point)

    if (!hit) {
      return null
    }

    return point
  }

  function getPlaneIntersection(event: ThreeEvent<PointerEvent>) {
    return getPlaneIntersectionFromRay(event.ray)
  }

  const finishBoardDrag = useCallback(() => {
    const dragState = dragStateRef.current
    if (dragState?.pendingConnection) {
      const groupId = `group-${groupCounterRef.current + 1}`
      groupCounterRef.current += 1
      const geometrySnapshots = latestDocumentRef.current.boards
        .filter(board =>
          board.id === dragState.movingBoardId
          || board.id === dragState.pendingConnection?.boardId,
        )
        .map(snapshotBoardGeometry)
      const connectedDocument = applyBoardMoveConnection(
        latestDocumentRef.current,
        dragState.movingBoardId,
        dragState.pendingConnection,
      )

      registerBoardGroup({
        boardIds: [
          dragState.movingBoardId,
          dragState.pendingConnection.boardId,
        ],
        geometrySnapshots,
        id: groupId,
      })
      onGroupStateChange(groupId)

      onDocumentChange(
        updateDocumentTimestamp(
          connectedDocument,
        ),
      )
    }

    dragStateRef.current = null
    setDragConnectionPreview(null)

    const controls = controlsRef.current
    if (controls) {
      controls.enabled = true
    }
  }, [
    controlsRef,
    groupCounterRef,
    latestDocumentRef,
    onDocumentChange,
    onGroupStateChange,
    registerBoardGroup,
  ])

  const getSnappedCreatePoint = useCallback((point: THREE.Vector3) => {
    const gridPoint = snapPointToGrid(getCreateBoardPlanePoint(point))
    return (!createBoardDraft || isCreateBoardAngleSnapDisabled)
      ? gridPoint
      : snapPointTo45Degrees(createBoardDraft.start, gridPoint)
  }, [createBoardDraft, isCreateBoardAngleSnapDisabled])

  const syncSelectedObjects = useCallback(() => {
    selectedObjectsRef.current.length = 0

    for (const boardId of selection.selectedBoardIds) {
      const object = boardObjectsRef.current.get(boardId)
      if (object) {
        selectedObjectsRef.current.push(object)
      }
    }

    for (const assemblyId of selection.selectedAssemblyIds) {
      const object = assemblyObjectsRef.current.get(assemblyId)
      if (object) {
        selectedObjectsRef.current.push(object)
      }
    }
  }, [assemblyObjectsRef, selection.selectedAssemblyIds, selection.selectedBoardIds])

  useEffect(() => {
    syncSelectedObjects()
  }, [syncSelectedObjects])

  const handleMeshChange = useCallback(
    (boardId: string, object: THREE.Object3D | null) => {
      if (object) {
        boardObjectsRef.current.set(boardId, object)
      } else {
        boardObjectsRef.current.delete(boardId)
      }

      syncSelectedObjects()
    },
    [syncSelectedObjects],
  )

  const handleAssemblyMeshChange = useCallback(
    (assemblyId: string, object: THREE.Object3D | null) => {
      if (object) {
        assemblyObjectsRef.current.set(assemblyId, object)
      } else {
        assemblyObjectsRef.current.delete(assemblyId)
      }

      syncSelectedObjects()
    },
    [assemblyObjectsRef, syncSelectedObjects],
  )

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)

      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
      const planePoint = getPlaneIntersectionFromRay(raycasterRef.current.ray)
      if (planePoint) {
        gridCursorPositionRef.current.set(planePoint.x, planePoint.y)
        const snappedPoint = getSnappedCreatePoint(planePoint)
        syncCreateCursor(snappedPoint)

        if (boxelModeEnabled) {
          const matchingAssembly = latestDocumentRef.current.assemblies.find(assembly =>
            assembly.origin.x === snappedPoint.x && assembly.origin.y === -snappedPoint.y,
          ) ?? null
          const nextZ = matchingAssembly
            ? getBoxelColumnHeight(matchingAssembly, { x: 0, y: 0 })
            : 0

          setBoxelPreview({
            assemblyId: matchingAssembly?.id ?? null,
            column: {
              x: snappedPoint.x,
              y: -snappedPoint.y,
            },
            previewCell: {
              x: 0,
              y: 0,
              z: nextZ,
            },
          })
        } else if (boxelRemoveModeEnabled) {
          setBoxelPreview(null)
        }
      }

      const dragState = dragStateRef.current
      if (!dragState) {
        return
      }
      if (!planePoint) {
        return
      }

      const deltaX = planePoint.x - dragState.startPoint.x
      const deltaY = -(planePoint.y - dragState.startPoint.y)
      if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
        dragMovedRef.current = true
      }
      const movedDocument = moveBoardsByDelta(
        dragState.document,
        dragState.selectedBoardIds,
        {
          x: deltaX,
          y: deltaY,
        },
      )
      let nextDocument = movedDocument

      if (dragState.selectedBoardIds.length === 1) {
        const nextConnection = findBoardMoveConnection(
          movedDocument,
          dragState.movingBoardId,
        )
        const connection = nextConnection && !getBoardGroup(nextConnection.boardId)
          ? nextConnection
          : null

        dragState.pendingConnection = connection

        if (connection) {
          nextDocument = moveBoardsByDelta(movedDocument, dragState.selectedBoardIds, connection.offset)
          const preview = buildBoardMoveConnectionPreview(
            nextDocument,
            dragState.movingBoardId,
            connection,
          )
          const lineDirection = connection.anchor === 'start'
            ? { x: -1, y: 0 }
            : { x: 1, y: 0 }
          setDragConnectionPreview({
            boards: preview.boards,
            lineEnd: {
              x: preview.point.x + lineDirection.x * 54,
              y: -(preview.point.y + lineDirection.y * 0),
            },
            lineStart: {
              x: preview.point.x - lineDirection.x * 54,
              y: -(preview.point.y - lineDirection.y * 0),
            },
            point: {
              x: preview.point.x,
              y: -preview.point.y,
            },
          })
        } else {
          setDragConnectionPreview(null)
        }
      } else {
        dragState.pendingConnection = null
        setDragConnectionPreview(null)
      }

      onDocumentChange(
        updateDocumentTimestamp(nextDocument),
      )
    }

    const handleWindowPointerUp = () => {
      finishBoardDrag()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [boxelModeEnabled, boxelRemoveModeEnabled, camera, finishBoardDrag, getBoardGroup, getSnappedCreatePoint, gl, latestDocumentRef, onDocumentChange, syncCreateCursor])

  function handleBoardPointerDown(event: ThreeEvent<PointerEvent>, board: Board) {
    if (isCreateModeActive) {
      return
    }

    if (isCameraPanModifierPressed) {
      return
    }

    event.stopPropagation()
    dragMovedRef.current = false

    const planePoint = getPlaneIntersection(event)
    if (!planePoint) {
      return
    }

    const boardGroup = getBoardGroup(board.id)
    const dragDocument = document
    let selectedBoardIds = [board.id]

    if (boardGroup) {
      selectedBoardIds = boardGroup.boardIds
    }
    onGroupStateChange(boardGroup?.id ?? '')

    const isSelected = selection.selectedBoardIds.includes(board.id)
    const nextSelection = selectedBoardIds.length > 1
      ? {
          activeAssemblyId: '',
          activeBoardId: board.id,
          selectedAssemblyIds: [],
          selectedBoardIds,
        }
      : isSelected
        ? selection
        : selectSingleBoard(board.id)
    const shouldUpdateSelection
      = nextSelection.activeBoardId !== selection.activeBoardId
        || nextSelection.selectedBoardIds.length !== selection.selectedBoardIds.length
        || nextSelection.selectedBoardIds.some((boardId, index) =>
          boardId !== selection.selectedBoardIds[index],
        )

    if (shouldUpdateSelection) {
      onSelectionChange(nextSelection)
    }

    dragStateRef.current = {
      document: dragDocument,
      movingBoardId: board.id,
      pendingConnection: null,
      selectedBoardIds: nextSelection.selectedBoardIds,
      startPoint: planePoint.clone(),
    }

    const controls = controlsRef.current
    if (controls) {
      controls.enabled = false
    }
  }

  function handleBoardPointerMove(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
  }

  function handleBoardPointerUp(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    finishBoardDrag()
  }

  function handleBoardDoubleClick(event: ThreeEvent<MouseEvent>, board: Board) {
    if (isCreateModeActive || isCameraPanModifierPressed || dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }

    event.stopPropagation()
    onBoardEditRequest?.(board.id)
  }

  function handleCreateBoardPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!isCreateModeActive) {
      return
    }

    event.stopPropagation()

    const nextPoint = getSnappedCreatePoint(event.point)
    syncCreateCursor(nextPoint)
    gridCursorPositionRef.current.set(nextPoint.x, nextPoint.y)

    if (isBoxelEditModeActive || !createBoardDraft) {
      return
    }

    onCreateBoardDraftChange({
      ...createBoardDraft,
      end: nextPoint,
    })
  }

  function handleCreateBoardPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!isCreateModeActive || isCameraPanModifierPressed) {
      return
    }

    event.stopPropagation()

    const nextPoint = getSnappedCreatePoint(event.point)
    syncCreateCursor(nextPoint)
    gridCursorPositionRef.current.set(nextPoint.x, nextPoint.y)

    if (boxelModeEnabled) {
      const result = commitBoxelAtColumn(document, {
        x: nextPoint.x,
        y: -nextPoint.y,
      })

      onDocumentChange(result.document)
      onSelectionChange(result.selection)
      return
    }

    if (boxelRemoveModeEnabled) {
      return
    }

    if (!createBoardDraft) {
      onCreateBoardDraftChange({
        start: nextPoint,
        end: nextPoint,
      })
      return
    }

    const spanLength = getCreateBoardSpanLength(createBoardDraft.start, nextPoint)
    if (spanLength < MIN_CREATE_BOARD_SPAN) {
      onCreateBoardDraftChange(null)
      return
    }

    const nextBoard = commitStandingBoardFromSpan({
      start: toDocumentPoint(createBoardDraft.start),
      end: toDocumentPoint(nextPoint),
    })
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: [...document.boards, nextBoard],
    })

    onDocumentChange(nextDocument)
    onSelectionChange(selectSingleBoard(nextBoard.id))
    onCreateBoardDraftChange(null)
  }

  function handleAssemblyPointerDown(event: ThreeEvent<PointerEvent>, assembly: BoxelAssembly) {
    if (isCreateModeActive || isCameraPanModifierPressed) {
      return
    }

    event.stopPropagation()

    if (event.metaKey || event.ctrlKey) {
      onSelectionChange(toggleAssemblySelection(selection, assembly.id))
      return
    }

    onSelectionChange(selectSingleAssembly(assembly.id))
  }

  function handleAssemblyCellPointerDown(
    event: ThreeEvent<PointerEvent>,
    assembly: BoxelAssembly,
    cell: {
      x: number
      y: number
      z: number
    },
  ) {
    if (!boxelRemoveModeEnabled || isCameraPanModifierPressed) {
      return
    }

    event.stopPropagation()
    const result = removeBoxelFromAssembly(document, assembly.id, cell)
    if (!result.removed) {
      return
    }

    onDocumentChange(result.document)
    onSelectionChange(result.selection)
  }

  return (
    <>
      <color attach="background" args={[resolvedTheme === 'dark' ? '#0f131a' : '#ddd4c1']} />
      <WebGPUGrid cursorPositionRef={gridCursorPositionRef} resolvedTheme={resolvedTheme} />
      <SelectionOutline selectedObjectsRef={selectedObjectsRef} />
      <PatternStudioLights resolvedTheme={resolvedTheme} />
      {isCreateModeActive
        ? (
          <>
            <mesh
              position={[0, 0, 0]}
              onPointerDown={handleCreateBoardPointerDown}
              onPointerMove={handleCreateBoardPointerMove}
            >
              <planeGeometry args={[groundPlaneSize, groundPlaneSize]} />
              <meshBasicMaterial opacity={0} transparent />
            </mesh>
            <mesh
              ref={createCursorSphereRef}
              position={[createCursorPosition.x, createCursorPosition.y, 4]}>
              <sphereGeometry args={[5, 24, 24]} />
              <meshBasicMaterial color="#60a5fa" depthWrite={false} transparent opacity={0.95} />
            </mesh>
            <mesh
              ref={createCursorRingRef}
              position={[createCursorPosition.x, createCursorPosition.y, 0.5]}>
              <ringGeometry args={[10, 18, 40]} />
              <meshBasicMaterial color="#60a5fa" depthWrite={false} side={THREE.DoubleSide} transparent opacity={0.45} />
            </mesh>
          </>
        )
        : null}
      {document.boards.map((board) => (
        <BoardMesh
          key={board.id}
          board={board}
          onMeshChange={handleMeshChange}
          onDoubleClick={isCreateModeActive ? undefined : handleBoardDoubleClick}
          onPointerDown={isCreateModeActive ? undefined : handleBoardPointerDown}
          onPointerMove={isCreateModeActive ? undefined : handleBoardPointerMove}
          onPointerUp={isCreateModeActive ? undefined : handleBoardPointerUp}
        />
      ))}
      {document.assemblies.map((assembly) => (
        <group key={assembly.id}>
          <BoxelAssemblyMesh
            assembly={assembly}
            onCellPointerDown={boxelRemoveModeEnabled ? handleAssemblyCellPointerDown : undefined}
            onMeshChange={handleAssemblyMeshChange}
            onPointerDown={isCreateModeActive ? undefined : handleAssemblyPointerDown}
          />
          {selection.selectedAssemblyIds.includes(assembly.id)
            ? <JointCandidateBars assembly={assembly} />
            : null}
        </group>
      ))}
      {dragConnectionPreview
        ? (
          <>
            {dragConnectionPreview.boards.map((previewBoard) => (
              <BoardMesh
                key={`drag-connection-preview-${previewBoard.id}`}
                board={previewBoard}
                onMeshChange={() => { }}
                preview
              />
            ))}
            <mesh
              position={[
                (dragConnectionPreview.lineStart.x + dragConnectionPreview.lineEnd.x) / 2,
                (dragConnectionPreview.lineStart.y + dragConnectionPreview.lineEnd.y) / 2,
                1,
              ]}
              rotation={[
                0,
                0,
                Math.atan2(
                  dragConnectionPreview.lineEnd.y - dragConnectionPreview.lineStart.y,
                  dragConnectionPreview.lineEnd.x - dragConnectionPreview.lineStart.x,
                ),
              ]}
            >
              <boxGeometry
                args={[
                  Math.hypot(
                    dragConnectionPreview.lineEnd.x - dragConnectionPreview.lineStart.x,
                    dragConnectionPreview.lineEnd.y - dragConnectionPreview.lineStart.y,
                  ),
                  4,
                  1,
                ]}
              />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
            </mesh>
            <mesh position={[dragConnectionPreview.point.x, dragConnectionPreview.point.y, 6]}>
              <sphereGeometry args={[7, 24, 24]} />
              <meshBasicMaterial color="#22c55e" depthWrite={false} transparent opacity={0.95} />
            </mesh>
            <mesh position={[dragConnectionPreview.point.x, dragConnectionPreview.point.y, 0.5]}>
              <ringGeometry args={[14, 24, 40]} />
              <meshBasicMaterial color="#22c55e" depthWrite={false} side={THREE.DoubleSide} transparent opacity={0.42} />
            </mesh>
          </>
        )
        : null}
      {createPreviewBoards.length > 0
        ? createPreviewBoards.map((previewBoard, index) => (
          <BoardMesh
            key={`draft-board-preview-${index}`}
            board={previewBoard}
            onMeshChange={() => { }}
            preview
          />
        ))
        : null}
      {boxelModeEnabled && previewAssembly
        ? (
          <BoxelAssemblyMesh
            assembly={previewAssembly.assembly}
            onMeshChange={() => { }}
            preview
            previewCell={previewAssembly.previewCell}
          />
        )
        : null}
      <PerspectiveCamera
        fov={50}
        makeDefault
        near={initialCameraFraming.near}
        far={initialCameraFraming.far}
        position={initialCameraFraming.position.toArray()}
        up={[0, 0, 1]}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        makeDefault
        maxDistance={4200}
        minDistance={80}
        mouseButtons={{
          LEFT: isCameraPanModifierPressed ? THREE.MOUSE.PAN : undefined,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        screenSpacePanning
        target={initialCameraFraming.target.toArray()}
      />
    </>
  )
}

export function BoardPreview3D({
  boxelModeEnabled = false,
  boxelRemoveModeEnabled = false,
  createBoardModeEnabled = false,
  document,
  selection,
  onBoardEditRequest,
  onSelectionChange,
  onDocumentChange,
  canvasClassName,
}: BoardPreview3DProps) {
  const { resolvedTheme } = useTheme()
  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null)
  const assemblyObjectsRef = useRef(new Map<string, THREE.Object3D>())
  const boardGroupRef = useRef(new Map<string, BoardGroupRecord>())
  const boardToGroupRef = useRef(new Map<string, string>())
  const latestDocumentRef = useRef(document)
  const groupCounterRef = useRef(0)
  const [initialCameraFraming] = useState(() =>
    getCameraFraming(getBoardWorkspaceBounds(document)),
  )
  const [createBoardDraft, setCreateBoardDraft] = useState<CreateBoardDraft | null>(null)
  const [isCameraPanModifierPressed, setIsCameraPanModifierPressed] = useState(false)
  const [isCreateBoardAngleSnapDisabled, setIsCreateBoardAngleSnapDisabled] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState('')
  const wrapperClassName = resolvedTheme === 'dark'
    ? 'relative h-full min-h-0 overflow-hidden border border-border bg-[linear-gradient(180deg,oklch(0.2_0.012_255),oklch(0.12_0.012_255))]'
    : 'relative h-full min-h-0 overflow-hidden border border-border bg-[linear-gradient(180deg,oklch(0.91_0.02_85),oklch(0.82_0.025_80))]'

  useEffect(() => {
    latestDocumentRef.current = document
  }, [document])

  function resetCamera() {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    controls.reset()
    controls.update()
  }

  function handleUngroup() {
    if (!activeGroupId) {
      return
    }

    const group = boardGroupRef.current.get(activeGroupId)
    if (!group) {
      setActiveGroupId('')
      return
    }

    const restoredDocument = restoreBoardGeometry(
      latestDocumentRef.current,
      group.geometrySnapshots,
    )

    for (const boardId of group.boardIds) {
      boardToGroupRef.current.delete(boardId)
    }

    boardGroupRef.current.delete(activeGroupId)
    setActiveGroupId('')
    onDocumentChange(updateDocumentTimestamp(restoredDocument))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsCameraPanModifierPressed(true)
      }

      if (!createBoardModeEnabled) {
        if (boxelModeEnabled && event.key === 'Escape') {
          return
        }

        return
      }

      if (event.key === 'Shift') {
        setIsCreateBoardAngleSnapDisabled(true)
      }

      if (event.key === 'Escape') {
        setCreateBoardDraft(null)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsCameraPanModifierPressed(false)
      }

      if (event.key === 'Shift') {
        setIsCreateBoardAngleSnapDisabled(false)
      }
    }

    const handleWindowBlur = () => {
      setIsCameraPanModifierPressed(false)
      setIsCreateBoardAngleSnapDisabled(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [boxelModeEnabled, createBoardModeEnabled])

  return (
    <div className={wrapperClassName}>
      <div className={canvasClassName ?? 'h-[380px]'}>
        <Canvas
          dpr={[1, 1.5]}
          gl={async (props) => {
            const rendererParameters: WebGPUCanvasRendererParameters = {
              alpha: props.alpha,
              antialias: props.antialias,
              depth: props.depth,
              stencil: props.stencil,
            }

            if (props.canvas instanceof HTMLCanvasElement) {
              rendererParameters.canvas = props.canvas
            } else if ('OffscreenCanvas' in globalThis && props.canvas instanceof OffscreenCanvas) {
              rendererParameters.canvas = props.canvas
            }

            const renderer = new THREE.WebGPURenderer(rendererParameters)
            renderer.toneMapping = THREE.ACESFilmicToneMapping
            renderer.toneMappingExposure = 0.9
            await renderer.init()
            return renderer
          }}
          shadows={{
            enabled: true,
            type: THREE.PCFShadowMap,
          }}
        >
          <Scene
            assemblyObjectsRef={assemblyObjectsRef}
            boardGroupRef={boardGroupRef}
            boardToGroupRef={boardToGroupRef}
            boxelModeEnabled={boxelModeEnabled}
            boxelRemoveModeEnabled={boxelRemoveModeEnabled}
            createBoardDraft={createBoardDraft}
            createBoardModeEnabled={createBoardModeEnabled}
            document={document}
            groupCounterRef={groupCounterRef}
            latestDocumentRef={latestDocumentRef}
            onBoardEditRequest={onBoardEditRequest}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onCreateBoardDraftChange={setCreateBoardDraft}
            onDocumentChange={onDocumentChange}
            onGroupStateChange={setActiveGroupId}
            controlsRef={controlsRef}
            initialCameraFraming={initialCameraFraming}
            isCameraPanModifierPressed={isCameraPanModifierPressed}
            isCreateBoardAngleSnapDisabled={isCreateBoardAngleSnapDisabled}
            resolvedTheme={resolvedTheme}
          />
        </Canvas>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 border border-border/60 bg-background/72 px-2 py-1 text-[10px] font-medium tracking-[0.01em] text-foreground/72 backdrop-blur-md">
        {boxelRemoveModeEnabled
          ? (
            <>
              <span>Click boxel to remove</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Green bars show joint candidates</span>
            </>
          )
          : boxelModeEnabled
          ? (
            <>
              <span>Click to add boxel</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Click same column to stack upward</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Green bars show joint candidates</span>
            </>
          )
          : createBoardModeEnabled
          ? (
            <>
              <span>Click to start</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Click to commit</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Shift free angle</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Esc cancel</span>
            </>
          )
          : (
            <>
              <span>Drag board</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Space drag to pan</span>
              <span className="mx-1.5 text-foreground/35">/</span>
              <span>Scroll to zoom</span>
            </>
          )}
      </div>
      <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2">
        {activeGroupId
          ? (
            <Button
              variant="outline"
              size="sm"
              className="pointer-events-auto h-8 border-border/70 bg-background/80 px-3 text-[11px] shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-md"
              onClick={handleUngroup}
            >
              Ungroup
            </Button>
          )
          : null}
        <Button
          variant="outline"
          size="sm"
          className="pointer-events-auto h-8 border-border/70 bg-background/80 px-3 text-[11px] shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-md"
          onClick={resetCamera}
        >
          Reset camera
        </Button>
      </div>
    </div>
  )
}
