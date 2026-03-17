import type { ThreeEvent } from '@react-three/fiber'
import type { Board, ControlPoint, PatternDocument } from '@xtool-demo/protocol'
import type { ElementRef } from 'react'
import type { EditorSelectionState } from '@/lib/pattern-studio'
import {
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { sampleShapePoints } from '@xtool-demo/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'

import { useTheme } from '@/components/theme-provider'
import {
  createBoardFromSpan,
  moveBoardsByDelta,
  selectSingleBoard,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'
import { clamp } from '@/lib/utils'
import { PatternStudioLights } from './pattern-studio-lights'
import { SelectionOutline } from './selection-outline'
import { WebGPUGrid } from './webgpu-grid'

interface BoardPreview3DProps {
  createBoardModeEnabled?: boolean
  document: PatternDocument
  selection: EditorSelectionState
  onSelectionChange: (selection: EditorSelectionState) => void
  onDocumentChange: (document: PatternDocument) => void
  canvasClassName?: string
}

interface BoardMeshProps {
  board: Board
  onMeshChange: (boardId: string, object: THREE.Object3D | null) => void
  onPointerDown?: (event: ThreeEvent<PointerEvent>, board: Board) => void
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  preview?: boolean
}

interface SceneProps extends BoardPreview3DProps {
  controlsRef: React.RefObject<ElementRef<typeof OrbitControls> | null>
  createBoardDraft: CreateBoardDraft | null
  isCameraPanModifierPressed: boolean
  isCreateBoardAngleSnapDisabled: boolean
  onCreateBoardDraftChange: (draft: CreateBoardDraft | null) => void
  resolvedTheme: 'dark' | 'light'
}

interface DragState {
  document: PatternDocument
  selectedBoardIds: string[]
  startPoint: THREE.Vector3
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

interface CreateBoardSpanMetrics {
  angle: number
  corner: THREE.Vector3
  length: number
}

const CREATE_BOARD_GRID_SIZE = 20
const CREATE_BOARD_DEFAULT_DEPTH = 120
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

function getCreateBoardSpanMetrics(
  start: THREE.Vector3,
  end: THREE.Vector3,
  depth = CREATE_BOARD_DEFAULT_DEPTH,
): CreateBoardSpanMetrics | null {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < MIN_CREATE_BOARD_SPAN) {
    return null
  }

  const directionX = deltaX / length
  const directionY = deltaY / length
  const perpendicularX = -directionY
  const perpendicularY = directionX

  return {
    angle: Math.atan2(deltaY, deltaX),
    corner: new THREE.Vector3(
      start.x - perpendicularX * (depth / 2),
      start.y - perpendicularY * (depth / 2),
      0,
    ),
    length,
  }
}

function getBoardWorkspaceBounds(document: PatternDocument): BoardWorkspaceBounds {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let maxZ = 0

  for (const board of document.boards) {
    const points = sampleShapePoints(board.outline)

    for (const point of points) {
      const rotated = new THREE.Vector2(point.x, point.y).rotateAround(
        new THREE.Vector2(0, 0),
        (board.transform.rotation * Math.PI) / 180,
      )
      const worldX = rotated.x + board.transform.x
      const worldY = rotated.y + board.transform.y

      minX = Math.min(minX, worldX)
      maxX = Math.max(maxX, worldX)
      minY = Math.min(minY, worldY)
      maxY = Math.max(maxY, worldY)
    }

    maxZ = Math.max(maxZ, board.thickness)
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

function toBoardShape(points: ControlPoint[]) {
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

function BoardMesh({
  board,
  onMeshChange,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  preview = false,
}: BoardMeshProps) {
  const geometry = useMemo(() => {
    const shape = toBoardShape(sampleShapePoints(board.outline))
    const nextGeometry = new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: false,
      depth: board.thickness,
      steps: 1,
    })
    const indexCount = nextGeometry.index?.count
    if (typeof indexCount === 'number' && Number.isFinite(indexCount)) {
      nextGeometry.setDrawRange(0, indexCount)
    }
    nextGeometry.computeVertexNormals()
    return nextGeometry
  }, [board])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      castShadow={!preview}
      receiveShadow={!preview}
      ref={(object) => {
        onMeshChange(board.id, object)
      }}
      geometry={geometry}
      position={[board.transform.x, -board.transform.y, 0]}
      rotation={[0, 0, (-board.transform.rotation * Math.PI) / 180]}
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
  )
}

function Scene({
  createBoardDraft,
  createBoardModeEnabled = false,
  document,
  selection,
  onSelectionChange,
  onCreateBoardDraftChange,
  onDocumentChange,
  controlsRef,
  isCameraPanModifierPressed,
  isCreateBoardAngleSnapDisabled,
  resolvedTheme,
}: SceneProps) {
  const { camera, gl } = useThree()
  const boardObjectsRef = useRef(new Map<string, THREE.Object3D>())
  const createCursorRingRef = useRef<THREE.Mesh | null>(null)
  const createCursorSphereRef = useRef<THREE.Mesh | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const gridCursorPositionRef = useRef(new THREE.Vector2(0, 0))
  const createCursorPointRef = useRef(new THREE.Vector3(0, 0, 0))
  const raycasterRef = useRef(new THREE.Raycaster())
  const selectedObjectsRef = useRef<THREE.Object3D[]>([])
  const workspaceBounds = useMemo(() => getBoardWorkspaceBounds(document), [document])
  const cameraFraming = useMemo(() => getCameraFraming(workspaceBounds), [workspaceBounds])
  const groundPlaneSize = Math.max(workspaceBounds.maxDimension * 6, 2400)
  const createPreviewBoard = useMemo(() => {
    if (!createBoardDraft) {
      return null
    }

    const metrics = getCreateBoardSpanMetrics(
      createBoardDraft.start,
      createBoardDraft.end,
    )

    if (!metrics) {
      return null
    }

    return createBoardFromSpan({
      start: toDocumentPoint(createBoardDraft.start),
      end: toDocumentPoint(createBoardDraft.end),
    })
  }, [createBoardDraft])

  const syncCreateCursor = useCallback((point: THREE.Vector3) => {
    createCursorPointRef.current.copy(point)

    if (createCursorSphereRef.current) {
      createCursorSphereRef.current.position.set(point.x, point.y, 4)
    }

    if (createCursorRingRef.current) {
      createCursorRingRef.current.position.set(point.x, point.y, 0.5)
    }
  }, [])

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
    dragStateRef.current = null

    const controls = controlsRef.current
    if (controls) {
      controls.enabled = true
    }
  }, [controlsRef])

  const getSnappedCreatePoint = useCallback((point: THREE.Vector3) => {
    const gridPoint = snapPointToGrid(getCreateBoardPlanePoint(point))

    if (!createBoardDraft || isCreateBoardAngleSnapDisabled) {
      return gridPoint
    }

    return snapPointTo45Degrees(createBoardDraft.start, gridPoint)
  }, [createBoardDraft, isCreateBoardAngleSnapDisabled])

  const syncSelectedObjects = useCallback(() => {
    selectedObjectsRef.current.length = 0

    for (const boardId of selection.selectedBoardIds) {
      const object = boardObjectsRef.current.get(boardId)
      if (object) {
        selectedObjectsRef.current.push(object)
      }
    }
  }, [selection.selectedBoardIds])

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

  useEffect(() => {
    camera.position.copy(cameraFraming.position)
    camera.near = cameraFraming.near
    camera.far = cameraFraming.far
    camera.updateProjectionMatrix()

    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(cameraFraming.target)
      controls.update()
    }
  }, [camera, cameraFraming, controlsRef])

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)

      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
      const planePoint = getPlaneIntersectionFromRay(raycasterRef.current.ray)
      if (planePoint) {
        gridCursorPositionRef.current.set(planePoint.x, planePoint.y)
        syncCreateCursor(getSnappedCreatePoint(planePoint))
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

      onDocumentChange(
        updateDocumentTimestamp(
          moveBoardsByDelta(dragState.document, dragState.selectedBoardIds, {
            x: deltaX,
            y: deltaY,
          }),
        ),
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
  }, [camera, finishBoardDrag, getSnappedCreatePoint, gl, onDocumentChange, syncCreateCursor])

  function handleBoardPointerDown(event: ThreeEvent<PointerEvent>, board: Board) {
    if (createBoardModeEnabled) {
      return
    }

    if (isCameraPanModifierPressed) {
      return
    }

    event.stopPropagation()

    const planePoint = getPlaneIntersection(event)
    if (!planePoint) {
      return
    }

    const isSelected = selection.selectedBoardIds.includes(board.id)
    const nextSelection = isSelected
      ? selection
      : selectSingleBoard(board.id)

    if (!isSelected) {
      onSelectionChange(nextSelection)
    }

    dragStateRef.current = {
      document,
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

  function handleCreateBoardPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!createBoardModeEnabled) {
      return
    }

    event.stopPropagation()

    const nextPoint = getSnappedCreatePoint(event.point)
    syncCreateCursor(nextPoint)
    gridCursorPositionRef.current.set(nextPoint.x, nextPoint.y)

    if (!createBoardDraft) {
      return
    }

    onCreateBoardDraftChange({
      ...createBoardDraft,
      end: nextPoint,
    })
  }

  function handleCreateBoardPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!createBoardModeEnabled || isCameraPanModifierPressed) {
      return
    }

    event.stopPropagation()

    const nextPoint = getSnappedCreatePoint(event.point)
    syncCreateCursor(nextPoint)
    gridCursorPositionRef.current.set(nextPoint.x, nextPoint.y)

    if (!createBoardDraft) {
      onCreateBoardDraftChange({
        start: nextPoint,
        end: nextPoint,
      })
      return
    }

    const spanMetrics = getCreateBoardSpanMetrics(createBoardDraft.start, nextPoint)
    if (!spanMetrics) {
      onCreateBoardDraftChange(null)
      return
    }

    const nextBoard = createBoardFromSpan({
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

  return (
    <>
      <color attach="background" args={[resolvedTheme === 'dark' ? '#0f131a' : '#ddd4c1']} />
      <WebGPUGrid cursorPositionRef={gridCursorPositionRef} resolvedTheme={resolvedTheme} />
      <SelectionOutline selectedObjectsRef={selectedObjectsRef} />
      <PatternStudioLights resolvedTheme={resolvedTheme} />
      {createBoardModeEnabled
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
                position={[createCursorPointRef.current.x, createCursorPointRef.current.y, 4]}>
                <sphereGeometry args={[5, 24, 24]} />
                <meshBasicMaterial color="#60a5fa" depthWrite={false} transparent opacity={0.95} />
              </mesh>
              <mesh
                ref={createCursorRingRef}
                position={[createCursorPointRef.current.x, createCursorPointRef.current.y, 0.5]}>
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
          onPointerDown={createBoardModeEnabled ? undefined : handleBoardPointerDown}
          onPointerMove={createBoardModeEnabled ? undefined : handleBoardPointerMove}
          onPointerUp={createBoardModeEnabled ? undefined : handleBoardPointerUp}
        />
      ))}
      {createPreviewBoard
        ? (
            <BoardMesh
              key="draft-board-preview"
              board={createPreviewBoard}
              onMeshChange={() => {}}
              preview
            />
          )
        : null}
      <PerspectiveCamera
        fov={50}
        makeDefault
        near={cameraFraming.near}
        far={cameraFraming.far}
        position={cameraFraming.position.toArray()}
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
        target={cameraFraming.target.toArray()}
      />
    </>
  )
}

export function BoardPreview3D({
  createBoardModeEnabled = false,
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  canvasClassName,
}: BoardPreview3DProps) {
  const { resolvedTheme } = useTheme()
  const controlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null)
  const [createBoardDraft, setCreateBoardDraft] = useState<CreateBoardDraft | null>(null)
  const [isCameraPanModifierPressed, setIsCameraPanModifierPressed] = useState(false)
  const [isCreateBoardAngleSnapDisabled, setIsCreateBoardAngleSnapDisabled] = useState(false)
  const wrapperClassName = resolvedTheme === 'dark'
    ? 'relative h-full min-h-0 overflow-hidden border border-border bg-[linear-gradient(180deg,oklch(0.2_0.012_255),oklch(0.12_0.012_255))]'
    : 'relative h-full min-h-0 overflow-hidden border border-border bg-[linear-gradient(180deg,oklch(0.91_0.02_85),oklch(0.82_0.025_80))]'

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsCameraPanModifierPressed(true)
      }

      if (!createBoardModeEnabled) {
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
  }, [createBoardModeEnabled])

  useEffect(() => {
    if (!createBoardModeEnabled) {
      setCreateBoardDraft(null)
      setIsCreateBoardAngleSnapDisabled(false)
    }
  }, [createBoardModeEnabled])

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
            createBoardDraft={createBoardDraft}
            createBoardModeEnabled={createBoardModeEnabled}
            document={document}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onCreateBoardDraftChange={setCreateBoardDraft}
            onDocumentChange={onDocumentChange}
            controlsRef={controlsRef}
            isCameraPanModifierPressed={isCameraPanModifierPressed}
            isCreateBoardAngleSnapDisabled={isCreateBoardAngleSnapDisabled}
            resolvedTheme={resolvedTheme}
          />
        </Canvas>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 border border-border/60 bg-background/72 px-2 py-1 text-[10px] font-medium tracking-[0.01em] text-foreground/72 backdrop-blur-md">
        {createBoardModeEnabled
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
    </div>
  )
}
