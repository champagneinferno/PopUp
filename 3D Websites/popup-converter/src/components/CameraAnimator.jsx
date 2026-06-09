import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function applySpring(current, target, velocity, tension, damping, delta) {
  const dt = Math.min(delta, 0.05)
  velocity.x += (target.x - current.x) * tension * dt
  velocity.y += (target.y - current.y) * tension * dt
  velocity.z += (target.z - current.z) * tension * dt
  const f = 1 - Math.min(damping * dt, 0.99)
  velocity.x *= f; velocity.y *= f; velocity.z *= f
  current.x += velocity.x * dt
  current.y += velocity.y * dt
  current.z += velocity.z * dt
}

export const SECTION_VISUALS = [
  {
    modelScale: 1.5, modelX: 0, modelY: 0, modelZ: 0, modelRotY: 0,
    bloomIntensity: 0.6, bgColor: '#020812',
    fogNear: 6, fogFar: 18,
    springTension: 240, springDamping: 16,
    visualTension: 130, visualDamping: 12,
  },
  {
    modelScale: 1.15, modelX: 1.5, modelY: 0.35, modelZ: -0.3, modelRotY: 0.7,
    bloomIntensity: 0.8, bgColor: '#040618',
    fogNear: 5, fogFar: 14,
    springTension: 180, springDamping: 14,
    visualTension: 90, visualDamping: 10,
  },
  {
    modelScale: 1.4, modelX: -3.0, modelY: 0.15, modelZ: -0.8, modelRotY: -0.55,
    bloomIntensity: 1.1, bgColor: '#010a1a',
    fogNear: 3, fogFar: 12,
    springTension: 260, springDamping: 10,
    visualTension: 150, visualDamping: 8,
  },
  {
    modelScale: 0.65, modelX: 0, modelY: -0.1, modelZ: -2.5, modelRotY: 0,
    bloomIntensity: 0.5, bgColor: '#020812',
    fogNear: 14, fogFar: 30,
    springTension: 90, springDamping: 32,
    visualTension: 45, visualDamping: 26,
  },
]

const mouse3DOF = { x: 0, y: 0 }

export function initMouseTracking() {
  if (typeof window === 'undefined') return
  const handler = (e) => {
    mouse3DOF.x = (e.clientX / window.innerWidth - 0.5) * 2 * 0.08
    mouse3DOF.y = (e.clientY / window.innerHeight - 0.5) * 2 * 0.05
  }
  window.addEventListener('mousemove', handler, { passive: true })
  return () => window.removeEventListener('mousemove', handler)
}

export default function CameraAnimator({
  sections, scrollProgress, controlsRef,
  onVisualsUpdate, scrollVelocity = 0
}) {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3(...sections[0].camera))
  const tgt = useRef(new THREE.Vector3(...sections[0].target))
  const posVel = useRef(new THREE.Vector3())
  const tgtVel = useRef(new THREE.Vector3())
  const tmpTarget = useRef(new THREE.Vector3())
  const tmpTargetTgt = useRef(new THREE.Vector3())
  const lastKey = useRef(null)
  const tmpColorA = useRef(new THREE.Color())
  const tmpColorB = useRef(new THREE.Color())
  const tmpColorOut = useRef(new THREE.Color())

  useFrame((_, delta) => {
    const n = sections.length
    const raw = scrollProgress * (n - 1)
    const prev = Math.min(Math.floor(raw), n - 2)
    const next = prev + 1
    const t = raw - prev

    const ca = sections[prev]?.camera || sections[0].camera
    const cb = sections[next]?.camera || sections[n - 1].camera
    const ta = sections[prev]?.target || sections[0].target
    const tb = sections[next]?.target || sections[n - 1].target

    tmpTarget.current.set(
      ca[0] + (cb[0] - ca[0]) * t,
      ca[1] + (cb[1] - ca[1]) * t,
      ca[2] + (cb[2] - ca[2]) * t,
    )
    tmpTargetTgt.current.set(
      ta[0] + (tb[0] - ta[0]) * t,
      ta[1] + (tb[1] - ta[1]) * t,
      ta[2] + (tb[2] - ta[2]) * t,
    )

    const vA = SECTION_VISUALS[prev]
    const vB = SECTION_VISUALS[next] || SECTION_VISUALS[prev]
    const tension = vA.springTension + (vB.springTension - vA.springTension) * t
    const damping = vA.springDamping + (vB.springDamping - vA.springDamping) * t
    const velFactor = 1 + Math.min(Math.abs(scrollVelocity) * 5, 2.5)

    applySpring(pos.current, tmpTarget.current, posVel.current,
      tension * velFactor, damping, delta)
    applySpring(tgt.current, tmpTargetTgt.current, tgtVel.current,
      tension * velFactor * 0.8, damping, delta)

    const mouseDrift = 0.025
    camera.position.x = pos.current.x + (mouse3DOF.x - (camera.position.x - pos.current.x)) * mouseDrift
    camera.position.y = pos.current.y + (mouse3DOF.y - (camera.position.y - pos.current.y)) * mouseDrift
    camera.position.z = pos.current.z
    camera.lookAt(tgt.current)

    if (controlsRef?.current) {
      controlsRef.current.target.copy(tgt.current)
    }

    if (vA && vB) {
      const bgColor = tmpColorOut.current
        .copy(tmpColorA.current.set(vA.bgColor))
        .lerp(tmpColorB.current.set(vB.bgColor), t)
        .getStyle()

      const blended = {
        modelScale: vA.modelScale + (vB.modelScale - vA.modelScale) * t,
        modelX: (vA.modelX || 0) + ((vB.modelX || 0) - (vA.modelX || 0)) * t,
        modelY: (vA.modelY || 0) + ((vB.modelY || 0) - (vA.modelY || 0)) * t,
        modelZ: (vA.modelZ || 0) + ((vB.modelZ || 0) - (vA.modelZ || 0)) * t,
        modelRotY: (vA.modelRotY || 0) + ((vB.modelRotY || 0) - (vA.modelRotY || 0)) * t,
        bloomIntensity: vA.bloomIntensity + (vB.bloomIntensity - vA.bloomIntensity) * t,
        bgColor,
        fogNear: vA.fogNear + (vB.fogNear - vA.fogNear) * t,
        fogFar: vA.fogFar + (vB.fogFar - vA.fogFar) * t,
        sectionProgress: t,
        sectionIndex: prev,
      }

      const key = `${prev}-${t.toFixed(3)}`
      if (key !== lastKey.current) {
        lastKey.current = key
        onVisualsUpdate?.(blended)
      }
    }
  })

  return null
}