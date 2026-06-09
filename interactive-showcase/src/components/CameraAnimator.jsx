import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Spring physics for camera — replaces boring lerp.
 * Each section has its own tension/damping personality.
 * Higher tension = snappier, lower damping = more overshoot.
 */
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

// Per-section targets + transition personality
export const SECTION_VISUALS = [
  {
    // Hero: dark purple-black
    modelScale: 0.7, modelY: 0, modelRotY: 0, modelX: 3.5, modelZ: 0,
    bloomIntensity: 0.4, bgColor: '#0a0a12',
    fogNear: 8, fogFar: 20,
    springTension: 200, springDamping: 20,
    visualTension: 100, visualDamping: 16,
    iridescenceThickness: 0,
    sceneColor: '#120a18',
  },
  {
    // About: deep purple
    modelScale: 1.0, modelY: 0.3, modelRotY: Math.PI, modelX: 0, modelZ: -1,
    bloomIntensity: 0.6, bgColor: '#1a0a20',
    fogNear: 6, fogFar: 18,
    springTension: 160, springDamping: 18,
    visualTension: 80, visualDamping: 14,
    iridescenceThickness: 100,
    sceneColor: '#1a0825',
  },
  {
    // Features: deep magenta-purple
    modelScale: 1.3, modelY: 0.5, modelRotY: Math.PI * 2, modelX: 0, modelZ: 0,
    bloomIntensity: 1.0, bgColor: '#2a0a30',
    fogNear: 5, fogFar: 15,
    springTension: 220, springDamping: 14,
    visualTension: 120, visualDamping: 12,
    iridescenceThickness: 200,
    sceneColor: '#2a0835',
  },
  {
    // CTA: back to dark purple-black
    modelScale: 0.85, modelY: -0.2, modelRotY: Math.PI * 2, modelX: 0, modelZ: 0.5,
    bloomIntensity: 0.5, bgColor: '#0a0a12',
    fogNear: 10, fogFar: 25,
    springTension: 120, springDamping: 28,
    visualTension: 60, visualDamping: 22,
    iridescenceThickness: 50,
    sceneColor: '#120a18',
  },
]

// Global spring state for 3DOF mouse tracking
const mouse3DOF = { x: 0, y: 0 }

export function initMouseTracking() {
  if (typeof window === 'undefined') return
  const handler = (e) => {
    mouse3DOF.x = (e.clientX / window.innerWidth - 0.5) * 2 * 0.06
    mouse3DOF.y = (e.clientY / window.innerHeight - 0.5) * 2 * 0.04
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

    // Blend camera target
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

    // Blend spring personality from section visuals
    const vA = SECTION_VISUALS[prev]
    const vB = SECTION_VISUALS[next] || SECTION_VISUALS[prev]
    const tension = vA.springTension + (vB.springTension - vA.springTension) * t
    const damping = vA.springDamping + (vB.springDamping - vA.springDamping) * t

    // Scroll velocity amplification
    const velFactor = 1 + Math.min(Math.abs(scrollVelocity) * 4, 2)

    // --- SPRING PHYSICS for camera (not lerp!) ---
    applySpring(pos.current, tmpTarget.current, posVel.current,
      tension * velFactor, damping, delta)
    applySpring(tgt.current, tmpTargetTgt.current, tgtVel.current,
      tension * velFactor * 0.8, damping, delta)

    // 3DOF mouse parallax on top of scroll camera
    const mouseDrift = 0.02
    camera.position.x = pos.current.x + (mouse3DOF.x - (camera.position.x - pos.current.x)) * mouseDrift
    camera.position.y = pos.current.y + (mouse3DOF.y - (camera.position.y - pos.current.y)) * mouseDrift
    camera.position.z = pos.current.z
    camera.lookAt(tgt.current)

    if (controlsRef?.current) {
      controlsRef.current.target.copy(tgt.current)
    }

    // --- Smooth color lerp for bgColor ---
    if (vA && vB) {
      const bgColor = tmpColorOut.current
        .copy(tmpColorA.current.set(vA.bgColor))
        .lerp(tmpColorB.current.set(vB.bgColor), t)
        .getStyle()

      const blended = {
        modelScale: vA.modelScale + (vB.modelScale - vA.modelScale) * t,
        modelY: vA.modelY + (vB.modelY - vA.modelY) * t,
        modelRotY: vA.modelRotY + (vB.modelRotY - vA.modelRotY) * t,
        modelX: vA.modelX + (vB.modelX - vA.modelX) * t,
        modelZ: vA.modelZ + (vB.modelZ - vA.modelZ) * t,
        bloomIntensity: vA.bloomIntensity + (vB.bloomIntensity - vA.bloomIntensity) * t,
        bgColor,
        sceneColor: tmpColorOut.current
          .copy(tmpColorA.current.set(vA.sceneColor || vA.bgColor))
          .lerp(tmpColorB.current.set(vB.sceneColor || vB.bgColor), t)
          .getStyle(),
        iridescenceThickness: vA.iridescenceThickness + (vB.iridescenceThickness - vA.iridescenceThickness) * t,
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