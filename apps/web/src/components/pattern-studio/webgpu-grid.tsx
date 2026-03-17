import type { MutableRefObject } from 'react'
import { useMemo } from 'react'
import { color, float, fract, fwidth, mix, positionLocal, uniform } from 'three/tsl'
import * as THREE from 'three/webgpu'

interface WebGPUGridProps {
  cursorPositionRef: MutableRefObject<THREE.Vector2>
  resolvedTheme: 'dark' | 'light'
  z?: number
  cellSize?: number
  cellThickness?: number
  sectionSize?: number
  sectionThickness?: number
  fadeDistance?: number
  fadeStrength?: number
  revealRadius?: number
}

export function WebGPUGrid({
  cursorPositionRef,
  resolvedTheme,
  z = -0.2,
  cellSize = 40,
  cellThickness = 0.5,
  sectionSize = 200,
  sectionThickness = 1,
  fadeDistance = 2000,
  fadeStrength = 2,
  revealRadius = 280,
}: WebGPUGridProps) {
  const material = useMemo(() => {
    const cellColor = resolvedTheme === 'dark' ? '#555566' : '#d6d3d1'
    const sectionColor = resolvedTheme === 'dark' ? '#666677' : '#78716c'
    const pos = positionLocal.xy
    const cursorPos = uniform(cursorPositionRef.current)

    const getGrid = (size: number, thickness: number) => {
      const r = pos.div(size)
      const fw = fwidth(r)
      const grid = fract(r.sub(0.5)).sub(0.5).abs()
      const lineX = float(1).sub(grid.x.div(fw.x).add(1 - thickness).min(1))
      const lineY = float(1).sub(grid.y.div(fw.y).add(1 - thickness).min(1))
      return lineX.max(lineY)
    }

    const g1 = getGrid(cellSize, cellThickness)
    const g2 = getGrid(sectionSize, sectionThickness)
    const dist = pos.length()
    const fade = float(1).sub(dist.div(fadeDistance).min(1)).pow(fadeStrength)
    const cursorDist = pos.sub(cursorPos).length()
    const cursorFade = float(1).sub(cursorDist.div(revealRadius).clamp(0, 1)).smoothstep(0, 1)
    const gridColor = mix(
      color(cellColor),
      color(sectionColor),
      float(sectionThickness).mul(g2).min(1),
    )
    const baseAlpha = float(0.4)
    const alpha = g1.add(g2).mul(fade).mul(cursorFade.max(baseAlpha))
    const finalAlpha = mix(alpha.mul(0.75), alpha, g2)

    return new THREE.MeshBasicNodeMaterial({
      colorNode: gridColor,
      depthWrite: false,
      opacityNode: finalAlpha,
      transparent: true,
    })
  }, [
    cellSize,
    cellThickness,
    cursorPositionRef,
    fadeDistance,
    fadeStrength,
    resolvedTheme,
    revealRadius,
    sectionSize,
    sectionThickness,
  ])

  return (
    <mesh material={material} position={[0, 0, z]} renderOrder={-1}>
      <planeGeometry args={[fadeDistance * 2, fadeDistance * 2, 1, 1]} />
    </mesh>
  )
}
