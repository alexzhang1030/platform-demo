import type {
  Board,
  ControlPoint,
  Path2DShape,
  PatternDocument,
} from '@xtool-demo/protocol'
import { buildBoxelAssemblyBounds } from './boxel'

export * from './boxel'
export * from './nesting'
export * from './upright-board'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface PreviewFace {
  id: string
  points: string
  shade: 'top' | 'side' | 'front'
}

export interface PreviewBoard {
  id: string
  name: string
  topPath: string
  faces: PreviewFace[]
}

export type PreviewViewMode = 'front' | 'isometric' | 'side' | 'top'

interface PreviewProjection {
  depthX: number
  depthY: number
}

const PREVIEW_PROJECTIONS: Record<PreviewViewMode, PreviewProjection> = {
  front: {
    depthX: 0,
    depthY: -1,
  },
  isometric: {
    depthX: 0.75,
    depthY: -0.45,
  },
  side: {
    depthX: 1,
    depthY: 0,
  },
  top: {
    depthX: 0.18,
    depthY: -1.15,
  },
}

export function rotatePoint(point: ControlPoint, angle: number): ControlPoint {
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

export function sampleShapePoints(shape: Path2DShape): ControlPoint[] {
  const points: ControlPoint[] = []

  for (const segment of shape.segments) {
    if (segment.kind === 'line') {
      const point = segment.points[0]
      if (point) {
        points.push(point)
      }
      continue
    }

    if (segment.kind === 'quadratic') {
      const control = segment.points[0]
      const end = segment.points[1]
      const start = points.at(-1)

      if (!control || !end || !start) {
        continue
      }

      for (let index = 1; index <= 8; index += 1) {
        const t = index / 8
        const mt = 1 - t
        points.push({
          x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
          y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
        })
      }
      continue
    }

    const control1 = segment.points[0]
    const control2 = segment.points[1]
    const end = segment.points[2]
    const start = points.at(-1)

    if (!control1 || !control2 || !end || !start) {
      continue
    }

    for (let index = 1; index <= 10; index += 1) {
      const t = index / 10
      const mt = 1 - t
      points.push({
        x:
          mt * mt * mt * start.x
          + 3 * mt * mt * t * control1.x
          + 3 * mt * t * t * control2.x
          + t * t * t * end.x,
        y:
          mt * mt * mt * start.y
          + 3 * mt * mt * t * control1.y
          + 3 * mt * t * t * control2.y
          + t * t * t * end.y,
      })
    }
  }

  return points
}

export function transformBoardPoints(board: Board): ControlPoint[] {
  return sampleShapePoints(board.outline).map((point) => {
    const rotated = rotatePoint(point, board.transform.rotation)
    return {
      x: rotated.x + board.transform.x,
      y: rotated.y + board.transform.y,
    }
  })
}

export function getBoundsFromPoints(points: ControlPoint[]): Bounds {
  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }
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

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function getDocumentBounds(document: PatternDocument): Bounds {
  const points = document.boards.flatMap(board => transformBoardPoints(board))

  for (const assembly of document.assemblies) {
    const bounds = buildBoxelAssemblyBounds(assembly)

    if (bounds.width === 0 && bounds.height === 0 && bounds.depth === 0) {
      continue
    }

    points.push(
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    )
  }

  return getBoundsFromPoints(points)
}

export function buildSvgPath(shape: Path2DShape): string {
  const firstSegment = shape.segments[0]
  const firstPoint = firstSegment?.points[0]
  if (!firstPoint) {
    return ''
  }

  let path = `M ${firstPoint.x} ${firstPoint.y}`

  for (let index = 1; index < shape.segments.length; index += 1) {
    const segment = shape.segments[index]
    if (!segment) {
      continue
    }

    if (segment.kind === 'line') {
      const end = segment.points[0]
      if (end) {
        path += ` L ${end.x} ${end.y}`
      }
      continue
    }

    if (segment.kind === 'quadratic') {
      const control = segment.points[0]
      const end = segment.points[1]
      if (control && end) {
        path += ` Q ${control.x} ${control.y} ${end.x} ${end.y}`
      }
      continue
    }

    const control1 = segment.points[0]
    const control2 = segment.points[1]
    const end = segment.points[2]
    if (control1 && control2 && end) {
      path += ` C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`
    }
  }

  if (shape.closed) {
    path += ' Z'
  }

  return path
}

export function buildBoardSvgPath(board: Board): string {
  const outlinePath = buildSvgPath(board.outline)
  const holePaths = board.holes.map(hole => buildSvgPath(hole))
  return [outlinePath, ...holePaths].join(' ')
}

function projectPoint(
  point: ControlPoint,
  depth: number,
  projection: PreviewProjection,
): ControlPoint {
  return {
    x: point.x + depth * projection.depthX,
    y: point.y + depth * projection.depthY,
  }
}

export function buildPreviewBoard(
  board: Board,
  viewMode: PreviewViewMode = 'isometric',
): PreviewBoard {
  const points = transformBoardPoints(board)
  const depth = Math.max(12, board.thickness * 1.3)
  const projection = PREVIEW_PROJECTIONS[viewMode]
  const projected = points.map(point => projectPoint(point, depth, projection))

  const topPath
    = `${points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')} Z`

  const faces: PreviewFace[] = []

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const currentTop = projected[index]
    const nextTop = projected[(index + 1) % projected.length]

    if (!current || !next || !currentTop || !nextTop) {
      continue
    }

    const facePoints = [
      `${current.x},${current.y}`,
      `${next.x},${next.y}`,
      `${nextTop.x},${nextTop.y}`,
      `${currentTop.x},${currentTop.y}`,
    ].join(' ')

    const shade
      = viewMode === 'top'
        ? 'top'
        : viewMode === 'front'
          ? 'front'
          : next.y > current.y
            ? 'front'
            : 'side'
    faces.push({
      id: `${board.id}-${index}`,
      points: facePoints,
      shade,
    })
  }

  faces.push({
    id: `${board.id}-top`,
    points: projected.map(point => `${point.x},${point.y}`).join(' '),
    shade: 'top',
  })

  return {
    id: board.id,
    name: board.name,
    topPath,
    faces,
  }
}

export function generateSvgDocument(document: PatternDocument): string {
  const bounds = getDocumentBounds(document)
  const padding = 24
  const viewBox = [
    bounds.minX - padding,
    bounds.minY - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  ].join(' ')

  const paths = document.boards
    .map((board) => {
      const transformed = transformBoardPoints(board)
      const d = `${transformed
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ')} Z`

      return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" />`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${bounds.width + padding * 2}mm" height="${bounds.height + padding * 2}mm"><g>${paths}</g></svg>`
}
