import type {
  Board,
  Path2DShape,
  PatternDocument,
} from '@platform-demo/protocol'
import {
  createDefaultPatternDocument,
  createRectangleShape,
  createRoundedRectangleShape,
} from '@platform-demo/protocol'
import { getBoundsFromPoints, sampleShapePoints } from '@platform-demo/core'

import {
  createEditorSelection,
  updateDocumentTimestamp,
} from './pattern-studio'
import { getRandomId } from './utils'

export type AiParseStatus = 'failed' | 'partial' | 'ready'
export type AiCommandMode = 'generate' | 'patch'
export type AiJointType = 'finger-joint' | 'slot' | 'none'
export type AiStructureType = 'box' | 'tray'
export type AiCheckSeverity = 'fail' | 'warning' | 'pass'
export type ResizeMode = 'absolute' | 'delta'

export interface AiGenerateStructureCommand {
  type: 'generate-structure'
  structure: AiStructureType
  dimensions: {
    width: number
    height: number
    depth: number
  }
  material: {
    method: 'laser-cut'
    thickness: number | null
  }
  joints: {
    type: AiJointType
  }
  features: {
    handleCutout: boolean
    lid: boolean
  }
}

export interface AiResizeOperation {
  type: 'resize'
  mode: ResizeMode
  width?: number
  height?: number
  depth?: number
}

export interface AiAdjustThicknessOperation {
  type: 'adjust-thickness'
  thickness: number
}

export interface AiToggleHandleCutoutOperation {
  type: 'toggle-handle-cutout'
  enabled: boolean
}

export interface AiChangeJointOperation {
  type: 'change-joint'
  jointType: AiJointType
}

export type AiPatchOperation =
  | AiResizeOperation
  | AiAdjustThicknessOperation
  | AiToggleHandleCutoutOperation
  | AiChangeJointOperation

export interface AiPatchStructureCommand {
  type: 'patch-structure'
  operations: AiPatchOperation[]
}

export type AiExecutableCommand = AiGenerateStructureCommand | AiPatchStructureCommand

export interface AiCommandEnvelope {
  mode: AiCommandMode
  prompt: string
  confidence: number
  summary: string
  status: AiParseStatus
  missing: string[]
  command: AiExecutableCommand | null
}

export interface AiManufacturingCheck {
  code: string
  detail: string
  label: string
  severity: AiCheckSeverity
}

export interface AiAppliedCommandResult {
  changed: boolean
  command: AiExecutableCommand | null
  document: PatternDocument
  executionSteps: string[]
  selection: ReturnType<typeof createEditorSelection>
}

interface AiStructureSpec {
  structure: AiStructureType
  width: number
  height: number
  depth: number
  thickness: number
  jointType: AiJointType
  handleCutout: boolean
}

const DEFAULT_JOINT: AiJointType = 'none'
const DEFAULT_STRUCTURE: AiStructureType = 'box'
const DEFAULT_METHOD = 'laser-cut'
const FLAT_PATTERN_GAP = 24

export function interpretAiPrompt(prompt: string): AiCommandEnvelope {
  const normalizedPrompt = prompt.trim()
  const loweredPrompt = normalizedPrompt.toLowerCase()

  if (normalizedPrompt.length === 0) {
    return {
      mode: 'generate',
      prompt,
      confidence: 0,
      summary: 'Prompt is empty.',
      status: 'failed',
      missing: ['prompt'],
      command: null,
    }
  }

  if (isPatchPrompt(loweredPrompt)) {
    const operations = parsePatchOperations(loweredPrompt)
    if (operations.length === 0) {
      return {
        mode: 'patch',
        prompt,
        confidence: 0.28,
        summary: 'Patch intent detected, but no supported structural operation was found.',
        status: 'failed',
        missing: [],
        command: null,
      }
    }

    return {
      mode: 'patch',
      prompt,
      confidence: 0.86,
      summary: `Patch ${operations.length} structural operation${operations.length > 1 ? 's' : ''}.`,
      status: 'ready',
      missing: [],
      command: {
        type: 'patch-structure',
        operations,
      },
    }
  }

  const structure = parseStructureType(loweredPrompt)
  if (!structure) {
    return {
      mode: 'generate',
      prompt,
      confidence: 0.12,
      summary: 'Could not map the prompt to a supported structure type.',
      status: 'failed',
      missing: [],
      command: null,
    }
  }

  const dimensions = parseDimensions(loweredPrompt)
  const thickness = parseThickness(loweredPrompt)
  const missing: string[] = []

  if (!dimensions) {
    missing.push('dimensions')
  }

  if (thickness === null) {
    missing.push('material thickness')
  }

  const generateCommand: AiGenerateStructureCommand = {
    type: 'generate-structure',
    structure,
    dimensions: dimensions ?? {
      width: 120,
      height: 80,
      depth: 60,
    },
    material: {
      method: DEFAULT_METHOD,
      thickness,
    },
    joints: {
      type: parseJointType(loweredPrompt),
    },
    features: {
      handleCutout: includesAny(loweredPrompt, ['提手', 'handle']),
      lid: includesAny(loweredPrompt, ['盖', 'lid']),
    },
  }

  return {
    mode: 'generate',
    prompt,
    confidence: missing.length === 0 ? 0.9 : 0.55,
    summary: missing.length === 0
      ? `Generate a ${generateCommand.structure} with a deterministic flat layout.`
      : `Generate a ${generateCommand.structure}, but some manufacturing parameters are missing.`,
    status: missing.length === 0 ? 'ready' : 'partial',
    missing,
    command: generateCommand,
  }
}

export function applyAiCommand(
  document: PatternDocument,
  envelope: AiCommandEnvelope,
): AiAppliedCommandResult {
  const firstBoardId = document.boards[0]?.id ?? ''
  if (envelope.status !== 'ready' || !envelope.command) {
    return {
      changed: false,
      command: envelope.command,
      document,
      executionSteps: ['Parse prompt into structure intent'],
      selection: createEditorSelection(firstBoardId),
    }
  }

  if (envelope.command.type === 'generate-structure') {
    const generated = buildDocumentFromSpec(getSpecFromGenerateCommand(envelope.command), document.metadata.createdAt)
    return {
      changed: true,
      command: envelope.command,
      document: generated,
      executionSteps: buildExecutionSteps(envelope.command),
      selection: createEditorSelection(generated.boards[0]?.id ?? ''),
    }
  }

  const currentSpec = inferStructureSpec(document)
  const patchedSpec = applyPatchOperations(currentSpec, envelope.command.operations)
  const patchedDocument = buildDocumentFromSpec(patchedSpec, document.metadata.createdAt)
  return {
    changed: true,
    command: envelope.command,
    document: patchedDocument,
    executionSteps: buildExecutionSteps(envelope.command),
    selection: createEditorSelection(patchedDocument.boards[0]?.id ?? ''),
  }
}

export function runManufacturingChecks(
  document: PatternDocument,
  command: AiExecutableCommand | null,
): AiManufacturingCheck[] {
  const checks: AiManufacturingCheck[] = []
  const spec = inferStructureSpec(document)

  if (document.boards.length === 0) {
    checks.push({
      code: 'empty-document',
      detail: 'No boards were generated.',
      label: 'No physical panels available for manufacturing.',
      severity: 'fail',
    })
    return checks
  }

  if (spec.thickness <= 0) {
    checks.push({
      code: 'missing-thickness',
      detail: 'Board thickness must be positive.',
      label: 'Material thickness is missing.',
      severity: 'fail',
    })
  }

  const minimumSpan = Math.min(spec.width, spec.height, spec.depth)
  if (minimumSpan <= spec.thickness * 2) {
    checks.push({
      code: 'thin-span',
      detail: 'The smallest span is too close to the material thickness for comfortable manufacturing tolerance.',
      label: 'One or more panels look too slender.',
      severity: 'warning',
    })
  }

  if (command?.type === 'generate-structure' && command.material.thickness === null) {
    checks.push({
      code: 'prompt-thickness-missing',
      detail: 'The original prompt did not specify thickness.',
      label: 'Prompt omitted a manufacturing-critical thickness.',
      severity: 'warning',
    })
  }

  checks.push({
    code: 'flat-layout-ready',
    detail: `${document.boards.length} flat boards are arranged for export.`,
    label: 'Flat layout is ready for downstream export.',
    severity: 'pass',
  })

  return checks
}

function isPatchPrompt(prompt: string) {
  return includesAny(prompt, ['增加', '减少', '改成', '修改', '加一个', '去掉', 'remove handle', 'change', 'increase'])
}

function parseStructureType(prompt: string): AiStructureType | null {
  if (includesAny(prompt, ['托盘', 'tray'])) {
    return 'tray'
  }

  if (includesAny(prompt, ['盒', 'box', '收纳'])) {
    return 'box'
  }

  return null
}

function parseDimensions(prompt: string) {
  const compactMatch = prompt.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i)
  if (!compactMatch) {
    return null
  }

  const width = Number(compactMatch[1])
  const height = Number(compactMatch[2])
  const depth = Number(compactMatch[3])
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) {
    return null
  }

  return {
    width,
    height,
    depth,
  }
}

function parseThickness(prompt: string) {
  const thicknessMatch = prompt.match(/板厚\s*(\d+(?:\.\d+)?)\s*mm/i) ?? prompt.match(/(\d+(?:\.\d+)?)\s*mm\s*板厚/i)
  if (!thicknessMatch) {
    return null
  }

  const thickness = Number(thicknessMatch[1])
  return Number.isFinite(thickness) ? thickness : null
}

function parseJointType(prompt: string): AiJointType {
  if (includesAny(prompt, ['指接', 'finger'])) {
    return 'finger-joint'
  }

  if (includesAny(prompt, ['插槽', 'slot'])) {
    return 'slot'
  }

  return DEFAULT_JOINT
}

function parsePatchOperations(prompt: string): AiPatchOperation[] {
  const operations: AiPatchOperation[] = []
  const heightDeltaMatch = prompt.match(/高度(?:增加|加高)\s*(\d+(?:\.\d+)?)\s*mm/i)
  if (heightDeltaMatch) {
    const height = Number(heightDeltaMatch[1])
    if (Number.isFinite(height)) {
      operations.push({ type: 'resize', height, mode: 'delta' })
    }
  }

  const widthAbsoluteMatch = prompt.match(/宽度改成\s*(\d+(?:\.\d+)?)\s*mm/i)
  if (widthAbsoluteMatch) {
    const width = Number(widthAbsoluteMatch[1])
    if (Number.isFinite(width)) {
      operations.push({ type: 'resize', width, mode: 'absolute' })
    }
  }

  const depthAbsoluteMatch = prompt.match(/深度改成\s*(\d+(?:\.\d+)?)\s*mm/i)
  if (depthAbsoluteMatch) {
    const depth = Number(depthAbsoluteMatch[1])
    if (Number.isFinite(depth)) {
      operations.push({ type: 'resize', depth, mode: 'absolute' })
    }
  }

  if (includesAny(prompt, ['加一个提手孔', '加提手孔', '带提手孔', 'add handle'])) {
    operations.push({ type: 'toggle-handle-cutout', enabled: true })
  }

  const thicknessMatch = prompt.match(/板厚改成\s*(\d+(?:\.\d+)?)\s*mm/i)
  if (thicknessMatch) {
    const thickness = Number(thicknessMatch[1])
    if (Number.isFinite(thickness)) {
      operations.push({ type: 'adjust-thickness', thickness })
    }
  }

  if (includesAny(prompt, ['去掉提手孔', '取消提手孔', 'remove handle'])) {
    operations.push({ type: 'toggle-handle-cutout', enabled: false })
  }

  if (includesAny(prompt, ['改成指接', '改成指接榫', 'finger'])) {
    operations.push({ type: 'change-joint', jointType: 'finger-joint' })
  }

  if (includesAny(prompt, ['改成插槽', 'slot'])) {
    operations.push({ type: 'change-joint', jointType: 'slot' })
  }

  return operations
}

function includesAny(value: string, terms: string[]) {
  return terms.some(term => value.includes(term))
}

function getSpecFromGenerateCommand(command: AiGenerateStructureCommand): AiStructureSpec {
  return {
    structure: command.structure,
    width: command.dimensions.width,
    height: command.dimensions.height,
    depth: command.dimensions.depth,
    thickness: command.material.thickness ?? 3,
    jointType: command.joints.type,
    handleCutout: command.features.handleCutout,
  }
}

function inferStructureSpec(document: PatternDocument): AiStructureSpec {
  const frontPanel = document.boards.find(board => board.name === 'Front panel')
  const leftPanel = document.boards.find(board => board.name === 'Left panel')
  const bottomPanel = document.boards.find(board => board.name === 'Bottom panel')

  const frontBounds = frontPanel ? getBoardBounds(frontPanel) : { width: 120, height: 80 }
  const leftBounds = leftPanel ? getBoardBounds(leftPanel) : { width: 60, height: 80 }
  const bottomBounds = bottomPanel ? getBoardBounds(bottomPanel) : { width: 120, height: 60 }

  return {
    structure: document.metadata.name.toLowerCase().includes('tray') ? 'tray' : DEFAULT_STRUCTURE,
    width: frontBounds.width,
    height: frontBounds.height,
    depth: leftBounds.width || bottomBounds.height,
    thickness: frontPanel?.thickness ?? 3,
    jointType: inferJointType(document),
    handleCutout: document.boards.some(board => board.holes.length > 0),
  }
}

function inferJointType(document: PatternDocument): AiJointType {
  const marker = document.metadata.name.toLowerCase()
  if (marker.includes('finger-joint')) {
    return 'finger-joint'
  }

  if (marker.includes('slot')) {
    return 'slot'
  }

  return DEFAULT_JOINT
}

function applyPatchOperations(spec: AiStructureSpec, operations: AiPatchOperation[]): AiStructureSpec {
  let nextSpec = { ...spec }

  for (const operation of operations) {
    if (operation.type === 'resize') {
      nextSpec = {
        ...nextSpec,
        width: getPatchedValue(nextSpec.width, operation.width, operation.mode),
        height: getPatchedValue(nextSpec.height, operation.height, operation.mode),
        depth: getPatchedValue(nextSpec.depth, operation.depth, operation.mode),
      }
      continue
    }

    if (operation.type === 'adjust-thickness') {
      nextSpec = {
        ...nextSpec,
        thickness: operation.thickness,
      }
      continue
    }

    if (operation.type === 'toggle-handle-cutout') {
      nextSpec = {
        ...nextSpec,
        handleCutout: operation.enabled,
      }
      continue
    }

    nextSpec = {
      ...nextSpec,
      jointType: operation.jointType,
    }
  }

  return nextSpec
}

function getPatchedValue(current: number, value: number | undefined, mode: ResizeMode) {
  if (value === undefined) {
    return current
  }

  if (mode === 'delta') {
    return current + value
  }

  return value
}

function buildDocumentFromSpec(spec: AiStructureSpec, createdAt: string): PatternDocument {
  const baseDocument = createDefaultPatternDocument()
  const frontPanel = createPanelBoard('Front panel', spec.width, spec.height, spec.thickness, 0, 0, spec.handleCutout)
  const backPanel = createPanelBoard('Back panel', spec.width, spec.height, spec.thickness, spec.width + FLAT_PATTERN_GAP, 0, false)
  const leftPanel = createPanelBoard('Left panel', spec.depth, spec.height, spec.thickness, 0, spec.height + FLAT_PATTERN_GAP, false)
  const rightPanel = createPanelBoard('Right panel', spec.depth, spec.height, spec.thickness, spec.depth + FLAT_PATTERN_GAP, spec.height + FLAT_PATTERN_GAP, false)
  const bottomPanel = createPanelBoard('Bottom panel', spec.width, spec.depth, spec.thickness, spec.depth * 2 + FLAT_PATTERN_GAP * 2, spec.height + FLAT_PATTERN_GAP, false)

  const document: PatternDocument = {
    ...baseDocument,
    metadata: {
      ...baseDocument.metadata,
      createdAt,
      name: `AI ${spec.structure} | ${spec.jointType}`,
    },
    boards: [frontPanel, backPanel, leftPanel, rightPanel, bottomPanel],
  }

  return updateDocumentTimestamp(document)
}

function createPanelBoard(
  name: string,
  width: number,
  height: number,
  thickness: number,
  x: number,
  y: number,
  handleCutout: boolean,
): Board {
  const holes = handleCutout ? [createHandleCutoutShape(width, height)] : []

  return {
    id: getRandomId('board'),
    name,
    thickness,
    material: 'birch-ply',
    transform: {
      x,
      y,
      rotation: 0,
      orientation: 'flat',
    },
    outline: createRectangleShape(width, height),
    holes,
  }
}

function createHandleCutoutShape(width: number, height: number): Path2DShape {
  const cutoutWidth = Math.max(24, width * 0.36)
  const cutoutHeight = Math.max(12, Math.min(22, height * 0.2))
  const x = Math.max(8, (width - cutoutWidth) / 2)
  const y = Math.max(8, height * 0.18)
  return offsetShape(createRoundedRectangleShape(cutoutWidth, cutoutHeight, 8), x, y)
}

function offsetShape(shape: Path2DShape, x: number, y: number): Path2DShape {
  return {
    closed: shape.closed,
    segments: shape.segments.map(segment => ({
      kind: segment.kind,
      points: segment.points.map(point => ({
        x: point.x + x,
        y: point.y + y,
      })),
    })),
  }
}

function getBoardBounds(board: Board) {
  const points = sampleShapePoints(board.outline)
  const bounds = getBoundsFromPoints(points)
  return {
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  }
}

function buildExecutionSteps(command: AiExecutableCommand) {
  const steps = ['Parse prompt into structure intent']

  if (command.type === 'generate-structure') {
    steps.push(command.structure === 'tray' ? 'Create tray panels' : 'Create box panels')

    if (command.joints.type === 'finger-joint') {
      steps.push('Apply finger-joint intent')
    }
    else if (command.joints.type === 'slot') {
      steps.push('Apply slot-joint intent')
    }

    if (command.features.handleCutout) {
      steps.push('Apply handle cutout')
    }

    steps.push('Lay out flat pattern')
    return steps
  }

  steps.push('Patch structure parameters')
  steps.push('Rebuild flat pattern')
  return steps
}
