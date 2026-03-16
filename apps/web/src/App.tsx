import type {
  Board,
  ControlPoint,
  PatternDocument,
} from '@xtool-demo/protocol'
import type { ReactNode } from 'react'
import { Button } from '@workspace/ui/components/button'
import {
  buildPreviewBoard,
  generateSvgDocument,
  getBoundsFromPoints,
  getDocumentBounds,
  rotatePoint,
  sampleShapePoints,
  transformBoardPoints,
} from '@xtool-demo/core'
import {
  createCircleShape,
  createDefaultPatternDocument,
  createRectangleShape,
  createRoundedRectangleShape,
  parsePatternJson,
  stringifyPatternDocument,
} from '@xtool-demo/protocol'
import {
  ArrowRight,
  Box,
  Download,
  FileUp,
  Layers2,
  MoveRight,
  PenLine,
  Shapes,
} from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { clamp, downloadTextFile, formatMillimeters, getRandomId } from '@/lib/utils'

type RouteKey = 'home' | 'editor' | 'generator'
type ShapePreset = 'rectangle' | 'rounded-rectangle' | 'circle'

interface PresetOption {
  id: ShapePreset
  label: string
  description: string
}

const PRESET_OPTIONS: PresetOption[] = [
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

const BOARD_SWATCHES = [
  'oklch(0.67 0.11 57)',
  'oklch(0.72 0.09 108)',
  'oklch(0.67 0.12 229)',
  'oklch(0.74 0.11 18)',
]

function getRouteFromPath(pathname: string): RouteKey {
  if (pathname === '/editor') {
    return 'editor'
  }

  if (pathname === '/generator') {
    return 'generator'
  }

  return 'home'
}

function navigateTo(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function updateDocumentTimestamp(document: PatternDocument): PatternDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
  }
}

function createBoardFromPreset(preset: ShapePreset, index: number): Board {
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

function mapBoardColor(index: number) {
  return BOARD_SWATCHES[index % BOARD_SWATCHES.length] ?? BOARD_SWATCHES[0]
}

function getOutlinePoints(board: Board) {
  return sampleShapePoints(board.outline)
}

function replacePointAt(
  points: ControlPoint[],
  index: number,
  nextPoint: ControlPoint,
) {
  return points.map((point, currentIndex) =>
    currentIndex === index ? nextPoint : point,
  )
}

function updateBoardOutlinePoints(board: Board, points: ControlPoint[]): Board {
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

function BoardCanvas({
  board,
  color,
  isSelected,
  onSelect,
  onPointMove,
}: {
  board: Board
  color: string
  isSelected: boolean
  onSelect: () => void
  onPointMove: (pointIndex: number, nextPoint: ControlPoint) => void
}) {
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

function HomePage() {
  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,oklch(0.98_0.01_85),oklch(0.94_0.02_85))] text-foreground">
      <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 py-8">
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/45">
              XTool Demo
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              Board pattern studio
            </h1>
          </div>
          <nav className="flex gap-2">
            <Button variant="outline" onClick={() => navigateTo('/editor')}>
              Open editor
            </Button>
            <Button onClick={() => navigateTo('/generator')}>
              Open generator
            </Button>
          </nav>
        </div>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/45">
                Creative asset workflow
              </p>
              <h2 className="mt-3 text-[clamp(2.8rem,8vw,6rem)] leading-none font-semibold tracking-[-0.07em] text-black">
                Draw in 2D.
                <br />
                Review in volume.
                <br />
                Export for cutting.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/70">
                A lightweight pattern workflow for wood panel experiments.
                Start from simple boards, adjust their outline, preview their
                thickness, and move straight into SVG output.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<PenLine className="size-4" />}
                title="2D editing"
                text="Direct control-point editing on a single SVG plane keeps the first version predictable."
              />
              <FeatureCard
                icon={<Box className="size-4" />}
                title="3D preview"
                text="A depth preview mirrors the same pattern document, so geometry stays traceable."
              />
              <FeatureCard
                icon={<Download className="size-4" />}
                title="SVG output"
                text="Generator imports the exported JSON and emits a cut-ready SVG document in millimeters."
              />
            </div>
          </div>

          <div className="grid gap-4 self-end">
            <StageCard
              index="01"
              title="Editor"
              text="Create boards from presets, move points, adjust thickness, and export a versioned pattern file."
              cta="Go to editor"
              onClick={() => navigateTo('/editor')}
            />
            <StageCard
              index="02"
              title="Generator"
              text="Import pattern JSON, validate the schema, preview the resulting geometry, and download SVG."
              cta="Go to generator"
              onClick={() => navigateTo('/generator')}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <article className="border border-black/10 bg-white/70 p-4">
      <div className="mb-4 flex size-8 items-center justify-center border border-black/10 bg-black text-white">
        {icon}
      </div>
      <h3 className="text-sm font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/65">{text}</p>
    </article>
  )
}

function StageCard({
  index,
  title,
  text,
  cta,
  onClick,
}: {
  index: string
  title: string
  text: string
  cta: string
  onClick: () => void
}) {
  return (
    <article className="border border-black/10 bg-[oklch(0.97_0.015_85)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/45">
        {index}
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-black/70">{text}</p>
      <Button className="mt-6" onClick={onClick}>
        {cta}
        <ArrowRight />
      </Button>
    </article>
  )
}

function SectionHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string
  title: string
  meta?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-black">
          {title}
        </h2>
      </div>
      {meta ? <p className="text-xs text-black/55">{meta}</p> : null}
    </div>
  )
}

function AppShell({
  route,
  children,
}: {
  route: RouteKey
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,oklch(0.98_0.01_85),oklch(0.95_0.02_84))] text-black">
      <div className="mx-auto flex min-h-svh max-w-[1700px] flex-col px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-4 border border-black/10 bg-white/85 px-4 py-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-3 text-left"
              onClick={() => navigateTo('/')}
            >
              <div className="flex size-10 items-center justify-center border border-black/10 bg-black text-white">
                <Layers2 className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/45">
                  Studio / pattern
                </p>
                <h1 className="text-lg font-semibold tracking-[-0.04em]">
                  Board Pattern Studio
                </h1>
              </div>
            </button>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Button
              variant={route === 'editor' ? 'default' : 'outline'}
              onClick={() => navigateTo('/editor')}
            >
              Editor
            </Button>
            <Button
              variant={route === 'generator' ? 'default' : 'outline'}
              onClick={() => navigateTo('/generator')}
            >
              Generator
            </Button>
          </nav>
        </header>
        <div className="mt-4 flex-1">{children}</div>
      </div>
    </div>
  )
}

function EditorPage({
  document,
  selectedBoardId,
  onSelectBoard,
  onDocumentChange,
  onExportJson,
}: {
  document: PatternDocument
  selectedBoardId: string
  onSelectBoard: (boardId: string) => void
  onDocumentChange: (document: PatternDocument) => void
  onExportJson: () => void
}) {
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
          const x = Number(rawX)
          const y = Number(rawY)
          return { x, y }
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

  function addBoard(preset: ShapePreset) {
    const nextBoard = createBoardFromPreset(preset, document.boards.length)
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
            meta={selectedBoard ? selectedBoard.id : undefined}
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

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
        {label}
      </span>
      {children}
    </label>
  )
}

function NumberInput({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
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

function GeneratorPage({
  document,
  lastImportedJson,
  parseIssues,
  onImportJson,
  onUseEditorDocument,
  onDownloadSvg,
}: {
  document: PatternDocument
  lastImportedJson: string
  parseIssues: string[]
  onImportJson: (json: string) => void
  onUseEditorDocument: () => void
  onDownloadSvg: () => void
}) {
  const svgMarkup = useMemo(() => generateSvgDocument(document), [document])
  const bounds = useMemo(() => getDocumentBounds(document), [document])
  const canvasViewBox = [
    bounds.minX - 48,
    bounds.minY - 48,
    Math.max(400, bounds.width + 96),
    Math.max(260, bounds.height + 96),
  ].join(' ')

  return (
    <AppShell route="generator">
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border border-black/10 bg-white/80 p-4">
          <SectionHeader
            eyebrow="Generator"
            title="Pattern import"
            meta={`${document.boards.length} boards ready`}
          />

          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-black/25 bg-[oklch(0.97_0.015_85)] px-4 py-6 text-sm font-medium text-black/75 transition-colors hover:bg-[oklch(0.95_0.02_84)]">
              <FileUp className="size-4" />
              Upload pattern.json
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) {
                    return
                  }

                  void file.text().then((content) => {
                    onImportJson(content)
                  })
                }}
              />
            </label>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onUseEditorDocument}>
                Use editor output
              </Button>
              <Button className="flex-1" onClick={onDownloadSvg}>
                Download SVG
                <Download />
              </Button>
            </div>

            <div className="border border-black/10 bg-white">
              <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
                <h3 className="text-sm font-semibold tracking-[-0.03em]">
                  Validation
                </h3>
                <span className="text-xs text-black/50">
                  v
                  {document.version}
                </span>
              </div>
              <div className="p-3 text-sm text-black/70">
                {parseIssues.length === 0
                  ? (
                    <p>Document is valid. Ready to generate SVG output.</p>
                  )
                  : (
                    <ul className="space-y-2 text-[13px] text-[oklch(0.52_0.18_28)]">
                      {parseIssues.map(issue => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  )}
              </div>
            </div>

            <div className="border border-black/10 bg-white p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[-0.03em]">
                <MoveRight className="size-4" />
                Imported JSON
              </div>
              <pre className="max-h-90 overflow-auto text-xs leading-6 text-black/60">
                {lastImportedJson}
              </pre>
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="border border-black/10 bg-white/85 p-4">
            <SectionHeader
              eyebrow="Preview"
              title="Generated cut layout"
              meta="All boards are exported in millimeters."
            />
            <div className="mt-4 overflow-hidden border border-black/10 bg-[oklch(0.985_0.005_85)]">
              <svg viewBox={canvasViewBox} className="h-105 w-full">
                {document.boards.map((board, index) => {
                  const points = transformBoardPoints(board)
                  return (
                    <polygon
                      key={board.id}
                      points={points.map(point => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke={mapBoardColor(index)}
                      strokeWidth={1.8}
                    />
                  )
                })}
              </svg>
            </div>
          </div>

          <div className="border border-black/10 bg-white/85 p-4">
            <SectionHeader
              eyebrow="Markup"
              title="SVG payload"
              meta="This is the exact exported document."
            />
            <pre className="mt-4 max-h-80 overflow-auto border border-black/10 bg-[oklch(0.97_0.015_85)] p-4 text-xs leading-6 text-black/60 whitespace-pre-wrap break-all">
              {svgMarkup}
            </pre>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

export function App() {
  const [route, setRoute] = useState<RouteKey>(() =>
    getRouteFromPath(window.location.pathname),
  )
  const [editorDocument, setEditorDocument] = useState<PatternDocument>(
    createDefaultPatternDocument,
  )
  const [generatorDocument, setGeneratorDocument] = useState<PatternDocument>(
    createDefaultPatternDocument,
  )
  const [selectedBoardId, setSelectedBoardId] = useState(
    editorDocument.boards[0]?.id ?? '',
  )
  const [lastImportedJson, setLastImportedJson] = useState(() =>
    stringifyPatternDocument(generatorDocument),
  )
  const [parseIssues, setParseIssues] = useState<string[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function handleEditorDocumentChange(nextDocument: PatternDocument) {
    startTransition(() => {
      setEditorDocument(nextDocument)
    })
  }

  function handleExportJson() {
    const json = stringifyPatternDocument(editorDocument)
    setLastImportedJson(json)
    setGeneratorDocument(editorDocument)
    setParseIssues([])
    downloadTextFile(json, 'pattern.json', 'application/json')
  }

  function handleImportJson(json: string) {
    setLastImportedJson(json)
    const parsed = parsePatternJson(json)
    if (!parsed.ok) {
      setParseIssues(parsed.issues)
      return
    }

    setGeneratorDocument(parsed.value)
    setParseIssues([])
  }

  function handleUseEditorDocument() {
    const json = stringifyPatternDocument(editorDocument)
    setLastImportedJson(json)
    setGeneratorDocument(editorDocument)
    setParseIssues([])
  }

  function handleDownloadSvg() {
    downloadTextFile(
      generateSvgDocument(generatorDocument),
      'pattern.svg',
      'image/svg+xml',
    )
  }

  if (route === 'editor') {
    return (
      <EditorPage
        document={editorDocument}
        selectedBoardId={selectedBoardId}
        onSelectBoard={setSelectedBoardId}
        onDocumentChange={handleEditorDocumentChange}
        onExportJson={handleExportJson}
      />
    )
  }

  if (route === 'generator') {
    return (
      <GeneratorPage
        document={generatorDocument}
        lastImportedJson={lastImportedJson}
        parseIssues={parseIssues}
        onImportJson={handleImportJson}
        onUseEditorDocument={handleUseEditorDocument}
        onDownloadSvg={handleDownloadSvg}
      />
    )
  }

  return <HomePage />
}
