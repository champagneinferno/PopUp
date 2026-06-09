import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function DataStream({ count = 250, accentColor = '#00f0ff' }) {
  const ref = useRef()
  const speeds = useRef([])

  useEffect(() => {
    if (!ref.current) return
    const positions = new Float32Array(count * 3)
    speeds.current = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16
      speeds.current.push(0.3 + Math.random() * 1.5)
    }
    ref.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }, [count])

  useFrame((_, delta) => {
    if (!ref.current) return
    const p = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speeds.current[i] * delta
      if (p[i * 3 + 1] > 6) p[i * 3 + 1] = -6
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry />
      <pointsMaterial
        size={0.03}
        color={accentColor}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}