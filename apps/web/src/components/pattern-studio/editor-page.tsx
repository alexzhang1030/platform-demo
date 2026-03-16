import type {
  Board,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'
import type {
  ReactNode,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import type { EditorSelectionState } from '@/lib/pattern-studio'
import { Button } from '@workspace/ui/components/button'
import {
  getDocumentBounds,
  rotatePoint,
  sampleShapePoints,
} from '@xtool-demo/core'
import {
  Box,
  Download,
  Grip,
  Maximize2,
  Minimize2,
  Move,
  PanelsTopLeft,
  Shapes,
  Square,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { useTheme } from '@/components/theme-provider'
import {
  createBoardFromPreset,
  mapBoardColor,
  moveBoardsByDelta,
  PRESET_OPTIONS,
  replacePointAt,
  selectSingleBoard,
  toggleBoardSelection,
  updateBoardOutlinePoints,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'
import { clamp, formatMillimeters } from '@/lib/utils'

import { BoardPreview3D } from './board-preview-3d'
import { AppShell, SectionHeader } from './chrome'

interface EditorPageProps {
  document: PatternDocument
  selection: EditorSelectionState
  onSelectionChange: (selection: EditorSelectionState) => void
  onDocumentChange: (document: PatternDocument) => void
  onExportJson: () => void
}

interface BoardCanvasProps {
  board: Board
  color: string
  isSelected: boolean
  isActive: boolean
  isDarkTheme: boolean
  canvasTransform: ViewTransform
  onBoardPointerDown: (
    event: ReactPointerEvent<SVGPolygonElement>,
    board: Board,
  ) => void
  onPointMove: (pointIndex: number, nextPoint: ControlPoint) => void
  onPointDragStart: () => void
}

interface FieldProps {
  label: string
  children: ReactNode
}

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
}

interface IconToggleOption<TValue extends string> {
  label: string
  value: TValue
  icon: typeof Box
}

interface ViewTransform {
  scale: number
  x: number
  y: number
}

interface InsetOffset {
  x: number
  y: number
}

type WorkspaceMode = '2d' | '3d' | 'split'

const MIN_SCALE = 0.45
const MAX_SCALE = 3.5
const ZOOM_IN_FACTOR = 1.12
const ZOOM_OUT_FACTOR = 0.9
const INSET_MARGIN = 8
const WORKSPACE_MODES: Array<IconToggleOption<WorkspaceMode>> = [
  { label: '3D', value: '3d', icon: Box },
  { label: '2D', value: '2d', icon: Square },
  { label: '3D + 2D', value: 'split', icon: PanelsTopLeft },
]

function getOutlinePoints(board: Board) {
  return sampleShapePoints(board.outline)
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal

  return {
    x: viewBox.x + (clientX - rect.left) * (viewBox.width / svg.clientWidth),
    y: viewBox.y + (clientY - rect.top) * (viewBox.height / svg.clientHeight),
  }
}

function toCanvasPoint(point: ControlPoint, transform: ViewTransform): ControlPoint {
  return {
    x: (point.x - transform.x) / transform.scale,
    y: (point.y - transform.y) / transform.scale,
  }
}

function zoomAtPoint(
  transform: ViewTransform,
  anchor: ControlPoint,
  factor: number,
): ViewTransform {
  const nextScale = clamp(transform.scale * factor, MIN_SCALE, MAX_SCALE)
  if (nextScale === transform.scale) {
    return transform
  }

  return {
    scale: nextScale,
    x: transform.x + (transform.scale - nextScale) * anchor.x,
    y: transform.y + (transform.scale - nextScale) * anchor.y,
  }
}

function getZoomLabel(scale: number) {
  return `${Math.round(scale * 100)}%`
}

function getInsetSize(panelWidth: number, isExpanded: boolean) {
  return {
    width: isExpanded ? Math.min(panelWidth * 0.52, 720) : Math.min(panelWidth * 0.24, 320),
    height: isExpanded ? 360 : 200,
  }
}

function BoardCanvas({
  board,
  color,
  isSelected,
  isActive,
  isDarkTheme,
  canvasTransform,
  onBoardPointerDown,
  onPointMove,
  onPointDragStart,
}: BoardCanvasProps) {
  const localPoints = useMemo(() => getOutlinePoints(board), [board])
  const worldPoints = useMemo(
    () =>
      localPoints.map((point) => {
        const rotated = rotatePoint(point, board.transform.rotation)
        return {
          x: rotated.x + board.transform.x,
          y: rotated.y + board.transform.y,
        }
      }),
    [board, localPoints],
  )

  const fill = `color-mix(in oklch, ${color} 18%, white)`
  const stroke = isActive
    ? '#111111'
    : color
  const strokeWidth = isActive
    ? isDarkTheme ? 3.2 : 2.4
    : isSelected
      ? isDarkTheme ? 2.2 : 1.8
      : 1.2

  return (
    <g>
      <polygon
        points={worldPoints.map(point => `${point.x},${point.y}`).join(' ')}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className="cursor-pointer transition-opacity"
        onPointerDown={event => onBoardPointerDown(event, board)}
      />
      {isActive
        ? localPoints.map((point, pointIndex) => {
            const rotated = rotatePoint(point, board.transform.rotation)
            const worldPoint = {
              x: rotated.x + board.transform.x,
              y: rotated.y + board.transform.y,
            }

            return (
              <circle
                key={`${board.id}-${point.x}-${point.y}`}
                cx={worldPoint.x}
                cy={worldPoint.y}
                r={isDarkTheme ? 7 : 6}
                fill={isDarkTheme ? '#111111' : 'white'}
                stroke={isDarkTheme ? '#f5f5f4' : color}
                strokeWidth={isDarkTheme ? 2.6 : 2}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onPointDragStart()

                  const svg = event.currentTarget.ownerSVGElement
                  if (!svg) {
                    return
                  }

                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    const svgPoint = getSvgPoint(svg, moveEvent.clientX, moveEvent.clientY)
                    const canvasPoint = toCanvasPoint(svgPoint, canvasTransform)

                    const nextLocalPoint = rotatePoint(
                      {
                        x: canvasPoint.x - board.transform.x,
                        y: canvasPoint.y - board.transform.y,
                      },
                      -board.transform.rotation,
                    )

                    onPointMove(pointIndex, nextLocalPoint)
                  }

                  const handlePointerUp = () => {
                    window.removeEventListener('pointermove', handlePointerMove)
                    window.removeEventListener('pointerup', handlePointerUp)
                  }

                  window.addEventListener('pointermove', handlePointerMove)
                  window.addEventListener('pointerup', handlePointerUp)
                }}
              />
            )
          })
        : null}
    </g>
  )
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[8px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
        {label}
      </span>
      {children}
    </label>
  )
}

function NumberInput({ value, onChange }: NumberInputProps) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => {
        const nextValue = Number(event.target.value)
        onChange(Number.isFinite(nextValue) ? nextValue : 0)
      }}
      className="h-8 w-full border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground"
    />
  )
}

function WorkspaceModeSwitch({
  value,
  onChange,
}: {
  value: WorkspaceMode
  onChange: (value: WorkspaceMode) => void
}) {
  const currentIndex = WORKSPACE_MODES.findIndex(mode => mode.value === value)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const currentMode = WORKSPACE_MODES[safeIndex]

  if (!currentMode) {
    return null
  }

  function cycleMode() {
    const nextIndex = (safeIndex + 1) % WORKSPACE_MODES.length
    const nextMode = WORKSPACE_MODES[nextIndex]
    if (nextMode) {
      onChange(nextMode.value)
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`Workspace mode: ${currentMode.label}`}
        title={currentMode.label}
        className="inline-flex size-8 items-center justify-center border border-border bg-foreground text-background shadow-[0_14px_36px_rgba(0,0,0,0.14)] transition-colors hover:opacity-90 dark:shadow-[0_18px_42px_rgba(0,0,0,0.4)]"
        onClick={cycleMode}
      >
        <currentMode.icon className="size-4" />
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap border border-border bg-popover px-1.5 py-1 text-[10px] text-popover-foreground opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-opacity group-hover:opacity-100 dark:shadow-[0_18px_42px_rgba(0,0,0,0.4)]">
        {currentMode.label}
      </span>
    </div>
  )
}

export function EditorPage({
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  onExportJson,
}: EditorPageProps) {
  const { resolvedTheme } = useTheme()
  const selectedBoardIds = selection.selectedBoardIds
  const activeBoardId = selection.activeBoardId
  const selectedBoard = document.boards.find(board => board.id === activeBoardId)
  const bounds = useMemo(() => getDocumentBounds(document), [document])
  const canvasViewBox = [
    bounds.minX - 60,
    bounds.minY - 60,
    Math.max(400, bounds.width + 120),
    Math.max(320, bounds.height + 120),
  ].join(' ')
  const [canvasTransform, setCanvasTransform] = useState<ViewTransform>({
    scale: 1,
    x: 0,
    y: 0,
  })
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('split')
  const [isInsetExpanded, setIsInsetExpanded] = useState(false)
  const [isInsetDragging, setIsInsetDragging] = useState(false)
  const [insetOffset, setInsetOffset] = useState<InsetOffset>({ x: 0, y: 0 })
  const splitPanelRef = useRef<HTMLDivElement | null>(null)

  function updateBoard(nextBoard: Board) {
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: document.boards.map(board =>
        board.id === nextBoard.id ? nextBoard : board,
      ),
    })
    onDocumentChange(nextDocument)
  }

  function addBoard(presetId: (typeof PRESET_OPTIONS)[number]['id']) {
    const nextBoard = createBoardFromPreset(presetId, document.boards.length)
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: [...document.boards, nextBoard],
    })
    onDocumentChange(nextDocument)
    onSelectionChange(selectSingleBoard(nextBoard.id))
  }

  function removeSelectedBoard() {
    if (document.boards.length <= 1 || selectedBoardIds.length === 0) {
      return
    }

    const selectedBoardIdSet = new Set(selectedBoardIds)
    if (selectedBoardIdSet.size >= document.boards.length) {
      return
    }

    const filteredBoards = document.boards.filter(
      board => !selectedBoardIdSet.has(board.id),
    )
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: filteredBoards,
    })
    onDocumentChange(nextDocument)

    const nextActiveBoard = filteredBoards[0]
    if (nextActiveBoard) {
      onSelectionChange(selectSingleBoard(nextActiveBoard.id))
    }
  }

  function startPan(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()

    const svg = event.currentTarget
    let lastPoint = getSvgPoint(svg, event.clientX, event.clientY)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPoint = getSvgPoint(svg, moveEvent.clientX, moveEvent.clientY)
      const deltaX = nextPoint.x - lastPoint.x
      const deltaY = nextPoint.y - lastPoint.y
      lastPoint = nextPoint

      setCanvasTransform(current => ({
        ...current,
        x: current.x + deltaX,
        y: current.y + deltaY,
      }))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  function handleWheelZoom(
    event: ReactWheelEvent<SVGSVGElement>,
  ) {
    event.preventDefault()
    event.stopPropagation()

    const anchor = getSvgPoint(event.currentTarget, event.clientX, event.clientY)
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR

    setCanvasTransform(current => zoomAtPoint(current, anchor, factor))
  }

  function startInsetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const panel = splitPanelRef.current
    if (!panel) {
      return
    }

    const panelRect = panel.getBoundingClientRect()
    const insetSize = getInsetSize(panelRect.width, isInsetExpanded)
    let lastClientX = event.clientX
    let lastClientY = event.clientY

    setIsInsetDragging(true)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - lastClientX
      const deltaY = moveEvent.clientY - lastClientY
      lastClientX = moveEvent.clientX
      lastClientY = moveEvent.clientY

      setInsetOffset(current => ({
        x: clamp(
          current.x + deltaX,
          -(panelRect.width - insetSize.width - INSET_MARGIN),
          0,
        ),
        y: clamp(
          current.y + deltaY,
          0,
          panelRect.height - insetSize.height - INSET_MARGIN,
        ),
      }))
    }

    const handlePointerUp = () => {
      setIsInsetDragging(false)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  function startCanvasBackgroundInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || event.target !== event.currentTarget) {
      return
    }

    startPan(event)
  }

  function handleBoardPointerDown(
    event: ReactPointerEvent<SVGPolygonElement>,
    board: Board,
  ) {
    event.preventDefault()
    event.stopPropagation()

    if (event.metaKey || event.ctrlKey) {
      onSelectionChange(toggleBoardSelection(selection, board.id))
      return
    }

    const isSelected = selection.selectedBoardIds.includes(board.id)
    const nextSelection = isSelected
      ? selection
      : selectSingleBoard(board.id)

    if (!isSelected) {
      onSelectionChange(nextSelection)
    }

    const svg = event.currentTarget.ownerSVGElement
    if (!svg) {
      return
    }

    const startPoint = toCanvasPoint(
      getSvgPoint(svg, event.clientX, event.clientY),
      canvasTransform,
    )
    const selectionToMove = nextSelection.selectedBoardIds
    const originDocument = document

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPoint = toCanvasPoint(
        getSvgPoint(svg, moveEvent.clientX, moveEvent.clientY),
        canvasTransform,
      )
      const nextDocument = updateDocumentTimestamp(
        moveBoardsByDelta(originDocument, selectionToMove, {
          x: nextPoint.x - startPoint.x,
          y: nextPoint.y - startPoint.y,
        }),
      )

      onDocumentChange(nextDocument)
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const canvasMatrix = `matrix(${canvasTransform.scale} 0 0 ${canvasTransform.scale} ${canvasTransform.x} ${canvasTransform.y})`
  const render2DCanvas = (
    heightClass: string,
    options?: { compact?: boolean, showInsetControls?: boolean },
  ) => (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(135deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_20px)]">
      <div className="pointer-events-none absolute top-2 right-2 z-10 flex items-center gap-1.5">
        <div className="pointer-events-auto flex items-center gap-1 bg-background/92 p-0.5 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:shadow-[0_18px_42px_rgba(0,0,0,0.4)]">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => setCanvasTransform({ scale: 1, x: 0, y: 0 })}
          >
            <Move className="size-3.5" />
          </Button>
          {!options?.compact
            ? <span className="min-w-10 px-1 text-right text-[10px] text-foreground/55">{getZoomLabel(canvasTransform.scale)}</span>
            : null}
          {options?.showInsetControls
            ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => setIsInsetExpanded(current => !current)}
                  >
                    {isInsetExpanded
                      ? <Minimize2 className="size-3.5" />
                      : <Maximize2 className="size-3.5" />}
                  </Button>
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center border border-border bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
                    onPointerDown={startInsetDrag}
                    onDoubleClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setInsetOffset({ x: 0, y: 0 })
                    }}
                  >
                    <Grip className="size-3.5" />
                  </button>
                </>
              )
            : null}
        </div>
      </div>
      <div className="overscroll-contain">
        <svg
          viewBox={canvasViewBox}
          className={`${heightClass} w-full cursor-grab bg-[oklch(0.985_0.005_85)] active:cursor-grabbing dark:bg-[oklch(0.19_0.008_84)]`}
          onPointerDown={startCanvasBackgroundInteraction}
          onWheelCapture={handleWheelZoom}
        >
          <g transform={canvasMatrix}>
            {document.boards.map((board, index) => (
              <BoardCanvas
                key={board.id}
                board={board}
                color={mapBoardColor(index)}
                isSelected={selectedBoardIds.includes(board.id)}
                isActive={board.id === activeBoardId}
                isDarkTheme={resolvedTheme === 'dark'}
                canvasTransform={canvasTransform}
                onBoardPointerDown={handleBoardPointerDown}
                onPointDragStart={() => onSelectionChange(selectSingleBoard(board.id))}
                onPointMove={(pointIndex, nextPoint) => {
                  const nextOutlinePoints = replacePointAt(
                    getOutlinePoints(board),
                    pointIndex,
                    nextPoint,
                  )

                  updateBoard(
                    updateBoardOutlinePoints(board, nextOutlinePoints),
                  )
                }}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )

  return (
    <AppShell route="editor">
      <div className="grid h-full min-h-0 gap-0 xl:grid-cols-[192px_minmax(0,1fr)_236px]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-y border-l border-border bg-background/80 p-2">
          <SectionHeader
            eyebrow="Boards"
            title="Pattern"
            meta={`${document.boards.length} boards`}
          />
          <div className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-auto pr-0.5">
            {document.boards.map((board, index) => {
              const active = board.id === activeBoardId
              const selected = selectedBoardIds.includes(board.id)
              return (
                <button
                  type="button"
                  key={board.id}
                  className={`flex w-full items-start gap-2 border px-2 py-1.5 text-left transition-colors ${active
                    ? 'border-foreground bg-muted dark:border-black dark:bg-black/24 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]'
                    : selected
                      ? 'border-foreground/30 bg-muted/55 dark:border-black/70 dark:bg-black/18 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                      : 'border-border bg-card hover:bg-muted/45'
                  }`}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey) {
                      onSelectionChange(toggleBoardSelection(selection, board.id))
                      return
                    }

                    onSelectionChange(selectSingleBoard(board.id))
                  }}
                >
                  <span
                    className="mt-1 block size-2 shrink-0"
                    style={{ backgroundColor: mapBoardColor(index) }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold tracking-[-0.03em]">
                      {board.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-foreground/55">
                      {formatMillimeters(board.thickness)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-1.5 border-t border-border pt-1.5">
            <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
              Add board
            </p>
            <div className="mt-1.5 space-y-1">
              {PRESET_OPTIONS.map(preset => (
                <button
                  type="button"
                  key={preset.id}
                  className="w-full border border-border bg-card px-2 py-1.5 text-left hover:bg-muted/45"
                  onClick={() => addBoard(preset.id)}
                >
                  <span className="block text-[11px] font-semibold tracking-[-0.03em]">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-1.5 flex gap-1">
            <Button variant="outline" size="sm" className="h-8 flex-1 px-2 text-[11px]" onClick={removeSelectedBoard}>
              Remove
            </Button>
            <Button size="sm" className="h-8 flex-1 px-2 text-[11px]" onClick={onExportJson}>
              Export
              <Download className="size-3" />
            </Button>
          </div>
        </aside>

        <section className="relative flex min-h-0 flex-col overflow-hidden border border-border bg-background/85">
          <div className="min-h-0 flex-1 overflow-hidden">
            {workspaceMode === '2d'
              ? render2DCanvas('h-full')
              : null}

            {workspaceMode === '3d'
              ? (
                  <BoardPreview3D
                    document={document}
                    selection={selection}
                    onSelectionChange={onSelectionChange}
                    onDocumentChange={onDocumentChange}
                    canvasClassName="h-full min-h-[520px]"
                  />
                )
              : null}

            {workspaceMode === 'split'
              ? (
                  <div
                    ref={splitPanelRef}
                    className="relative h-full overflow-hidden"
                  >
                    <BoardPreview3D
                      document={document}
                      selection={selection}
                      onSelectionChange={onSelectionChange}
                      onDocumentChange={onDocumentChange}
                      canvasClassName="h-full min-h-[520px]"
                    />
                    <div
                      className={`absolute top-2 right-2 z-10 overflow-hidden bg-background/96 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:shadow-[0_20px_54px_rgba(0,0,0,0.42)] ${isInsetDragging ? '' : 'transition-all'} ${isInsetExpanded
                        ? 'w-[min(52vw,720px)]'
                        : 'w-[min(24vw,320px)]'
                      }`}
                      style={{
                        transform: `translate(${insetOffset.x}px, ${insetOffset.y}px)`,
                      }}
                    >
                      {render2DCanvas(isInsetExpanded ? 'h-[360px]' : 'h-[200px]', {
                        compact: !isInsetExpanded,
                        showInsetControls: true,
                      })}
                    </div>
                  </div>
                )
              : null}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-3">
            <div className="pointer-events-auto flex items-center bg-background/94 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur-sm dark:shadow-[0_20px_54px_rgba(0,0,0,0.42)]">
              <WorkspaceModeSwitch value={workspaceMode} onChange={setWorkspaceMode} />
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden border-y border-r border-border bg-background/80 p-2">
          <SectionHeader
            eyebrow="Inspector"
            title={selectedBoard?.name ?? 'Board'}
          />

          {selectedBoard
            ? (
                <div className="mt-2 min-h-0 space-y-3 overflow-auto pr-0.5">
                  <Field label="Board name">
                    <input
                      value={selectedBoard.name}
                      onChange={event =>
                        updateBoard({
                          ...selectedBoard,
                          name: event.target.value,
                        })}
                      className="h-8 w-full border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground"
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Thickness">
                      <NumberInput
                        value={selectedBoard.thickness}
                        onChange={value =>
                          updateBoard({
                            ...selectedBoard,
                            thickness: clamp(value, 1, 120),
                          })}
                      />
                    </Field>
                    <Field label="Rotation">
                      <NumberInput
                        value={selectedBoard.transform.rotation}
                        onChange={value =>
                          updateBoard({
                            ...selectedBoard,
                            transform: {
                              ...selectedBoard.transform,
                              rotation: value,
                            },
                          })}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="X offset">
                      <NumberInput
                        value={selectedBoard.transform.x}
                        onChange={value =>
                          updateBoard({
                            ...selectedBoard,
                            transform: {
                              ...selectedBoard.transform,
                              x: value,
                            },
                          })}
                      />
                    </Field>
                    <Field label="Y offset">
                      <NumberInput
                        value={selectedBoard.transform.y}
                        onChange={value =>
                          updateBoard({
                            ...selectedBoard,
                            transform: {
                              ...selectedBoard.transform,
                              y: value,
                            },
                          })}
                      />
                    </Field>
                  </div>

                  <Field label="Material">
                    <input
                      value={selectedBoard.material ?? ''}
                      onChange={event =>
                        updateBoard({
                          ...selectedBoard,
                          material: event.target.value,
                        })}
                      className="h-8 w-full border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground"
                    />
                  </Field>
                  <div className="flex items-center gap-1.5 border border-border bg-muted/55 px-2.5 py-1.5 text-[10px] text-foreground/55">
                    <Shapes className="size-3" />
                    <span>
                      {getOutlinePoints(selectedBoard).length}
                      {' '}
                      pts
                    </span>
                    <span>·</span>
                    <span>{formatMillimeters(selectedBoard.thickness)}</span>
                  </div>
                </div>
              )
            : null}
        </aside>
      </div>
    </AppShell>
  )
}
