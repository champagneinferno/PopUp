import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function createOrbitPoints(radius, segments = 64) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0)
  return curve.getPoints(segments)
}

export default function Globe({ position = [0, 0, 0], visible = false }) {
  const groupRef = useRef()
  const globeRef = useRef()
  const innerGlobeRef = useRef()
  const coreRef = useRef()
  const glowRef = useRef()
  const glowMatRef = useRef()
  const orbit1Ref = useRef()
  const orbit2Ref = useRef()
  const orbit3Ref = useRef()
  const nodesRef = useRef()
  const booksRef = useRef([])

  // Stable node data (mutable, initialized once)
  const nodeData = useMemo(() => {
    const count = 40
    const radii = []
    const tilts = []
    const speeds = []
    const phases = []
    for (let i = 0; i < count; i++) {
      radii.push(1.8 + Math.random() * 1.8)
      tilts.push((Math.random() - 0.5) * 1.2)
      speeds.push(0.2 + Math.random() * 0.4)
      phases.push(Math.random() * Math.PI * 2)
    }
    return { count, radii, tilts, speeds, phases }
  }, [])

  // Stable book data (mutable angle)
  const bookDataRef = useRef(null)
  if (!bookDataRef.current) {
    bookDataRef.current = []
    for (let i = 0; i < 8; i++) {
      bookDataRef.current.push({
        angle: (i / 8) * Math.PI * 2,
        radius: 2.8 + Math.random() * 0.4,
        speed: 0.1 + Math.random() * 0.15,
        yOffset: (Math.random() - 0.5) * 1.5,
        hue: 0.58 + Math.random() * 0.08,
        lightness: 0.2 + Math.random() * 0.3,
        size: [
          0.08 + Math.random() * 0.12,
          0.12 + Math.random() * 0.18,
          0.04 + Math.random() * 0.06,
        ],
        rotY: Math.random() * Math.PI * 2,
        rotX: Math.random() * 0.5,
        rotZ: Math.random() * 0.3,
      })
    }
  }
  const bookData = bookDataRef.current

  // Orbit ring point arrays
  const orbitPoints1 = useMemo(() => createOrbitPoints(2.2), [])
  const orbitPoints2 = useMemo(() => createOrbitPoints(2.8), [])
  const orbitPoints3 = useMemo(() => createOrbitPoints(2.0), [])

  // Position buffer for nodes
  const initialPositions = useMemo(() => {
    return new Float32Array(nodeData.count * 3)
  }, [nodeData.count])

  useFrame((state) => {
    if (!visible || !groupRef.current) return
    const time = state.clock.elapsedTime

    // Rotate spheres
    if (globeRef.current) globeRef.current.rotation.y += 0.002
    if (innerGlobeRef.current) innerGlobeRef.current.rotation.y += 0.001
    if (coreRef.current) coreRef.current.rotation.y += 0.003
    if (glowRef.current) glowRef.current.rotation.y += 0.002

    // Pulse core glow
    if (glowMatRef.current) {
      glowMatRef.current.opacity = 0.2 + Math.sin(time * 1.5) * 0.1
    }

    // Orbit rings rotate around Z
    if (orbit1Ref.current) orbit1Ref.current.rotation.z += 0.004
    if (orbit2Ref.current) orbit2Ref.current.rotation.z -= 0.003
    if (orbit3Ref.current) orbit3Ref.current.rotation.z += 0.005

    // Update orbiting data nodes
    if (nodesRef.current) {
      const pos = nodesRef.current.geometry.attributes.position.array
      for (let i = 0; i < nodeData.count; i++) {
        const angle = time * nodeData.speeds[i] + nodeData.phases[i]
        const r = nodeData.radii[i]
        const tilt = nodeData.tilts[i]
        pos[i * 3] = Math.cos(angle) * r
        pos[i * 3 + 1] = Math.sin(angle) * r * Math.sin(tilt) * 0.5
        pos[i * 3 + 2] = Math.sin(angle) * r * Math.cos(tilt)
      }
      nodesRef.current.geometry.attributes.position.needsUpdate = true
    }

    // Update floating books
    bookData.forEach((data, i) => {
      const book = booksRef.current[i]
      if (!book) return
      data.angle += data.speed * 0.01
      const a = data.angle
      const r = data.radius
      book.position.x = Math.cos(a) * r
      book.position.z = Math.sin(a) * r
      book.position.y = data.yOffset + Math.sin(a * 0.7 + time) * 0.3
      book.rotation.y += 0.005
      book.rotation.x += 0.002
    })
  })

  if (!visible) return null

  return (
    <group ref={groupRef} position={position}>
      {/* Outer wireframe sphere */}
      <mesh ref={globeRef}>
        <icosahedronGeometry args={[1.6, 2]} />
        <meshBasicMaterial color="#3366cc" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Inner translucent sphere */}
      <mesh ref={innerGlobeRef}>
        <icosahedronGeometry args={[1.55, 1]} />
        <meshBasicMaterial color="#3366cc" transparent opacity={0.04} />
      </mesh>

      {/* Glowing core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#6699ff" transparent opacity={0.3} />
      </mesh>

      {/* Core glow aura */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial ref={glowMatRef} color="#3366cc" transparent opacity={0.08} />
      </mesh>

      {/* Orbit ring 1 — tilted */}
      <line rotation={[Math.PI / 3, 0, 0]} ref={orbit1Ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={orbitPoints1.length}
            array={new Float32Array(orbitPoints1.flatMap(p => [p.x, p.y, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3366cc" transparent opacity={0.12} />
      </line>

      {/* Orbit ring 2 — counter-tilted */}
      <line rotation={[-Math.PI / 4, 0, 0]} ref={orbit2Ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={orbitPoints2.length}
            array={new Float32Array(orbitPoints2.flatMap(p => [p.x, p.y, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#6699ff" transparent opacity={0.08} />
      </line>

      {/* Orbit ring 3 — shallow tilt */}
      <line rotation={[Math.PI / 5.5, 0, 0]} ref={orbit3Ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={orbitPoints3.length}
            array={new Float32Array(orbitPoints3.flatMap(p => [p.x, p.y, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#88aaff" transparent opacity={0.06} />
      </line>

      {/* Orbiting data nodes (Points) */}
      <points ref={nodesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={nodeData.count}
            array={initialPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#6699ff"
          size={0.04}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Floating book geometries in orbit */}
      {bookData.map((data, i) => (
        <mesh
          key={i}
          ref={(el) => { booksRef.current[i] = el }}
          position={[
            Math.cos(data.angle) * data.radius,
            data.yOffset,
            Math.sin(data.angle) * data.radius,
          ]}
          rotation={[data.rotX, data.rotY, data.rotZ]}
        >
          <boxGeometry args={data.size} />
          <meshStandardMaterial
            color={new THREE.Color().setHSL(data.hue, 0.5, data.lightness)}
            metalness={0.1}
            roughness={0.6}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}