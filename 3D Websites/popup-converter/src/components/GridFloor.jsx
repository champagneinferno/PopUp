import { useMemo } from 'react'
import * as THREE from 'three'

export default function GridFloor({ intensity = 1, accentColor = '#00f0ff' }) {
  const grid = useMemo(() => {
    const size = 30
    const divisions = 40
    const half = size / 2
    const step = size / divisions
    const vertices = []
    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step
      vertices.push(pos, 0, -half, pos, 0, half)
      vertices.push(-half, 0, pos, half, 0, pos)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geo
  }, [])

  return (
    <group position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={accentColor} transparent opacity={0.06 * intensity} depthWrite={false} />
      </lineSegments>
    </group>
  )
}