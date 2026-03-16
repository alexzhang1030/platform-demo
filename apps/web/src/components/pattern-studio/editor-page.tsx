import type {
  Board,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'
import { Button } from '@workspace/ui/components/button'
import {
  buildPreviewBoard,
  getBoundsFromPoints,
  getDocumentBounds,
  rotatePoint,
  sampleShapePoints,
} from '@xtool-demo/core'
import { Download, Shapes } from 'lucide-react'
import { useMemo } from 'react'

import {
  createBoardFromPreset,
  mapBoardColor,
  PRESET_OPTIONS,
  replacePointAt,
  updateBoardOutlinePoints,
  updateDocumentTimestamp,
} from '@/lib/pattern-studio'
import { clamp, formatMillimeters } from '@/lib/utils'

import { AppShell, SectionHeader } from './chrome'

interface EditorPageProps {
  document: PatternDocument
  selectedBoardId: string
  onSelectBoard: (boardId: string) => void
  onDocumentChange: (document: PatternDocument) => void
  onExportJson: () => void
}

interface BoardCanvasProps {
  board: Board
  color: string
  isSelected: boolean
  onSelect: () => void
  onPointMove: (pointIndex: number, nextPoint: ControlPoint) => void
}

interface FieldProps {
  label: string
  children: React.ReactNode
}

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
}

function getOutlinePoints(board: Board) {
  return sampleShapePoints(board.outline)
}

function BoardCanvas({
  board,
  color,
  isSelected,
  onSelect,
  onPointMove,
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
  const strokeWidth = isSelected ? 2.5 : 1.4

  return (
    <g>
      <polygon
        points={worldPoints.map(point => `${point.x},${point.y}`).join(' ')}
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        className="cursor-pointer transition-opacity"
        onPointerDown={onSelect}
      />
      {isSelected
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
                r={6}
                fill="white"
                stroke={color}
                strokeWidth={2}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()

                  const svg = event.currentTarget.ownerSVGElement
                  if (!svg) {
                    return
                  }

                  const viewBox = svg.viewBox.baseVal
                  const scaleX = viewBox.width / svg.clientWidth
                  const scaleY = viewBox.height / svg.clientHeight

                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    const rect = svg.getBoundingClientRect()
                    const localX
                      = (moveEvent.clientX - rect.left) * scaleX + viewBox.x
                    const localY
                      = (moveEvent.clientY - rect.top) * scaleY + viewBox.y

                    const nextLocalPoint = rotatePoint(
                      {
                        x: localX - board.transform.x,
                        y: localY - board.transform.y,
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
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
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
      className="h-10 w-full border border-black/10 bg-white px-3 text-sm outline-none focus:border-black"
    />
  )
}

export function EditorPage({
  document,
  selectedBoardId,
  onSelectBoard,
  onDocumentChange,
  onExportJson,
}: EditorPageProps) {
  const selectedBoard = document.boards.find(board => board.id === selectedBoardId)
  const bounds = useMemo(() => getDocumentBounds(document), [document])
  const canvasViewBox = [
    bounds.minX - 60,
    bounds.minY - 60,
    Math.max(400, bounds.width + 120),
    Math.max(320, bounds.height + 120),
  ].join(' ')
  const previewBoards = useMemo(
    () => document.boards.map(board => buildPreviewBoard(board)),
    [document],
  )
  const previewBounds = useMemo(() => {
    const previewPoints = previewBoards.flatMap(board =>
      board.faces.flatMap(face =>
        face.points.split(' ').map((item) => {
          const [rawX, rawY] = item.split(',')
          return {
            x: Number(rawX),
            y: Number(rawY),
          }
        }),
      ),
    )

    return getBoundsFromPoints(previewPoints)
  }, [previewBoards])
  const previewViewBox = [
    previewBounds.minX - 80,
    previewBounds.minY - 90,
    Math.max(460, previewBounds.width + 160),
    Math.max(360, previewBounds.height + 180),
  ].join(' ')

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
    onSelectBoard(nextBoard.id)
  }

  function removeSelectedBoard() {
    if (document.boards.length <= 1) {
      return
    }

    const filteredBoards = document.boards.filter(
      board => board.id !== selectedBoardId,
    )
    const nextDocument = updateDocumentTimestamp({
      ...document,
      boards: filteredBoards,
    })
    onDocumentChange(nextDocument)

    const nextSelectedBoard = filteredBoards[0]
    if (nextSelectedBoard) {
      onSelectBoard(nextSelectedBoard.id)
    }
  }

  return (
    <AppShell route="editor">
      <div className="grid h-full gap-4 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="border border-black/10 bg-white/80 p-4">
          <SectionHeader
            eyebrow="Boards"
            title="Pattern document"
            meta={`${document.boards.length} boards`}
          />
          <div className="mt-5 space-y-3">
            {document.boards.map((board, index) => {
              const active = board.id === selectedBoardId
              return (
                <button
                  type="button"
                  key={board.id}
                  className={`flex w-full items-start gap-3 border p-3 text-left transition-colors ${active
                    ? 'border-black bg-[oklch(0.95_0.02_84)]'
                    : 'border-black/10 bg-white hover:bg-black/5'
                  }`}
                  onClick={() => onSelectBoard(board.id)}
                >
                  <span
                    className="mt-1 block size-3 shrink-0"
                    style={{ backgroundColor: mapBoardColor(index) }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold tracking-[-0.03em]">
                      {board.name}
                    </span>
                    <span className="mt-1 block text-xs text-black/55">
                      {formatMillimeters(board.thickness)}
                      {' '}
                      ·
                      {' '}
                      {board.material ?? 'material free'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 border-t border-black/10 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
              Add board
            </p>
            <div className="mt-3 space-y-2">
              {PRESET_OPTIONS.map(preset => (
                <button
                  type="button"
                  key={preset.id}
                  className="w-full border border-black/10 bg-white p-3 text-left hover:bg-black/5"
                  onClick={() => addBoard(preset.id)}
                >
                  <span className="block text-sm font-semibold tracking-[-0.03em]">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/60">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={removeSelectedBoard}>
              Remove
            </Button>
            <Button className="flex-1" onClick={onExportJson}>
              Export
              <Download />
            </Button>
          </div>
        </aside>

        <section className="grid gap-4">
          <div className="border border-black/10 bg-white/85 p-4">
            <SectionHeader
              eyebrow="Canvas"
              title="2D outline editor"
              meta="Drag white points to reshape the selected board."
            />
            <div className="mt-4 overflow-hidden border border-black/10 bg-[linear-gradient(135deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px),linear-gradient(45deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_20px)]">
              <svg
                viewBox={canvasViewBox}
                className="h-[440px] w-full bg-[oklch(0.985_0.005_85)]"
                onPointerDown={() => {
                  if (selectedBoard) {
                    onSelectBoard(selectedBoard.id)
                  }
                }}
              >
                {document.boards.map((board, index) => (
                  <BoardCanvas
                    key={board.id}
                    board={board}
                    color={mapBoardColor(index)}
                    isSelected={board.id === selectedBoardId}
                    onSelect={() => onSelectBoard(board.id)}
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
              </svg>
            </div>
          </div>

          <div className="border border-black/10 bg-white/85 p-4">
            <SectionHeader
              eyebrow="Preview"
              title="3D volume study"
              meta="Depth is derived from the same pattern document."
            />
            <div className="mt-4 overflow-hidden border border-black/10 bg-[linear-gradient(180deg,oklch(0.985_0.006_85),oklch(0.93_0.015_85))]">
              <svg viewBox={previewViewBox} className="h-[320px] w-full">
                {previewBoards.map((board, index) => {
                  const color = mapBoardColor(index)
                  return (
                    <g key={board.id}>
                      {board.faces.map((face) => {
                        const fill
                          = face.shade === 'top'
                            ? `color-mix(in oklch, ${color} 65%, white)`
                            : face.shade === 'front'
                              ? `color-mix(in oklch, ${color} 45%, black)`
                              : `color-mix(in oklch, ${color} 28%, black)`

                        return (
                          <polygon
                            key={face.id}
                            points={face.points}
                            fill={fill}
                            stroke="rgba(0,0,0,0.18)"
                            strokeWidth={1.1}
                          />
                        )
                      })}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </section>

        <aside className="border border-black/10 bg-white/80 p-4">
          <SectionHeader
            eyebrow="Inspector"
            title={selectedBoard?.name ?? 'No board selected'}
            meta={selectedBoard?.id}
          />

          {selectedBoard
            ? (
                <div className="mt-5 space-y-5">
                  <Field label="Board name">
                    <input
                      value={selectedBoard.name}
                      onChange={event =>
                        updateBoard({
                          ...selectedBoard,
                          name: event.target.value,
                        })}
                      className="h-10 w-full border border-black/10 bg-white px-3 text-sm outline-none focus:border-black"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
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

                  <div className="grid gap-4 sm:grid-cols-2">
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
                      className="h-10 w-full border border-black/10 bg-white px-3 text-sm outline-none focus:border-black"
                    />
                  </Field>

                  <div className="border border-black/10 bg-[oklch(0.97_0.015_85)] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.03em]">
                      <Shapes className="size-4" />
                      Active board summary
                    </div>
                    <dl className="mt-4 space-y-2 text-sm text-black/65">
                      <div className="flex items-center justify-between gap-3">
                        <dt>Outline points</dt>
                        <dd>{getOutlinePoints(selectedBoard).length}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Thickness</dt>
                        <dd>{formatMillimeters(selectedBoard.thickness)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Rotation</dt>
                        <dd>
                          {Math.round(selectedBoard.transform.rotation)}
                          °
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )
            : null}
        </aside>
      </div>
    </AppShell>
  )
}
