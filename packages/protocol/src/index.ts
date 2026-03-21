import { z } from 'zod'

export interface PatternMetadata {
  name: string
  unit: 'mm'
  createdAt: string
  updatedAt: string
}

export interface ControlPoint {
  x: number
  y: number
}

export interface BoxelCell {
  x: number
  y: number
  z: number
}

export interface PathSegment {
  kind: 'line' | 'quadratic' | 'cubic'
  points: ControlPoint[]
}

export interface Path2DShape {
  closed: boolean
  segments: PathSegment[]
}

export interface BoardTransform {
  x: number
  y: number
  rotation: number
  orientation?: 'flat' | 'upright'
}

export interface Board {
  id: string
  name: string
  thickness: number
  material?: string
  transform: BoardTransform
  outline: Path2DShape
  holes: Path2DShape[]
}

export interface BoxelAssembly {
  id: string
  name: string
  cellSize: number
  origin: ControlPoint
  cells: BoxelCell[]
}

export interface PatternDocument {
  version: '1.0'
  metadata: PatternMetadata
  boards: Board[]
  assemblies: BoxelAssembly[]
}

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

const boxelCellSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
})

const pathSegmentSchema = z.object({
  kind: z.enum(['line', 'quadratic', 'cubic']),
  points: z.array(pointSchema).min(1),
})

const path2DShapeSchema = z.object({
  closed: z.boolean(),
  segments: z.array(pathSegmentSchema).min(1),
})

const boardTransformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
  orientation: z.enum(['flat', 'upright']).optional(),
})

const boardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  thickness: z.number().positive(),
  material: z.string().min(1).optional(),
  transform: boardTransformSchema,
  outline: path2DShapeSchema,
  holes: z.array(path2DShapeSchema),
})

const boxelAssemblySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cellSize: z.number().positive(),
  origin: pointSchema,
  cells: z.array(boxelCellSchema),
})

export const patternDocumentSchema = z.object({
  version: z.literal('1.0'),
  metadata: z.object({
    name: z.string().min(1),
    unit: z.literal('mm'),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
  boards: z.array(boardSchema),
  assemblies: z.array(boxelAssemblySchema).default([]),
})

export interface PatternParseResult {
  ok: true
  value: PatternDocument
}

export interface PatternParseError {
  ok: false
  issues: string[]
}

export type PatternParseOutcome = PatternParseResult | PatternParseError

export function createLineShape(points: ControlPoint[]): Path2DShape {
  if (points.length < 2) {
    throw new Error('Line shape requires at least two points')
  }

  return {
    closed: true,
    segments: points.map(point => ({
      kind: 'line',
      points: [{ x: point.x, y: point.y }],
    })),
  }
}

export function createRectangleShape(
  width: number,
  height: number,
): Path2DShape {
  return createLineShape([
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ])
}

export function createRoundedRectangleShape(
  width: number,
  height: number,
  radius: number,
): Path2DShape {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2))

  return {
    closed: true,
    segments: [
      { kind: 'line', points: [{ x: safeRadius, y: 0 }] },
      {
        kind: 'quadratic',
        points: [
          { x: width, y: 0 },
          { x: width, y: safeRadius },
        ],
      },
      { kind: 'line', points: [{ x: width, y: height - safeRadius }] },
      {
        kind: 'quadratic',
        points: [
          { x: width, y: height },
          { x: width - safeRadius, y: height },
        ],
      },
      { kind: 'line', points: [{ x: safeRadius, y: height }] },
      {
        kind: 'quadratic',
        points: [
          { x: 0, y: height },
          { x: 0, y: height - safeRadius },
        ],
      },
      { kind: 'line', points: [{ x: 0, y: safeRadius }] },
      {
        kind: 'quadratic',
        points: [
          { x: 0, y: 0 },
          { x: safeRadius, y: 0 },
        ],
      },
    ],
  }
}

export function createCircleShape(
  radius: number,
  segments = 24,
): Path2DShape {
  const points: ControlPoint[] = []

  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    points.push({
      x: radius + Math.cos(angle) * radius,
      y: radius + Math.sin(angle) * radius,
    })
  }

  return createLineShape(points)
}

function getTimestamp() {
  return new Date().toISOString()
}

export function createDefaultPatternDocument(): PatternDocument {
  const timestamp = getTimestamp()

  return {
    version: '1.0',
    metadata: {
      name: 'Studio Panel Set',
      unit: 'mm',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    boards: [],
    assemblies: [],
  }
}

export function parsePatternDocument(value: unknown): PatternParseOutcome {
  const result = patternDocumentSchema.safeParse(value)
  if (result.success) {
    return {
      ok: true,
      value: result.data,
    }
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'document'
      return `${path}: ${issue.message}`
    }),
  }
}

export function parsePatternJson(input: string): PatternParseOutcome {
  try {
    const parsed: unknown = JSON.parse(input)
    return parsePatternDocument(parsed)
  }
  catch (error) {
    if (error instanceof Error) {
      return {
        ok: false,
        issues: [error.message],
      }
    }

    return {
      ok: false,
      issues: ['Unknown JSON parse error'],
    }
  }
}

export function stringifyPatternDocument(document: PatternDocument) {
  return JSON.stringify(document, null, 2)
}
