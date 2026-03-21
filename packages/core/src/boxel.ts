import type {
  BoxelAssembly,
  BoxelCell,
} from '@xtool-demo/protocol'

export interface BoxelColumn {
  x: number
  y: number
}

export interface BoxelBounds {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
  width: number
  height: number
  depth: number
}

export interface BoxelWorldPosition {
  x: number
  y: number
  z: number
}

export interface JointCandidate {
  axis: 'x' | 'y'
  from: BoxelCell
  to: BoxelCell
}

interface WorldGridCell {
  x: number
  y: number
  z: number
}

const NEIGHBOR_OFFSETS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
]

function createCellKey(cell: WorldGridCell) {
  return `${cell.x}:${cell.y}:${cell.z}`
}

function sortCells(cells: BoxelCell[]) {
  return [...cells].sort((left, right) => {
    if (left.x !== right.x) {
      return left.x - right.x
    }

    if (left.y !== right.y) {
      return left.y - right.y
    }

    return left.z - right.z
  })
}

function sortAssemblies(assemblies: BoxelAssembly[]) {
  return [...assemblies].sort((left, right) => {
    if (left.origin.x !== right.origin.x) {
      return left.origin.x - right.origin.x
    }

    if (left.origin.y !== right.origin.y) {
      return left.origin.y - right.origin.y
    }

    return left.id.localeCompare(right.id)
  })
}

function getGridOffset(value: number, cellSize: number) {
  return Math.round(value / cellSize)
}

function toWorldGridCell(assembly: BoxelAssembly, cell: BoxelCell): WorldGridCell {
  const offsetX = getGridOffset(assembly.origin.x, assembly.cellSize)
  const offsetY = getGridOffset(assembly.origin.y, assembly.cellSize)

  return {
    x: offsetX + cell.x,
    y: offsetY + cell.y,
    z: cell.z,
  }
}

function toWorldGridCells(assembly: BoxelAssembly) {
  return assembly.cells.map(cell => toWorldGridCell(assembly, cell))
}

function toLocalAssembly(
  assembly: BoxelAssembly,
  worldCells: WorldGridCell[],
  id: string,
  name: string,
) {
  const sortedWorldCells = sortCells(worldCells)
  const firstCell = sortedWorldCells[0]
  const minX = firstCell?.x ?? 0
  const minY = firstCell?.y ?? 0

  return {
    ...assembly,
    id,
    name,
    origin: {
      x: minX * assembly.cellSize,
      y: minY * assembly.cellSize,
    },
    cells: sortedWorldCells.map(cell => ({
      x: cell.x - minX,
      y: cell.y - minY,
      z: cell.z,
    })),
  }
}

function dedupeWorldCells(cells: WorldGridCell[]) {
  const uniqueCells = new Map<string, WorldGridCell>()

  for (const cell of cells) {
    uniqueCells.set(createCellKey(cell), cell)
  }

  return [...uniqueCells.values()]
}

function collectConnectedWorldComponents(worldCells: WorldGridCell[]) {
  const remaining = new Map(worldCells.map(cell => [createCellKey(cell), cell]))
  const components: WorldGridCell[][] = []

  while (remaining.size > 0) {
    const firstEntry = remaining.entries().next().value
    if (!firstEntry) {
      break
    }

    const [, startCell] = firstEntry
    const stack = [startCell]
    const component: WorldGridCell[] = []
    remaining.delete(createCellKey(startCell))

    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) {
        continue
      }

      component.push(current)

      for (const offset of NEIGHBOR_OFFSETS) {
        const neighbor: WorldGridCell = {
          x: current.x + offset.x,
          y: current.y + offset.y,
          z: current.z + offset.z,
        }
        const neighborKey = createCellKey(neighbor)
        const nextNeighbor = remaining.get(neighborKey)
        if (!nextNeighbor) {
          continue
        }

        remaining.delete(neighborKey)
        stack.push(nextNeighbor)
      }
    }

    components.push(sortCells(component))
  }

  return components.sort((left, right) => {
    const leftFirst = left[0]
    const rightFirst = right[0]
    if (!leftFirst || !rightFirst) {
      return left.length - right.length
    }

    if (leftFirst.x !== rightFirst.x) {
      return leftFirst.x - rightFirst.x
    }

    if (leftFirst.y !== rightFirst.y) {
      return leftFirst.y - rightFirst.y
    }

    return leftFirst.z - rightFirst.z
  })
}

function isXYFaceAdjacent(left: WorldGridCell, right: WorldGridCell) {
  if (left.z !== right.z) {
    return false
  }

  const deltaX = Math.abs(left.x - right.x)
  const deltaY = Math.abs(left.y - right.y)
  return (deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1)
}

export function isBoxelCellOccupied(
  assembly: BoxelAssembly,
  cell: BoxelCell,
) {
  return assembly.cells.some(existingCell =>
    existingCell.x === cell.x
    && existingCell.y === cell.y
    && existingCell.z === cell.z,
  )
}

export function getBoxelColumnHeight(
  assembly: BoxelAssembly,
  column: BoxelColumn,
) {
  let highestZ = -1

  for (const cell of assembly.cells) {
    if (cell.x !== column.x || cell.y !== column.y) {
      continue
    }

    highestZ = Math.max(highestZ, cell.z)
  }

  return highestZ + 1
}

export function appendBoxelCellAboveColumn(
  assembly: BoxelAssembly,
  column: BoxelColumn,
): BoxelAssembly {
  const nextCell: BoxelCell = {
    x: column.x,
    y: column.y,
    z: getBoxelColumnHeight(assembly, column),
  }

  return {
    ...assembly,
    cells: [...assembly.cells, nextCell],
  }
}

export function getBoxelCellWorldPosition(
  assembly: BoxelAssembly,
  cell: BoxelCell,
): BoxelWorldPosition {
  const halfCell = assembly.cellSize / 2

  return {
    x: assembly.origin.x + cell.x * assembly.cellSize + halfCell,
    y: assembly.origin.y + cell.y * assembly.cellSize + halfCell,
    z: cell.z * assembly.cellSize + halfCell,
  }
}

export function buildBoxelAssemblyBounds(assembly: BoxelAssembly): BoxelBounds {
  if (assembly.cells.length === 0) {
    return {
      minX: assembly.origin.x,
      minY: assembly.origin.y,
      minZ: 0,
      maxX: assembly.origin.x,
      maxY: assembly.origin.y,
      maxZ: 0,
      width: 0,
      height: 0,
      depth: 0,
    }
  }

  let minCellX = Number.POSITIVE_INFINITY
  let minCellY = Number.POSITIVE_INFINITY
  let minCellZ = Number.POSITIVE_INFINITY
  let maxCellX = Number.NEGATIVE_INFINITY
  let maxCellY = Number.NEGATIVE_INFINITY
  let maxCellZ = Number.NEGATIVE_INFINITY

  for (const cell of assembly.cells) {
    minCellX = Math.min(minCellX, cell.x)
    minCellY = Math.min(minCellY, cell.y)
    minCellZ = Math.min(minCellZ, cell.z)
    maxCellX = Math.max(maxCellX, cell.x)
    maxCellY = Math.max(maxCellY, cell.y)
    maxCellZ = Math.max(maxCellZ, cell.z)
  }

  const minX = assembly.origin.x + minCellX * assembly.cellSize
  const minY = assembly.origin.y + minCellY * assembly.cellSize
  const minZ = minCellZ * assembly.cellSize
  const maxX = assembly.origin.x + (maxCellX + 1) * assembly.cellSize
  const maxY = assembly.origin.y + (maxCellY + 1) * assembly.cellSize
  const maxZ = (maxCellZ + 1) * assembly.cellSize

  return {
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  }
}

export function findFaceAdjacentAssemblies(
  assemblies: BoxelAssembly[],
  worldCell: BoxelCell,
) {
  return sortAssemblies(assemblies.filter((assembly) => {
    const cells = toWorldGridCells(assembly)
    return cells.some(cell => isXYFaceAdjacent(cell, worldCell))
  }))
}

export function buildJointCandidates(assembly: BoxelAssembly): JointCandidate[] {
  const candidates: JointCandidate[] = []

  for (const cell of assembly.cells) {
    const rightNeighbor = assembly.cells.find(currentCell =>
      currentCell.x === cell.x + 1
      && currentCell.y === cell.y
      && currentCell.z === cell.z,
    )
    if (rightNeighbor) {
      candidates.push({
        axis: 'x',
        from: { x: cell.x, y: cell.y, z: cell.z },
        to: { x: rightNeighbor.x, y: rightNeighbor.y, z: rightNeighbor.z },
      })
    }

    const topNeighbor = assembly.cells.find(currentCell =>
      currentCell.x === cell.x
      && currentCell.y === cell.y + 1
      && currentCell.z === cell.z,
    )
    if (topNeighbor) {
      candidates.push({
        axis: 'y',
        from: { x: cell.x, y: cell.y, z: cell.z },
        to: { x: topNeighbor.x, y: topNeighbor.y, z: topNeighbor.z },
      })
    }
  }

  return sortCells(candidates.map(candidate => candidate.from))
    .map((fromCell) => {
      const match = candidates.find(candidate =>
        candidate.from.x === fromCell.x
        && candidate.from.y === fromCell.y
        && candidate.from.z === fromCell.z,
      )
      return match
    })
    .filter((candidate): candidate is JointCandidate => Boolean(candidate))
}

export function mergeAssembliesThroughWorldCell(
  assemblies: BoxelAssembly[],
  worldCell: WorldGridCell,
) {
  const baseAssembly = sortAssemblies(assemblies)[0]
  if (!baseAssembly) {
    return null
  }

  const mergedWorldCells = dedupeWorldCells([
    worldCell,
    ...assemblies.flatMap(assembly => toWorldGridCells(assembly)),
  ])

  return toLocalAssembly(
    baseAssembly,
    mergedWorldCells,
    baseAssembly.id,
    baseAssembly.name,
  )
}

export function splitAssemblyIntoConnectedComponents(assembly: BoxelAssembly) {
  const components = collectConnectedWorldComponents(toWorldGridCells(assembly))

  return components.map((component, index) =>
    toLocalAssembly(
      assembly,
      component,
      index === 0 ? assembly.id : `${assembly.id}-split-${index + 1}`,
      assembly.name,
    ),
  )
}
