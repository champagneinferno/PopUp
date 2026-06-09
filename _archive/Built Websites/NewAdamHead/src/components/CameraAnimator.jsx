import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Section-specific visual targets
export const SECTION_VISUALS = [
  {
    // Hero: front view, neutral, model at rest
    modelScale: 1.2,
    modelY: 0,
    modelRotY: 0,
    bloomIntensity: 0.3,
    bgColor: '#0a0a0a',
    fogNear: 8,
    fogFar: 20,
  },
  {
    // About: side view, subtle tilt, slight glow
    modelScale: 1.25,
    modelY: 0.1,
    modelRotY: 0.4,
    bloomIntensity: 0.5,
    bgColor: '#0a0a12',
    fogNear: 6,
    fogFar: 18,
  },
  {
    // Features: dramatic angle, elevated, more glow
    modelScale: 1.3,
    modelY: 0.2,
    modelRotY: -0.3,
    bloomIntensity: 0.7,
    bgColor: '#0d0a12',
    fogNear: 5,
    fogFar: 15,
  },
  {
    // CTA: pulled back, centered, cinematic
    modelScale: 1.15,
    modelY: -0.1,
    modelRotY: 0,
    bloomIntensity: 0.6,
    bgColor: '#0a0a0a',
    fogNear: 10,
    fogFar: 25,
  },
]

export default function CameraAnimator({ sections, scrollProgress, controlsRef, onVisualsUpdate }) {
  const { camera } = useThree()
  const currentPosition = useRef(new THREE.Vector3(...sections[0].camera))
  const currentTarget = useRef(new THREE.Vector3(...sections[0].target))
  const targetPosition = useRef(new THREE.Vector3())
  const targetTarget = useRef(new THREE.Vector3())
  const lastVisuals = useRef(null)

  useFrame((_, delta) => {
    const speed = Math.min(delta * 2.2, 0.08)

    // Blend camera position by scroll progress
    const totalSections = sections.length
    const rawIdx = scrollProgress * (totalSections - 1)
    const prevIdx = Math.min(Math.floor(rawIdx), totalSections - 2)
    const nextIdx = prevIdx + 1
    const t = rawIdx - prevIdx

    const pA = sections[prevIdx]?.camera || sections[0].camera
    const pB = sections[nextIdx]?.camera || sections[sections.length - 1].camera
    const tA = sections[prevIdx]?.target || sections[0].target
    const tB = sections[nextIdx]?.target || sections[sections.length - 1].target

    targetPosition.current.set(
      pA[0] + (pB[0] - pA[0]) * t,
      pA[1] + (pB[1] - pA[1]) * t,
      pA[2] + (pB[2] - pA[2]) * t,
    )
    targetTarget.current.set(
      tA[0] + (tB[0] - tA[0]) * t,
      tA[1] + (tB[1] - tA[1]) * t,
      tA[2] + (tB[2] - tA[2]) * t,
    )

    currentPosition.current.lerp(targetPosition.current, speed)
    currentTarget.current.lerp(targetTarget.current, speed)

    camera.position.copy(currentPosition.current)
    camera.lookAt(currentTarget.current)

    if (controlsRef?.current) {
      controlsRef.current.target.lerp(currentTarget.current, speed)
    }

    // Blend section visuals and notify parent
    const va = SECTION_VISUALS[prevIdx]
    const vb = SECTION_VISUALS[nextIdx]
    if (va && vb) {
      const blended = {
        modelScale: va.modelScale + (vb.modelScale - va.modelScale) * t,
        modelY: va.modelY + (vb.modelY - va.modelY) * t,
        modelRotY: va.modelRotY + (vb.modelRotY - va.modelRotY) * t,
        bloomIntensity: va.bloomIntensity + (vb.bloomIntensity - va.bloomIntensity) * t,
        bgColor: va.bgColor,
        fogNear: va.fogNear + (vb.fogNear - va.fogNear) * t,
        fogFar: va.fogFar + (vb.fogFar - va.fogFar) * t,
        sectionProgress: t,
        sectionIndex: prevIdx,
      }

      // Only emit if changed
      const key = `${blended.sectionIndex}-${blended.sectionProgress.toFixed(2)}`
      if (key !== lastVisuals.current) {
        lastVisuals.current = key
        onVisualsUpdate?.(blended)
      }
    }
  })

  return null
}