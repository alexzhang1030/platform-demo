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
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'

import { useTheme } from '@/components/theme-provider'
import {
  mapBoardColor,
  moveBoardsByDelta,
  selectSingleBoard,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'
import { PatternStudioLights } from './pattern-studio-lights'
import { SelectionOutline } from './selection-outline'
import { WebGPUGrid } from './webgpu-grid'

interface BoardPreview3DProps {
  document: PatternDocument
  selection: EditorSelectionState
  onSelectionChange: (selection: EditorSelectionState) => void
  onDocumentChange: (document: PatternDocument) => void
  canvasClassName?: string
}

interface BoardMeshProps {
  board: Board
  color: string
  isSelected: boolean
  onMeshChange: (boardId: string, object: THREE.Object3D | null) => void
  resolvedTheme: 'dark' | 'light'
  onPointerDown: (event: ThreeEvent<PointerEvent>, board: Board) => void
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void
}

interface SceneProps extends BoardPreview3DProps {
  controlsRef: React.RefObject<ElementRef<typeof OrbitControls> | null>
  resolvedTheme: 'dark' | 'light'
}

interface DragState {
  document: PatternDocument
  selectedBoardIds: string[]
  startPoint: THREE.Vector3
}

interface WebGPUCanvasRendererParameters {
  alpha?: boolean
  antialias?: boolean
  canvas?: HTMLCanvasElement | OffscreenCanvas
  depth?: boolean
  stencil?: boolean
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
  color,
  isSelected,
  onMeshChange,
  resolvedTheme,
  onPointerDown,
  onPointerMove,
  onPointerUp,
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

  const materialColor = isSelected
    ? resolvedTheme === 'dark'
      ? `color-mix(in oklch, ${color} 72%, white)`
      : `color-mix(in oklch, ${color} 78%, black)`
    : resolvedTheme === 'dark'
      ? `color-mix(in oklch, ${color} 58%, black)`
      : `color-mix(in oklch, ${color} 72%, black)`

  return (
    <mesh
      castShadow
      receiveShadow
      ref={(object) => {
        onMeshChange(board.id, object)
      }}
      geometry={geometry}
      position={[board.transform.x, -board.transform.y, 0]}
      rotation={[0, 0, (-board.transform.rotation * Math.PI) / 180]}
      onPointerDown={event => onPointerDown(event, board)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <meshStandardMaterial
        color={materialColor}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? resolvedTheme === 'dark' ? 0.12 : 0.08 : 0}
        metalness={0.02}
        roughness={0.84}
      />
    </mesh>
  )
}

function Scene({
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  controlsRef,
  resolvedTheme,
}: SceneProps) {
  const { camera, gl } = useThree()
  const boardObjectsRef = useRef(new Map<string, THREE.Object3D>())
  const dragStateRef = useRef<DragState | null>(null)
  const gridCursorPositionRef = useRef(new THREE.Vector2(0, 0))
  const raycasterRef = useRef(new THREE.Raycaster())
  const selectedObjectsRef = useRef<THREE.Object3D[]>([])

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
    const handleWindowPointerMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)

      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
      const planePoint = getPlaneIntersectionFromRay(raycasterRef.current.ray)
      if (planePoint) {
        gridCursorPositionRef.current.set(planePoint.x, planePoint.y)
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
  }, [camera, finishBoardDrag, gl, onDocumentChange])

  function handleBoardPointerDown(event: ThreeEvent<PointerEvent>, board: Board) {
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

  return (
    <>
      <color attach="background" args={[resolvedTheme === 'dark' ? '#0f131a' : '#ddd4c1']} />
      <WebGPUGrid cursorPositionRef={gridCursorPositionRef} resolvedTheme={resolvedTheme} />
      <SelectionOutline selectedObjectsRef={selectedObjectsRef} />
      <PatternStudioLights resolvedTheme={resolvedTheme} />
      {document.boards.map((board, index) => (
        <BoardMesh
          key={board.id}
          board={board}
          color={mapBoardColor(index)}
          isSelected={selection.selectedBoardIds.includes(board.id)}
          onMeshChange={handleMeshChange}
          resolvedTheme={resolvedTheme}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
        />
      ))}
      <PerspectiveCamera fov={60} makeDefault position={[520, -520, 360]} up={[0, 0, 1]} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        makeDefault
        maxDistance={4200}
        minDistance={80}
        screenSpacePanning
      />
    </>
  )
}

export function BoardPreview3D({
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  canvasClassName,
}: BoardPreview3DProps) {
  const { resolvedTheme } = useTheme()
  const controlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null)
  const wrapperClassName = resolvedTheme === 'dark'
    ? 'relative h-full min-h-0 overflow-hidden border border-border bg-[linear-gradient(180deg,oklch(0.2_0.012_255),oklch(0.12_0.012_255))]'
    : 'relative h-full min-h-0 overflow-hidden border border-border bg-[linear-gradient(180deg,oklch(0.91_0.02_85),oklch(0.82_0.025_80))]'

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
            document={document}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onDocumentChange={onDocumentChange}
            controlsRef={controlsRef}
            resolvedTheme={resolvedTheme}
          />
        </Canvas>
      </div>
    </div>
  )
}
