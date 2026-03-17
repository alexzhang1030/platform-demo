import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { outline } from 'three/addons/tsl/display/OutlineNode.js'
import { add, oscSine, pass, time, uniform, vec4 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { useFrame, useThree } from '@react-three/fiber'

interface RendererWithInit {
  init: () => Promise<void>
}

interface SelectionOutlineProps {
  selectedObjectsRef: RefObject<THREE.Object3D[]>
}

function isRendererWithInit(value: unknown): value is RendererWithInit {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (!('init' in value)) {
    return false
  }

  return typeof value.init === 'function'
}

function isWebGPURenderer(value: unknown): value is THREE.WebGPURenderer {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (!('isWebGPURenderer' in value)) {
    return false
  }

  return value.isWebGPURenderer === true
}

export function SelectionOutline({ selectedObjectsRef }: SelectionOutlineProps) {
  const { camera, gl, scene } = useThree()
  const renderPipelineRef = useRef<THREE.RenderPipeline | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initRenderer() {
      if (!isRendererWithInit(gl)) {
        return
      }

      try {
        await gl.init()
        if (mounted) {
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('[pattern-studio] Failed to initialize WebGPU outline renderer.', error)
      }
    }

    initRenderer()

    return () => {
      mounted = false
    }
  }, [gl])

  useEffect(() => {
    if (!isInitialized || !isWebGPURenderer(gl)) {
      return
    }

    const scenePass = pass(scene, camera)
    const edgeStrength = uniform(5)
    const edgeGlow = uniform(0.5)
    const edgeThickness = uniform(1.5)
    const pulsePeriod = uniform(3)
    const visibleEdgeColor = uniform(new THREE.Color(0x00aaff))
    const hiddenEdgeColor = uniform(new THREE.Color(0x7dd3fc))

    const outlinePass = outline(scene, camera, {
      downSampleRatio: 1,
      edgeGlow,
      edgeThickness,
      selectedObjects: selectedObjectsRef.current,
    })

    const outlineColor = outlinePass.visibleEdge
      .mul(visibleEdgeColor)
      .add(outlinePass.hiddenEdge.mul(hiddenEdgeColor))
      .mul(edgeStrength)
    const period = time.div(pulsePeriod).mul(2)
    const osc = oscSine(period).mul(0.5).add(0.5)
    const outlinePulse = pulsePeriod.greaterThan(0).select(outlineColor.mul(osc), outlineColor)

    const renderPipeline = new THREE.RenderPipeline(
      gl,
      vec4(add(scenePass.rgb, outlinePulse), scenePass.a),
    )

    renderPipelineRef.current = renderPipeline

    return () => {
      renderPipeline.dispose()
      renderPipelineRef.current = null
    }
  }, [camera, gl, isInitialized, scene, selectedObjectsRef])

  useFrame(() => {
    const renderPipeline = renderPipelineRef.current
    if (!renderPipeline) {
      return
    }

    renderPipeline.render()
  }, 1)

  return null
}
