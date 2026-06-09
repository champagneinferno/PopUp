import { useRef, useEffect } from 'react'
import { useGLTF, useEnvironment } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const MATERIAL_MODES = [
  { name: 'Iridescence', iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400], clearcoat: 0.3 },
  { name: 'Clear Coat', iridescence: 0, clearcoat: 1, clearcoatRoughness: 0.05 },
  { name: 'Glass', iridescence: 0, clearcoat: 0, transmission: 1, thickness: 0.5, ior: 1.5, roughness: 0.1 },
  { name: 'Matte', iridescence: 0, clearcoat: 0, transmission: 0, roughness: 0.7, metalness: 0 },
]

export default function Model({ modelRef, visuals, onHover, onClickMode }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/adamHead.gltf')
  const envMap = useEnvironment({ preset: 'studio' })
  const { pointer } = useThree()
  const cloned = useRef(null)
  const materialsRef = useRef([])
  const hovered = useRef(false)
  const modeIndex = useRef(0)
  const hoverGlow = useRef(0)
  const clickBurst = useRef(0)

  // ── Build model once ───────────────────────────────────
  // Fix: ENHANCE original materials instead of replacing them.
  // This preserves ALL textures from the glTF.
  if (!cloned.current) {
    cloned.current = scene.clone(true)
    materialsRef.current = []

    cloned.current.traverse((child) => {
      if (child.isMesh) {
        let mat = child.material

        // If not already MeshPhysicalMaterial, upgrade preserving all props
        if (!(mat instanceof THREE.MeshPhysicalMaterial)) {
          const old = mat
          mat = new THREE.MeshPhysicalMaterial()
          if (old) {
            // Copy every property to preserve textures + values
            for (const key of Object.keys(old)) {
              try { mat[key] = old[key] } catch (_) {}
            }
            // Also copy non-enumerable texture refs
            mat.color = old.color ? old.color.clone() : new THREE.Color(0xffffff)
            if (old.map) mat.map = old.map
            if (old.normalMap) mat.normalMap = old.normalMap
            if (old.roughnessMap) mat.roughnessMap = old.roughnessMap
            if (old.metalnessMap) mat.metalnessMap = old.metalnessMap
            if (old.aoMap) mat.aoMap = old.aoMap
            if (old.alphaMap) mat.alphaMap = old.alphaMap
            if (old.displacementMap) mat.displacementMap = old.displacementMap
            if (old.emissiveMap) mat.emissiveMap = old.emissiveMap
            if (old.bumpMap) mat.bumpMap = old.bumpMap
          }
        }

        // Add our enhancements on top
        mat.envMap = envMap
        mat.envMapIntensity = 1.0
        mat.metalness = 0.5
        mat.roughness = 0.3
        mat.clearcoat = 0.3
        mat.clearcoatRoughness = 0.1
        mat.iridescence = 1.0
        mat.iridescenceIOR = 1.3
        mat.iridescenceThicknessRange = [100, 400]

        child.material = mat
        child.castShadow = true
        child.receiveShadow = true
        materialsRef.current.push(mat)
      }
    })
  }

  // ── Material cycling ────────────────────────────────────
  const cycleMaterial = () => {
    modeIndex.current = (modeIndex.current + 1) % MATERIAL_MODES.length
    const mode = MATERIAL_MODES[modeIndex.current]
    materialsRef.current.forEach((mat) => { Object.assign(mat, mode) })
    clickBurst.current = 1.0
    onClickMode?.(mode.name)
  }

  useEffect(() => { window.__cycleModelMaterial = cycleMaterial }, [])

  // ── Per-frame animation ────────────────────────────────
  useFrame((_, delta) => {
    if (!groupRef.current || !visuals) return
    const speed = 0.06
    const section = visuals.sectionIndex ?? 0
    const prog = visuals.sectionProgress ?? 0
    const time = Date.now() * 0.001

    // Scroll-driven position: modelX moves across screen
    const targetX = visuals.modelX ?? 0
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * speed

    // Scroll-driven Z position (depth — closer/further)
    const targetZ = visuals.modelZ ?? 0
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * speed

    // Scroll-driven rotation: 180° flip between sections
    // Section 0→1: 0 → PI (180° flip), 1→2: PI → 2PI, 2→3: stays at 2PI
    const targetRotY = visuals.modelRotY ?? 0
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * speed

    // Scroll-driven scale: dynamic sizing
    let targetScale = visuals.modelScale ?? 1.0

    // Section-specific animation ON TOP of scroll targets
    if (section === 1) {
      // About: model slowly rotates beyond the scroll target for liveliness
      targetScale += Math.sin(time * 0.5) * 0.02
    } else if (section === 2) {
      // Features: pulsing energy — model scales in rhythm, head follows cursor
      targetScale += Math.sin(time * 3) * 0.05
      // Head tracking toward cursor
      const headLookX = pointer.x * 0.1
      groupRef.current.rotation.y += (targetRotY + headLookX - groupRef.current.rotation.y) * 0.02
    }

    // Y position: section offset + breathing float
    const floatAmp = section === 2 ? 0.05 : 0.025
    const breathe = Math.sin(time * 1.2 + section) * floatAmp
    const targetY = (visuals.modelY ?? 0) + breathe
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * speed

    // Apply scale with smoothing
    groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * speed
    groupRef.current.scale.y += (targetScale - groupRef.current.scale.y) * speed
    groupRef.current.scale.z += (targetScale - groupRef.current.scale.z) * speed

    // ── Click burst (pulse on material switch) ──
    if (clickBurst.current > 0.01) {
      const burst = 1 + clickBurst.current * 0.08
      groupRef.current.scale.x = targetScale * burst
      groupRef.current.scale.y = targetScale * burst
      groupRef.current.scale.z = targetScale * burst
      clickBurst.current *= 0.95
    } else {
      clickBurst.current = 0
    }

    // ── Hover glow ──
    const targetGlow = hovered.current ? 1 : 0
    hoverGlow.current += (targetGlow - hoverGlow.current) * 0.08
    onHover?.(hoverGlow.current)

    // ── Section-reactive material ──
    const thicknessBase = prog * 300 + section * 50
    materialsRef.current.forEach((mat) => {
      if (mat.iridescence > 0) {
        mat.iridescenceThicknessRange = [100 + thicknessBase, 400 + thicknessBase]
      }
      // Features section: emissive glow pulse
      if (section === 2) {
        mat.emissive = new THREE.Color(0xec4899)
        mat.emissiveIntensity = 0.15 + Math.sin(time * 2) * 0.1
      } else if (section === 3) {
        // CTA: subtle pink glow
        mat.emissive = new THREE.Color(0xec4899)
        mat.emissiveIntensity = 0.05
      } else {
        mat.emissive = new THREE.Color(0x000000)
        mat.emissiveIntensity = 0
      }
    })
  })

  return (
    <group ref={groupRef}>
      <primitive
        ref={modelRef}
        object={cloned.current}
        scale={1.0}
        onPointerOver={() => { hovered.current = true }}
        onPointerOut={() => { hovered.current = false }}
        onClick={(e) => { e.stopPropagation(); cycleMaterial() }}
      />
    </group>
  )
}

useGLTF.preload('/adamHead.gltf')