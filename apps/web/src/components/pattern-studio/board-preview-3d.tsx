import type { CameraControls as CameraControlsImpl } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Board, ControlPoint, PatternDocument } from '@xtool-demo/protocol'
import type { EditorSelectionState } from '@/lib/pattern-studio'
import {
  CameraControls,
  Edges,
  GizmoHelper,
  GizmoViewport,
  Grid,
  PerspectiveCamera,
} from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { getDocumentBounds, sampleShapePoints } from '@xtool-demo/core'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  mapBoardColor,
  moveBoardsByDelta,
  selectSingleBoard,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'

interface BoardPreview3DProps {
  document: PatternDocument
  selection: EditorSelectionState
  onSelectionChange: (selection: EditorSelectionState) => void
  onDocumentChange: (document: PatternDocument) => void
  viewPreset?: CameraPreset
  canvasClassName?: string
}

type CameraPreset = 'front' | 'isometric' | 'side' | 'top'

interface CameraPose {
  position: [number, number, number]
  target: [number, number, number]
}

interface BoardMeshProps {
  board: Board
  color: string
  isSelected: boolean
  onPointerDown: (event: ThreeEvent<PointerEvent>, board: Board) => void
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void
}

interface SceneProps extends BoardPreview3DProps {
  controlsRef: React.RefObject<CameraControlsImpl | null>
}

interface DragState {
  document: PatternDocument
  selectedBoardIds: string[]
  startPoint: THREE.Vector3
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

function getBoardCenter(board: Board): [number, number, number] {
  const points = sampleShapePoints(board.outline)
  if (points.length === 0) {
    return [board.transform.x, -board.transform.y, board.thickness / 2]
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return [
    board.transform.x + (minX + maxX) / 2,
    -(board.transform.y + (minY + maxY) / 2),
    board.thickness / 2,
  ]
}

function getCameraPose(
  document: PatternDocument,
  activeBoardId: string,
  preset: CameraPreset,
): CameraPose {
  const bounds = getDocumentBounds(document)
  const selectedBoard = document.boards.find(board => board.id === activeBoardId)
  const maxSpan = Math.max(bounds.width, bounds.height, 240)
  const distance = maxSpan * 2.35
  const target = selectedBoard
    ? getBoardCenter(selectedBoard)
    : getDocumentCenter(bounds)

  if (preset === 'front') {
    return {
      position: [target[0], target[1] - distance, target[2] + distance * 0.34],
      target,
    }
  }

  if (preset === 'side') {
    return {
      position: [target[0] + distance, target[1], target[2] + distance * 0.26],
      target,
    }
  }

  if (preset === 'top') {
    return {
      position: [target[0], target[1], target[2] + distance * 1.62],
      target,
    }
  }

  return {
    position: [target[0] + distance * 1.02, target[1] - distance * 0.96, target[2] + distance * 0.74],
    target,
  }
}

function getDocumentCenter(bounds: ReturnType<typeof getDocumentBounds>): [number, number, number] {
  return [
    bounds.minX + bounds.width / 2,
    -(bounds.minY + bounds.height / 2),
    0,
  ]
}

function BoardMesh({
  board,
  color,
  isSelected,
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
    nextGeometry.computeVertexNormals()
    return nextGeometry
  }, [board])

  useEffect(() => () => geometry.dispose(), [geometry])

  const materialColor = isSelected
    ? `color-mix(in oklch, ${color} 76%, white)`
    : `color-mix(in oklch, ${color} 54%, white)`

  return (
    <mesh
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
        emissiveIntensity={isSelected ? 0.34 : 0}
        metalness={0.05}
        roughness={0.68}
      />
      {isSelected
        ? (
            <Edges
              color="#111111"
              scale={1.008}
              threshold={24}
            />
          )
        : null}
    </mesh>
  )
}

function Scene({
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  controlsRef,
}: SceneProps) {
  const { camera, gl } = useThree()
  const dragStateRef = useRef<DragState | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())

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

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) {
        return
      }

      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)

      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera)
      const planePoint = getPlaneIntersectionFromRay(raycasterRef.current.ray)
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
      <color attach="background" args={['#f3efe6']} />
      <ambientLight intensity={1.05} />
      <directionalLight intensity={1.28} position={[480, -320, 520]} />
      <directionalLight intensity={0.4} position={[-260, 220, 220]} />
      <Grid
        cellColor="#d6d3d1"
        cellSize={40}
        fadeDistance={1800}
        fadeStrength={1.4}
        infiniteGrid
        position={[0, 0, -0.2]}
        rotation={[Math.PI / 2, 0, 0]}
        sectionColor="#78716c"
        sectionSize={200}
      />
      {document.boards.map((board, index) => (
        <BoardMesh
          key={board.id}
          board={board}
          color={mapBoardColor(index)}
          isSelected={selection.selectedBoardIds.includes(board.id)}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
        />
      ))}
      <PerspectiveCamera makeDefault position={[520, -520, 360]} up={[0, 0, 1]} />
      <CameraControls
        ref={controlsRef}
        dollyToCursor
        makeDefault
        maxDistance={4200}
        minDistance={80}
        smoothTime={0.45}
      />
      <GizmoHelper alignment="bottom-right" margin={[88, 88]}>
        <GizmoViewport
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="#111827"
        />
      </GizmoHelper>
    </>
  )
}

export function BoardPreview3D({
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  viewPreset = 'isometric',
  canvasClassName,
}: BoardPreview3DProps) {
  const controlsRef = useRef<CameraControlsImpl | null>(null)
  const initializedRef = useRef(false)

  const applyPreset = useCallback((preset: CameraPreset) => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    const pose = getCameraPose(document, selection.activeBoardId, preset)
    controls.setLookAt(
      pose.position[0],
      pose.position[1],
      pose.position[2],
      pose.target[0],
      pose.target[1],
      pose.target[2],
      true,
    )
  }, [document, selection.activeBoardId])

  useEffect(() => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true
    applyPreset(viewPreset)
  }, [applyPreset, viewPreset])

  useEffect(() => {
    if (!initializedRef.current) {
      return
    }

    applyPreset(viewPreset)
  }, [applyPreset, viewPreset])

  return (
    <div className="relative h-full min-h-0 overflow-hidden border border-black/10 bg-[linear-gradient(180deg,oklch(0.985_0.006_85),oklch(0.93_0.015_85))]">
      <div className={canvasClassName ?? 'h-[380px]'}>
        <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
          <Scene
            document={document}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onDocumentChange={onDocumentChange}
            controlsRef={controlsRef}
          />
        </Canvas>
      </div>
    </div>
  )
}
