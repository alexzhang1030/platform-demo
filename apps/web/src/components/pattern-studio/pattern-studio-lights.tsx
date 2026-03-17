import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { AmbientLight, DirectionalLight, OrthographicCamera } from 'three/webgpu'
import * as THREE from 'three/webgpu'

interface LightTargets {
  ambientColor: string
  ambientIntensity: number
  keyColor: string
  keyIntensity: number
  shadowIntensity: number
  fillColor: string
  fillIntensity: number
  rimColor: string
  rimIntensity: number
}

interface PatternStudioLightsProps {
  resolvedTheme: 'dark' | 'light'
}

const SHADOW_CAMERA_SIZE = 50
const THEME_TARGETS: Record<'dark' | 'light', LightTargets> = {
  dark: {
    ambientColor: '#a0b0ff',
    ambientIntensity: 0.12,
    fillColor: '#8090ff',
    fillIntensity: 0.18,
    keyColor: '#e0e5ff',
    keyIntensity: 0.95,
    rimColor: '#a0b0ff',
    rimIntensity: 0.35,
    shadowIntensity: 0.85,
  },
  light: {
    ambientColor: '#f8f1e3',
    ambientIntensity: 0.28,
    fillColor: '#fff3d6',
    fillIntensity: 0.4,
    keyColor: '#fff7ea',
    keyIntensity: 2.4,
    rimColor: '#fff3db',
    rimIntensity: 0.55,
    shadowIntensity: 0.52,
  },
}

export function PatternStudioLights({ resolvedTheme }: PatternStudioLightsProps) {
  const ambientRef = useRef<AmbientLight>(null)
  const keyLightRef = useRef<DirectionalLight>(null)
  const fillLightRef = useRef<DirectionalLight>(null)
  const rimLightRef = useRef<DirectionalLight>(null)
  const shadowCameraRef = useRef<OrthographicCamera>(null)
  const initializedRef = useRef(false)

  const colorTargets = useMemo(
    () => ({
      ambient: new THREE.Color(),
      fill: new THREE.Color(),
      key: new THREE.Color(),
      rim: new THREE.Color(),
    }),
    [],
  )

  useFrame((_, delta) => {
    const targets = THEME_TARGETS[resolvedTheme]
    const frameLerp = Math.min(delta, 0.1) * 4

    colorTargets.ambient.set(targets.ambientColor)
    colorTargets.fill.set(targets.fillColor)
    colorTargets.key.set(targets.keyColor)
    colorTargets.rim.set(targets.rimColor)

    if (!initializedRef.current) {
      if (ambientRef.current) {
        ambientRef.current.intensity = targets.ambientIntensity
        ambientRef.current.color.copy(colorTargets.ambient)
      }

      if (keyLightRef.current) {
        keyLightRef.current.intensity = targets.keyIntensity
        keyLightRef.current.color.copy(colorTargets.key)

        if (keyLightRef.current.shadow) {
          keyLightRef.current.shadow.intensity = targets.shadowIntensity
        }
      }

      if (fillLightRef.current) {
        fillLightRef.current.intensity = targets.fillIntensity
        fillLightRef.current.color.copy(colorTargets.fill)
      }

      if (rimLightRef.current) {
        rimLightRef.current.intensity = targets.rimIntensity
        rimLightRef.current.color.copy(colorTargets.rim)
      }

      initializedRef.current = true
      return
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        targets.ambientIntensity,
        frameLerp,
      )
      ambientRef.current.color.lerp(colorTargets.ambient, frameLerp)
    }

    if (keyLightRef.current) {
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        keyLightRef.current.intensity,
        targets.keyIntensity,
        frameLerp,
      )
      keyLightRef.current.color.lerp(colorTargets.key, frameLerp)

      if (keyLightRef.current.shadow) {
        keyLightRef.current.shadow.intensity = THREE.MathUtils.lerp(
          keyLightRef.current.shadow.intensity,
          targets.shadowIntensity,
          frameLerp,
        )
      }
    }

    if (fillLightRef.current) {
      fillLightRef.current.intensity = THREE.MathUtils.lerp(
        fillLightRef.current.intensity,
        targets.fillIntensity,
        frameLerp,
      )
      fillLightRef.current.color.lerp(colorTargets.fill, frameLerp)
    }

    if (rimLightRef.current) {
      rimLightRef.current.intensity = THREE.MathUtils.lerp(
        rimLightRef.current.intensity,
        targets.rimIntensity,
        frameLerp,
      )
      rimLightRef.current.color.lerp(colorTargets.rim, frameLerp)
    }
  })

  return (
    <>
      <directionalLight
        castShadow
        position={[10, 10, 10]}
        ref={keyLightRef}
        shadow-bias={-0.002}
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.3}
        shadow-radius={3}
      >
        <orthographicCamera
          attach="shadow-camera"
          bottom={-SHADOW_CAMERA_SIZE}
          far={100}
          left={-SHADOW_CAMERA_SIZE}
          near={1}
          ref={shadowCameraRef}
          right={SHADOW_CAMERA_SIZE}
          top={SHADOW_CAMERA_SIZE}
        />
      </directionalLight>
      <directionalLight position={[-10, 10, -10]} ref={fillLightRef} />
      <directionalLight position={[-10, 10, 10]} ref={rimLightRef} />
      <ambientLight ref={ambientRef} />
    </>
  )
}
