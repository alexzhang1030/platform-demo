import type {
  Board,
  ControlPoint,
  Path2DShape,
  PatternDocument,
} from '@platform-demo/protocol'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
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
  return getBoundsFromPoints(points)
}

export function calculatePathArea(points: ControlPoint[]): number {
  if (points.length < 3) {
    return 0
  }

  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const p1 = points[index]
    const p2 = points[(index + 1) % points.length]
    if (p1 && p2) {
      area += p1.x * p2.y - p2.x * p1.y
    }
  }

  return Math.abs(area) / 2
}

export function calculatePathPerimeter(points: ControlPoint[]): number {
  if (points.length < 2) {
    return 0
  }

  let perimeter = 0
  for (let index = 0; index < points.length; index += 1) {
    const p1 = points[index]
    const p2 = points[(index + 1) % points.length]
    if (p1 && p2) {
      perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y)
    }
  }

  return perimeter
}
