import { useRef, useEffect } from 'react'
import { useGLTF, useEnvironment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Model({ modelRef, visuals }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/adamHead.gltf')
  const envMap = useEnvironment({ preset: 'studio' })
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
        mat.envMapIntensity = 0.8
        mat.metalness = 0.2
        mat.roughness = 0.3
        mat.clearcoat = 0.1
        mat.clearcoatRoughness = 0.3

        child.material = mat
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }

  // Animate model properties from section visuals
  useFrame(() => {
    if (!groupRef.current || !visuals) return
    const speed = 0.06

    // Scale
    const targetScale = visuals.modelScale || 1.2
    groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * speed
    groupRef.current.scale.y += (targetScale - groupRef.current.scale.y) * speed
    groupRef.current.scale.z += (targetScale - groupRef.current.scale.z) * speed

    // Y position (float + section offset)
    const floatY = Math.sin(Date.now() * 0.001) * 0.02
    const targetY = (visuals.modelY || 0) + floatY
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * speed

    // Rotation
    const targetRotY = visuals.modelRotY || 0
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * speed
  })

  return (
    <group ref={groupRef}>
      <primitive
        ref={modelRef}
        object={cloned.current}
        scale={1.2}
      />
    </group>
  )
}

useGLTF.preload('/adamHead.gltf')