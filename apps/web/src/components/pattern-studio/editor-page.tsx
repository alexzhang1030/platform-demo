import type {
  Board,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'
import type {
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { EditorSelectionState } from '@/lib/pattern-studio'
import { Button } from '@workspace/ui/components/button'
import {
  buildNestingLayout,
  getBoardOutlineWithJoints,
  sampleShapePoints,
} from '@xtool-demo/core'
import {
  Download,
  Grip,
  Plus,
  Minus,
  Shapes,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useTheme } from '@/components/theme-provider'
import {
  createBoardFromPreset,
  evaluateBoardGroupsAfterRemove,
  mapBoardColor,
  selectSingleAssembly,
  PRESET_OPTIONS,
  selectSingleBoard,
  toggleAssemblySelection,
  toggleBoardSelection,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'
import { clamp, formatMillimeters } from '@/lib/utils'

import { BoardPreview3D } from './board-preview-3d'
import {
  AppShell,
  OverlayPanel,
  SectionHeader,
  WorkspaceViewport,
} from './chrome'

interface EditorPageProps {
  document: PatternDocument
  selection: EditorSelectionState
  onSelectionChange: (selection: EditorSelectionState) => void
  onDocumentChange: (document: PatternDocument) => void
  onExportJson: () => void
}

interface FieldProps {
  label: string
  children: ReactNode
}

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
}

interface BoardEditorContentProps {
  board: Board | null
  onBoardChange: (board: Board) => void
}

interface InsetOffset {
  x: number
  y: number
}

type PipLevel = 'compact' | 'expanded' | 'fullscreen'
type EditorTool = 'boxel-mode' | 'boxel-remove' | 'create-board' | 'select'

interface PipLayoutState {
  level: PipLevel
  offset: InsetOffset
}

interface PanelSize {
  height: number
  width: number
}

interface BoardPreviewSheet {
  height: number
  holes: ControlPoint[][]
  outline: ControlPoint[]
  width: number
}

const INSET_MARGIN = 8
const NESTING_PANEL_PADDING = 40
const NESTING_SHEET_GAP = 80

function getOutlinePoints(board: Board, groups: PatternDocument['boardGroups'] = [], allBoards: Board[] = []) {
  return sampleShapePoints(getBoardOutlineWithJoints(board, groups, allBoards))
}

function getInsetSize(panelWidth: number, level: Exclude<PipLevel, 'fullscreen'>) {
  if (level === 'expanded') {
    return {
      width: Math.min(panelWidth * 0.52, 720),
      height: 360,
    }
  }

  return {
    width: Math.min(panelWidth * 0.24, 320),
    height: 200,
  }
}

function clampPipOffset(
  panelWidth: number,
  panelHeight: number,
  level: Exclude<PipLevel, 'fullscreen'>,
  offset: InsetOffset,
): InsetOffset {
  const size = getInsetSize(panelWidth, level)

  return {
    x: clamp(offset.x, 0, Math.max(0, panelWidth - size.width - INSET_MARGIN * 2)),
    y: clamp(offset.y, 0, Math.max(0, panelHeight - size.height - INSET_MARGIN * 2)),
  }
}

function pointsToPath(points: ControlPoint[]) {
  if (points.length === 0) {
    return ''
  }

  const [firstPoint, ...restPoints] = points
  if (!firstPoint) {
    return ''
  }

  let path = `M ${firstPoint.x} ${firstPoint.y}`

  for (const point of restPoints) {
    path += ` L ${point.x} ${point.y}`
  }

  path += ' Z'
  return path
}

function offsetPoints(points: ControlPoint[], offsetX: number, offsetY: number) {
  return points.map(point => ({
    x: point.x + offsetX,
    y: point.y + offsetY,
  }))
}

function getBoardPreviewSheet(board: Board, groups: PatternDocument['boardGroups'] = [], allBoards: Board[] = []): BoardPreviewSheet {
  const outline = getOutlinePoints(board, groups, allBoards)
  const holes = board.holes.map(hole => sampleShapePoints(hole))

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of outline) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  if (
    !Number.isFinite(minX)
    || !Number.isFinite(maxX)
    || !Number.isFinite(minY)
    || !Number.isFinite(maxY)
  ) {
    return {
      height: 100,
      holes: [],
      outline: [],
      width: 100,
    }
  }

  return {
    height: Math.max(1, maxY - minY),
    holes: holes.map(points =>
      points.map(point => ({
        x: point.x - minX,
        y: point.y - minY,
      })),
    ),
    outline: outline.map(point => ({
      x: point.x - minX,
      y: point.y - minY,
    })),
    width: Math.max(1, maxX - minX),
  }
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

function BoardEditorContent({
  board,
  onBoardChange,
}: BoardEditorContentProps) {
  if (!board) {
    return (
      <div className="mt-2 border border-dashed border-border px-3 py-6 text-center text-[11px] text-foreground/55">
        Select a board to inspect and edit its properties.
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-3 overflow-auto pr-0.5">
      <Field label="Board name">
        <input
          value={board.name}
          onChange={event =>
            onBoardChange({
              ...board,
              name: event.target.value,
            })}
          className="h-8 w-full border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="Thickness">
          <NumberInput
            value={board.thickness}
            onChange={value =>
              onBoardChange({
                ...board,
                thickness: clamp(value, 1, 120),
              })}
          />
        </Field>
        <Field label="Rotation">
          <NumberInput
            value={board.transform.rotation}
            onChange={value =>
              onBoardChange({
                ...board,
                transform: {
                  ...board.transform,
                  rotation: value,
                },
              })}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="X offset">
          <NumberInput
            value={board.transform.x}
            onChange={value =>
              onBoardChange({
                ...board,
                transform: {
                  ...board.transform,
                  x: value,
                },
              })}
          />
        </Field>
        <Field label="Y offset">
          <NumberInput
            value={board.transform.y}
            onChange={value =>
              onBoardChange({
                ...board,
                transform: {
                  ...board.transform,
                  y: value,
                },
              })}
          />
        </Field>
      </div>

      <Field label="Material">
        <input
          value={board.material ?? ''}
          onChange={event =>
            onBoardChange({
              ...board,
              material: event.target.value,
            })}
          className="h-8 w-full border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground"
        />
      </Field>
      <div className="flex items-center gap-1.5 border border-border bg-muted/55 px-2.5 py-1.5 text-[10px] text-foreground/55">
        <Shapes className="size-3" />
        <span>
          {getOutlinePoints(board).length}
          {' '}
          pts
        </span>
        <span>·</span>
        <span>{formatMillimeters(board.thickness)}</span>
      </div>
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
  const selectedAssemblyIds = selection.selectedAssemblyIds
  const selectedBoardIds = selection.selectedBoardIds
  const activeAssemblyId = selection.activeAssemblyId
  const activeBoardId = selection.activeBoardId
  const selectedAssembly = document.assemblies.find(assembly => assembly.id === activeAssemblyId)
  const selectedBoard = document.boards.find(board => board.id === activeBoardId)
  const nestingResult = useMemo(() => buildNestingLayout(document), [document])
  const [activeTool, setActiveTool] = useState<EditorTool>('select')
  const [isInsetDragging, setIsInsetDragging] = useState(false)
  const [pipLayout, setPipLayout] = useState<PipLayoutState>({
    level: 'compact',
    offset: { x: 0, y: 0 },
  })
  const [splitPanelSize, setSplitPanelSize] = useState<PanelSize>({
    height: 720,
    width: 1280,
  })
  const [isBoardEditDialogOpen, setIsBoardEditDialogOpen] = useState(false)
  const splitPanelRef = useRef<HTMLDivElement | null>(null)

  const pipLevel = pipLayout.level
  const isPipFullscreen = pipLevel === 'fullscreen'
  const isBoxelModeActive = activeTool === 'boxel-mode'
  const isBoxelRemoveModeActive = activeTool === 'boxel-remove'
  const isCreateBoardToolActive = activeTool === 'create-board'
  const nestingSheets = useMemo(
    () =>
      nestingResult.sheets.map((sheet, index) => ({
        offsetX: NESTING_PANEL_PADDING,
        offsetY: NESTING_PANEL_PADDING + index * (sheet.height + NESTING_SHEET_GAP),
        sheet,
      })),
    [nestingResult.sheets],
  )
  const nestingCanvasWidth = useMemo(() => {
    const maxSheetWidth = nestingResult.sheets.reduce(
      (currentMax, sheet) => Math.max(currentMax, sheet.width),
      0,
    )

    return Math.max(720, maxSheetWidth + NESTING_PANEL_PADDING * 2)
  }, [nestingResult.sheets])
  const nestingCanvasHeight = useMemo(() => {
    if (nestingResult.sheets.length === 0) {
      return 520
    }

    const totalSheetHeight = nestingResult.sheets.reduce(
      (sum, sheet) => sum + sheet.height,
      0,
    )
    const totalGapHeight = Math.max(0, nestingResult.sheets.length - 1) * NESTING_SHEET_GAP

    return totalSheetHeight + totalGapHeight + NESTING_PANEL_PADDING * 2
  }, [nestingResult.sheets])
  const boardPreviewSheet = useMemo(
    () => selectedBoard ? getBoardPreviewSheet(selectedBoard, document.boardGroups, document.boards) : null,
    [selectedBoard, document.boardGroups, document.boards],
  )
  const boardPreviewCanvasWidth = boardPreviewSheet
    ? boardPreviewSheet.width + NESTING_PANEL_PADDING * 2
    : 100
  const boardPreviewCanvasHeight = boardPreviewSheet
    ? boardPreviewSheet.height + NESTING_PANEL_PADDING * 2
    : 100

  useEffect(() => {
    const panel = splitPanelRef.current
    if (!panel) {
      return
    }

    const updatePanelSize = () => {
      setSplitPanelSize({
        height: panel.clientHeight,
        width: panel.clientWidth,
      })
    }

    updatePanelSize()

    const observer = new ResizeObserver(() => {
      updatePanelSize()
    })

    observer.observe(panel)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isBoardEditDialogOpen && !selectedBoard) {
      setIsBoardEditDialogOpen(false)
    }
  }, [isBoardEditDialogOpen, selectedBoard])

  useEffect(() => {
    if (!isBoardEditDialogOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBoardEditDialogOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isBoardEditDialogOpen])

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

  function removeSelectedContent() {
    if (selectedBoardIds.length === 0 && selectedAssemblyIds.length === 0) {
      return
    }

    const selectedBoardIdSet = new Set(selectedBoardIds)
    const selectedAssemblyIdSet = new Set(selectedAssemblyIds)
    if (
      selectedBoardIdSet.size >= document.boards.length
      && selectedAssemblyIdSet.size >= document.assemblies.length
      && (document.boards.length > 0 || document.assemblies.length > 0)
    ) {
      return
    }

    const filteredBoards = document.boards.filter(
      board => !selectedBoardIdSet.has(board.id),
    )
    const filteredAssemblies = document.assemblies.filter(
      assembly => !selectedAssemblyIdSet.has(assembly.id),
    )
    let withoutBoards: typeof document = {
      ...document,
      assemblies: filteredAssemblies,
      boards: filteredBoards,
    }
    for (const boardId of selectedBoardIds) {
      withoutBoards = evaluateBoardGroupsAfterRemove(withoutBoards, boardId)
    }
    const nextDocument = updateDocumentTimestamp(withoutBoards)
    onDocumentChange(nextDocument)

    const nextActiveAssembly = filteredAssemblies[0]
    if (nextActiveAssembly) {
      onSelectionChange(selectSingleAssembly(nextActiveAssembly.id))
      return
    }

    const nextActiveBoard = filteredBoards[0]
    if (nextActiveBoard) {
      onSelectionChange(selectSingleBoard(nextActiveBoard.id))
      return
    }

    onSelectionChange(selectSingleBoard(''))

    if (filteredBoards.length === 0) {
      setIsBoardEditDialogOpen(false)
    }
  }

  function openBoardEditDialog(boardId: string) {
    onSelectionChange(selectSingleBoard(boardId))
    setIsBoardEditDialogOpen(true)
  }

  function closeBoardEditDialog() {
    setIsBoardEditDialogOpen(false)
  }

  function startInsetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const panel = splitPanelRef.current
    if (!panel || pipLayout.level === 'fullscreen') {
      return
    }

    const panelRect = panel.getBoundingClientRect()
    let lastClientX = event.clientX
    let lastClientY = event.clientY

    setIsInsetDragging(true)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - lastClientX
      const deltaY = moveEvent.clientY - lastClientY
      lastClientX = moveEvent.clientX
      lastClientY = moveEvent.clientY

      setPipLayout(current => ({
        ...current,
        offset: current.level === 'fullscreen'
          ? current.offset
          : clampPipOffset(panelRect.width, panelRect.height, current.level, {
              x: current.offset.x - deltaX,
              y: current.offset.y - deltaY,
            }),
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

  function resetInsetPosition() {
    setPipLayout(current => ({
      ...current,
      offset: { x: 0, y: 0 },
    }))
  }

  function expandInsetLevel() {
    const panel = splitPanelRef.current
    if (!panel) {
      return
    }

    const panelRect = panel.getBoundingClientRect()

    setPipLayout(current => {
      if (current.level === 'compact') {
        return {
          ...current,
          level: 'expanded',
          offset: clampPipOffset(
            panelRect.width,
            panelRect.height,
            'expanded',
            current.offset,
          ),
        }
      }

      if (current.level === 'expanded') {
        return {
          ...current,
          level: 'fullscreen',
        }
      }

      return current
    })
  }

  function shrinkInsetLevel() {
    const panel = splitPanelRef.current
    if (!panel) {
      return
    }

    const panelRect = panel.getBoundingClientRect()

    setPipLayout(current => {
      if (current.level === 'fullscreen') {
        return {
          ...current,
          level: 'expanded',
          offset: clampPipOffset(
            panelRect.width,
            panelRect.height,
            'expanded',
            current.offset,
          ),
        }
      }

      if (current.level === 'expanded') {
        return {
          ...current,
          level: 'compact',
          offset: clampPipOffset(
            panelRect.width,
            panelRect.height,
            'compact',
            current.offset,
          ),
        }
      }

      return current
    })
  }

  const render2DCanvas = (
    heightClass: string,
    options?: { compact?: boolean, showInsetControls?: boolean },
  ) => (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(135deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_20px)]">
      <div className="pointer-events-none absolute top-2 right-2 z-30 flex items-center gap-1.5">
        <div className="pointer-events-auto flex items-center gap-1 bg-background/92 p-0.5 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:shadow-[0_18px_42px_rgba(0,0,0,0.4)]">
          <span className="px-1.5 text-[10px] text-foreground/55">
            {nestingResult.sheets.length}
            {' '}
            sheets
          </span>
          {!options?.compact
            ? (
                <span className="px-1 text-[10px] text-foreground/55">
                  {document.boards.length}
                  {' '}
                  boards
                </span>
              )
            : null}
          {options?.showInsetControls
            ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={shrinkInsetLevel}
                    disabled={pipLevel === 'compact'}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={expandInsetLevel}
                    disabled={pipLevel === 'fullscreen'}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  {!isPipFullscreen
                    ? (
                        <button
                          type="button"
                          className="inline-flex size-6 items-center justify-center border border-border bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
                          onPointerDown={startInsetDrag}
                          onDoubleClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            resetInsetPosition()
                          }}
                        >
                          <Grip className="size-3.5" />
                        </button>
                      )
                    : null}
                </>
              )
            : null}
        </div>
      </div>
      <div className="h-full overflow-auto p-3">
        <svg
          viewBox={`0 0 ${nestingCanvasWidth} ${nestingCanvasHeight}`}
          className={`${heightClass} w-full bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.19_0.008_84)]`}
        >
          {nestingSheets.map(({ sheet, offsetX, offsetY }) => (
            <g key={`sheet-${sheet.index}`}>
              <rect
                x={offsetX}
                y={offsetY}
                width={sheet.width}
                height={sheet.height}
                fill={resolvedTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)'}
                stroke={resolvedTheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'}
                strokeDasharray="12 8"
                strokeWidth={2}
              />
              <text
                x={offsetX}
                y={offsetY - 12}
                fill={resolvedTheme === 'dark' ? '#cbd5e1' : '#334155'}
                fontSize="18"
                fontWeight="600"
              >
                {`Sheet ${sheet.index + 1} · ${sheet.width} × ${sheet.height} mm`}
              </text>
              {sheet.placements.map((placement) => {
                const placementOutline = offsetPoints(placement.outline, offsetX + placement.x, offsetY + placement.y)
                const placementHoles = placement.holes.map(points =>
                  offsetPoints(points, offsetX + placement.x, offsetY + placement.y),
                )
                const fillColor = selectedBoardIds.includes(placement.boardId)
                  ? resolvedTheme === 'dark'
                    ? 'rgba(96,165,250,0.3)'
                    : 'rgba(59,130,246,0.22)'
                  : resolvedTheme === 'dark'
                    ? 'rgba(226,232,240,0.12)'
                    : 'rgba(148,163,184,0.18)'
                const strokeColor = placement.boardId === activeBoardId
                  ? resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a'
                  : resolvedTheme === 'dark' ? '#7dd3fc' : '#2563eb'
                const compoundPath = [
                  pointsToPath(placementOutline),
                  ...placementHoles.map(points => pointsToPath(points)),
                ].join(' ')

                return (
                  <g
                    key={placement.boardId}
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()

                      if (event.metaKey || event.ctrlKey) {
                        onSelectionChange(toggleBoardSelection(selection, placement.boardId))
                        return
                      }

                      onSelectionChange(selectSingleBoard(placement.boardId))
                    }}
                    onDoubleClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openBoardEditDialog(placement.boardId)
                    }}
                  >
                    <path
                      d={compoundPath}
                      fill={fillColor}
                      fillRule="evenodd"
                      stroke={strokeColor}
                      strokeWidth={placement.boardId === activeBoardId ? 3 : 2}
                    />
                    <text
                      x={offsetX + placement.x + placement.width / 2}
                      y={offsetY + placement.y + placement.height / 2 - 2}
                      fill={resolvedTheme === 'dark' ? '#e2e8f0' : '#1e293b'}
                      fontSize="14"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {placement.name}
                    </text>
                    <text
                      x={offsetX + placement.x + placement.width / 2}
                      y={offsetY + placement.y + placement.height / 2 + 16}
                      fill={resolvedTheme === 'dark' ? '#94a3b8' : '#475569'}
                      fontSize="12"
                      textAnchor="middle"
                    >
                      {`${Math.round(placement.width)} × ${Math.round(placement.height)} mm`}
                    </text>
                  </g>
                )
              })}
            </g>
          ))}
          {nestingSheets.length === 0
            ? (
                <text
                  x={nestingCanvasWidth / 2}
                  y={nestingCanvasHeight / 2}
                  fill={resolvedTheme === 'dark' ? '#94a3b8' : '#475569'}
                  fontSize="20"
                  textAnchor="middle"
                >
                  Add boards in 3D to generate a nesting layout.
                </text>
              )
            : null}
        </svg>
      </div>
    </div>
  )

  const splitPanelWidth = splitPanelSize.width
  const floatingLevel = pipLevel === 'fullscreen' ? 'expanded' : pipLevel
  const floatingSize = getInsetSize(splitPanelWidth, floatingLevel)

  return (
    <AppShell route="editor">
      <WorkspaceViewport>
        <section className="relative h-full min-h-0 overflow-hidden">
          <div className="h-full min-h-0 overflow-hidden">
            <div
              ref={splitPanelRef}
              className="relative h-full overflow-hidden"
            >
              {!isPipFullscreen
                ? (
                    <BoardPreview3D
                      boxelModeEnabled={isBoxelModeActive}
                      boxelRemoveModeEnabled={isBoxelRemoveModeActive}
                      createBoardModeEnabled={isCreateBoardToolActive}
                      document={document}
                      selection={selection}
                      onBoardEditRequest={openBoardEditDialog}
                      onSelectionChange={onSelectionChange}
                      onDocumentChange={onDocumentChange}
                      onActivateCreateBoardMode={() => setActiveTool('create-board')}
                      canvasClassName="h-full min-h-[520px]"
                    />
                  )
                : null}
              <div
                className={`absolute z-30 overflow-hidden bg-background/96 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm dark:shadow-[0_20px_54px_rgba(0,0,0,0.42)] ${isInsetDragging ? '' : 'transition-[width,height,bottom,right] duration-200 ease-out'}`}
                style={{
                  bottom: isPipFullscreen ? 0 : INSET_MARGIN + pipLayout.offset.y,
                  height: isPipFullscreen ? '100%' : floatingSize.height,
                  right: isPipFullscreen ? 0 : INSET_MARGIN + pipLayout.offset.x,
                  width: isPipFullscreen ? '100%' : floatingSize.width,
                }}
              >
                {render2DCanvas('h-full', {
                  compact: floatingLevel === 'compact',
                  showInsetControls: true,
                })}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <OverlayPanel className="pointer-events-auto w-full max-w-[min(100%,320px)] lg:w-[320px]">
              <SectionHeader
                eyebrow="Boards"
                title="Pattern"
                meta={`${document.boards.length} boards · ${document.assemblies.length} assemblies`}
              />
              <div className="mt-1.5 max-h-[min(34vh,360px)] space-y-1 overflow-auto pr-0.5 lg:max-h-[min(52vh,560px)]">
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
                {document.assemblies.map((assembly, index) => {
                  const active = assembly.id === activeAssemblyId
                  const selected = selectedAssemblyIds.includes(assembly.id)
                  return (
                    <button
                      type="button"
                      key={assembly.id}
                      className={`flex w-full items-start gap-2 border px-2 py-1.5 text-left transition-colors ${active
                        ? 'border-foreground bg-muted dark:border-black dark:bg-black/24 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]'
                        : selected
                          ? 'border-foreground/30 bg-muted/55 dark:border-black/70 dark:bg-black/18 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                          : 'border-border bg-card hover:bg-muted/45'
                      }`}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey) {
                          onSelectionChange(toggleAssemblySelection(selection, assembly.id))
                          return
                        }

                        onSelectionChange(selectSingleAssembly(assembly.id))
                      }}
                    >
                      <span
                        className="mt-1 block size-2 shrink-0"
                        style={{ backgroundColor: mapBoardColor(index + document.boards.length) }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold tracking-[-0.03em]">
                          {assembly.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-foreground/55">
                          {`${assembly.cells.length} boxels`}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-1.5 border-t border-border pt-1.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
                  Add content
                </p>
                <div className="mt-1.5">
                  <Button
                    variant={isBoxelModeActive ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-full px-2 text-[11px]"
                    onClick={() => {
                      setActiveTool(current => {
                        if (current === 'boxel-mode') {
                          return 'select'
                        }

                        return 'boxel-mode'
                      })
                    }}
                  >
                    {isBoxelModeActive ? 'Exit boxel mode' : 'Boxel mode'}
                  </Button>
                  {isBoxelModeActive
                    ? (
                        <p className="mt-1 text-[10px] text-foreground/55">
                          Create in 3D. Click an empty grid column to start a stack, click neighboring columns to merge laterally, and click the same column again to stack upward.
                        </p>
                      )
                    : null}
                  <Button
                    variant={isBoxelRemoveModeActive ? 'default' : 'outline'}
                    size="sm"
                    className="mt-1.5 h-8 w-full px-2 text-[11px]"
                    onClick={() => {
                      setActiveTool(current => {
                        if (current === 'boxel-remove') {
                          return 'select'
                        }

                        return 'boxel-remove'
                      })
                    }}
                  >
                    {isBoxelRemoveModeActive ? 'Exit remove boxel' : 'Remove boxel'}
                  </Button>
                  {isBoxelRemoveModeActive
                    ? (
                        <p className="mt-1 text-[10px] text-foreground/55">
                          Remove in 3D. Click one boxel inside an assembly to remove it. Disconnected remnants split into separate assemblies automatically.
                        </p>
                      )
                    : null}
                  <Button
                    variant={isCreateBoardToolActive ? 'default' : 'outline'}
                    size="sm"
                    className="mt-1.5 h-8 w-full px-2 text-[11px]"
                    onClick={() => {
                      setActiveTool(current => {
                        if (current === 'create-board') {
                          return 'select'
                        }

                        return 'create-board'
                      })
                    }}
                  >
                    {isCreateBoardToolActive ? 'Exit draw mode' : 'Draw board'}
                  </Button>
                  {isCreateBoardToolActive
                    ? (
                        <p className="mt-1 text-[10px] text-foreground/55">
                          Create in 3D. Click to start, click again to commit. Hold Shift for free angle. Press Esc to cancel.
                        </p>
                      )
                    : null}
                </div>
                <div className="mt-1.5 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
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
                <Button variant="outline" size="sm" className="h-8 flex-1 px-2 text-[11px]" onClick={removeSelectedContent}>
                  Remove
                </Button>
                <Button size="sm" className="h-8 flex-1 px-2 text-[11px]" onClick={onExportJson}>
                  Export
                  <Download className="size-3" />
                </Button>
              </div>
            </OverlayPanel>

            <OverlayPanel className="pointer-events-auto w-full max-w-[min(100%,280px)] lg:w-[280px]">
              <SectionHeader
                eyebrow="Inspector"
                title={selectedBoard?.name ?? selectedAssembly?.name ?? 'Selection'}
              />

              <div className="max-h-[min(34vh,360px)] lg:max-h-[min(58vh,620px)]">
                {selectedBoard
                  ? <BoardEditorContent board={selectedBoard} onBoardChange={updateBoard} />
                  : (
                      <div className="border border-border bg-card px-3 py-3 text-[12px] text-foreground/60">
                        {selectedAssembly
                          ? `${selectedAssembly.cells.length} boxels in one connected assembly. Face-to-face X/Y contacts are marked as joint candidates and single-boxel removal can split the structure.`
                          : 'Select a board or boxel assembly to inspect it.'}
                      </div>
                    )}
              </div>
            </OverlayPanel>
          </div>
          {isBoardEditDialogOpen && selectedBoard
            ? (
                <div
                  className="pointer-events-auto absolute inset-0 z-40 bg-background"
                  onClick={closeBoardEditDialog}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedBoard.name} 2D preview`}
                    className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_20px)]"
                    onClick={event => event.stopPropagation()}
                  >
                    <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-1 border border-border bg-background/92 px-3 py-2 text-foreground shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:shadow-[0_18px_42px_rgba(0,0,0,0.4)]">
                      <span className="text-[13px] font-semibold tracking-[-0.03em]">
                        {selectedBoard.name}
                      </span>
                      <span className="text-[11px] text-foreground/55">
                        {`${Math.round(boardPreviewSheet?.width ?? 0)} × ${Math.round(boardPreviewSheet?.height ?? 0)} mm`}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Close board editor"
                      className="absolute top-4 right-4 z-10 inline-flex size-9 items-center justify-center border border-border bg-background/92 text-foreground shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-colors hover:bg-muted dark:shadow-[0_18px_42px_rgba(0,0,0,0.4)]"
                      onClick={closeBoardEditDialog}
                    >
                      <X className="size-4" />
                    </button>
                    <svg
                      viewBox={`0 0 ${boardPreviewCanvasWidth} ${boardPreviewCanvasHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="block h-full w-full bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.19_0.008_84)]"
                    >
                      <rect
                        x={NESTING_PANEL_PADDING}
                        y={NESTING_PANEL_PADDING}
                        width={boardPreviewSheet?.width ?? 0}
                        height={boardPreviewSheet?.height ?? 0}
                        fill="transparent"
                        stroke={resolvedTheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'}
                        strokeDasharray="12 8"
                        strokeWidth={2}
                      />
                      {boardPreviewSheet
                        ? (
                            <path
                              d={[
                                pointsToPath(offsetPoints(
                                  boardPreviewSheet.outline,
                                  NESTING_PANEL_PADDING,
                                  NESTING_PANEL_PADDING,
                                )),
                                ...boardPreviewSheet.holes.map(points =>
                                  pointsToPath(offsetPoints(
                                    points,
                                    NESTING_PANEL_PADDING,
                                    NESTING_PANEL_PADDING,
                                  )),
                                ),
                              ].join(' ')}
                              fill={resolvedTheme === 'dark' ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.22)'}
                              fillRule="evenodd"
                              stroke={resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a'}
                              strokeWidth={3}
                            />
                          )
                        : null}
                    </svg>
                  </div>
                </div>
              )
            : null}
        </section>
      </WorkspaceViewport>
    </AppShell>
  )
}
