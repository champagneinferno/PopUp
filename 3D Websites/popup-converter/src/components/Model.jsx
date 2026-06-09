import { useRef } from 'react'
import { useGLTF, useEnvironment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Model({ modelRef, visuals }) {
  const groupRef = useRef()
  const wireRef = useRef()
  const { scene } = useGLTF('/adamHead.gltf')
  const envMap = useEnvironment({ preset: 'night' })
  const cloned = useRef(null)

  if (!cloned.current) {
    cloned.current = scene.clone(true)

    cloned.current.traverse((child) => {
      if (child.isMesh) {
        const orig = child.material
        const mat = new THREE.MeshPhysicalMaterial()

        if (orig) {
          if (orig.color) mat.color = orig.color.clone()
          if (orig.map) mat.map = orig.map
          if (orig.normalMap) mat.normalMap = orig.normalMap
          if (orig.roughnessMap) mat.roughnessMap = orig.roughnessMap
          if (orig.metalnessMap) mat.metalnessMap = orig.metalnessMap
          if (orig.aoMap) mat.aoMap = orig.aoMap
        }

        mat.envMap = envMap
        mat.envMapIntensity = 0.6
        mat.metalness = 0.4
        mat.roughness = 0.25
        mat.clearcoat = 0.15
        mat.clearcoatRoughness = 0.25
        mat.emissive = new THREE.Color('#001122')
        mat.emissiveIntensity = 0.3

        child.material = mat
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }

  useFrame(() => {
    if (!groupRef.current || !visuals) return
    const speed = 0.06

    const targetScale = visuals.modelScale || 1.2
    groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * speed
    groupRef.current.scale.y += (targetScale - groupRef.current.scale.y) * speed
    groupRef.current.scale.z += (targetScale - groupRef.current.scale.z) * speed

    const targetX = visuals.modelX || 0
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * speed

    const floatY = Math.sin(Date.now() * 0.001) * 0.02
    const targetY = (visuals.modelY || 0) + floatY
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * speed

    const targetZ = visuals.modelZ || 0
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * speed

    const targetRotY = visuals.modelRotY || 0
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * speed

    if (wireRef.current) {
      const targetOpacity = (visuals.sectionIndex === 1 || visuals.sectionIndex === 2) ? 0.25 : 0.05
      wireRef.current.material.opacity += (targetOpacity - wireRef.current.material.opacity) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      <primitive ref={modelRef} object={cloned.current} scale={1.2} />
      <mesh ref={wireRef} scale={1.2}>
        <primitive object={(() => {
          const w = scene.clone(true)
          w.traverse((c) => {
            if (c.isMesh) {
              c.material = new THREE.MeshBasicMaterial({
                color: '#00f0ff',
                wireframe: true,
                transparent: true,
                opacity: 0.08,
                depthWrite: false,
              })
            }
          })
          return w
        })()} />
      </mesh>
    </group>
  )
}

useGLTF.preload('/adamHead.gltf')