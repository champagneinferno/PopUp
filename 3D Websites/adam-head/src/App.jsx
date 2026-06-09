import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import * as THREE from 'three'
import Lenis from 'lenis'
import Model from './components/Model'
import Globe from './components/Globe'
import CameraAnimator, { initMouseTracking } from './components/CameraAnimator'
import Loader from './components/Loader'
import { AnimatedHeading, PrimaryButton, Nav } from './components/ui'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SECTIONS = [
  { id: 'access',    camera: [0, 1.5, 3.5],  target: [0, 0.5, 0] },
  { id: 'interface', camera: [4.5, 1.4, 1.8], target: [0.8, 0.6, 0] },
  { id: 'network',   camera: [-3.0, 0.8, 5.5], target: [-1.2, 0.5, -0.3] },
  { id: 'terminal',  camera: [0, 0.6, 7.0],   target: [0, 0.4, -0.8] },
]

const NAV_LINKS = [
  { label: 'Access', href: '#access' },
  { label: 'Interface', href: '#interface' },
  { label: 'Network', href: '#network' },
  { label: 'Terminal', href: '#terminal' },
]

export default function App() {
  const [activeSection, setActiveSection] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollVelocity, setScrollVelocity] = useState(0)
  const sectionRefs = useRef([])
  const controlsRef = useRef()
  const modelRef = useRef()
  const [sectionVisuals, setSectionVisuals] = useState(null)
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    let lastProgress = 0
    let lastTime = performance.now()

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !prefersReducedMotion.current,
      wheelMultiplier: 1,
    })

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    const trackVelocity = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      const cur = totalHeight > 0 ? Math.min(Math.max(window.scrollY / totalHeight, 0), 1) : 0
      const now = performance.now()
      const dt = Math.max(now - lastTime, 16)
      const vel = (cur - lastProgress) / (dt / 1000)
      setScrollVelocity(Math.abs(vel) * 10)
      lastProgress = cur
      lastTime = now
      requestAnimationFrame(trackVelocity)
    }
    const raf = requestAnimationFrame(trackVelocity)

    const ctx = gsap.context(() => {
      SECTIONS.forEach((_, i) => {
        const el = sectionRefs.current[i]
        if (!el) return
        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight
            const p = totalHeight > 0 ? Math.min(Math.max(window.scrollY / totalHeight, 0), 1) : 0
            setScrollProgress(p)
          },
        })
        gsap.fromTo(el,
          { opacity: 0, y: 60 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
          }
        )
      })
    })

    const onScroll = () => {
      const sectionEls = document.querySelectorAll('.scene-section')
      let active = 0
      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.4 && rect.bottom > 0) active = i
      })
      setActiveSection(active)
    }
    lenis.on('scroll', onScroll)
    onScroll()

    const cleanupMouse = initMouseTracking()

    return () => {
      lenis.destroy()
      ctx.revert()
      gsap.ticker.lagSmoothing(1)
      cancelAnimationFrame(raf)
      cleanupMouse?.()
    }
  }, [])

  const onVisualsUpdate = useRef((v) => setSectionVisuals(v))

  return (
    <>
      <Nav links={NAV_LINKS} logo="CYBER://ADAM" />
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 1.5, 3.5], fov: 45, near: 0.1, far: 100 }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          gl={{ antialias: true, alpha: false, shadows: true, shadowMapType: THREE.PCFSoftShadowMap, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <Environment preset="night" background={false} blur={0.5} />

          <ambientLight intensity={0.15} color="#001122" />
          <directionalLight position={[5, 6, 5]} intensity={2.2} color="#00f0ff" />
          <directionalLight position={[-4, 3, -3]} intensity={1.0} color="#ff00cc" />
          <directionalLight position={[0, -2, 4]} intensity={0.6} color="#0055ff" />
          <pointLight position={[2, 2, 3]} intensity={8} color="#00f0ff" distance={10} />
          <pointLight position={[-2, -1, 2]} intensity={5} color="#ff00cc" distance={8} />
          <hemisphereLight args={['#001a33', '#020812', 0.3]} />
          <fog attach="fog" args={['#020812', 6, 18]} />

          <mesh>
            <sphereGeometry args={[50, 32, 32]} />
            <meshBasicMaterial color={sectionVisuals?.bgColor || '#020812'} side={THREE.BackSide} />
          </mesh>

          <SceneController visuals={sectionVisuals} />

          <GridFloor intensity={sectionVisuals?.sectionIndex === 2 ? 1.5 : 1} />
          <GlowingRings intensity={sectionVisuals?.sectionIndex === 2 ? 1.5 : 1} />
          <ScanningLine active={!!sectionVisuals} />
          <DataStream count={250} />

          <CameraAnimator
            sections={SECTIONS}
            scrollProgress={scrollProgress}
            scrollVelocity={scrollVelocity}
            controlsRef={controlsRef}
            onVisualsUpdate={onVisualsUpdate.current}
          />
          <Model modelRef={modelRef} visuals={sectionVisuals} />
          <Globe
            position={[0, 0.5, 0]}
            visible={
              sectionVisuals?.sectionIndex === 1 ||
              sectionVisuals?.sectionIndex === 2
            }
          />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.4}
              luminanceSmoothing={0.9}
              intensity={sectionVisuals?.bloomIntensity || 0.6}
              kernelSize={KernelSize.LARGE}
            />
            <Vignette offset={0.3} darkness={0.7} />
          </EffectComposer>

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            zoomSpeed={0.8}
            rotateSpeed={0.6}
            minDistance={2}
            maxDistance={8}
            maxPolarAngle={Math.PI / 2}
            autoRotate={false}
          />
        </Canvas>

        <Loader />
      </div>

      <div className="scroll-hint" style={{ opacity: scrollProgress > 0.05 ? 0 : 0.5 }}>
        <span>Initialize scroll</span>
        <div className="scroll-mouse" />
      </div>

      <div className="nav-dots">
        {SECTIONS.map((s, i) => (
          <button
            key={i}
            className={`nav-dot ${activeSection === i ? 'active' : ''}`}
            aria-label={`Go to: ${s.id}`}
            onClick={() => {
              const el = document.querySelectorAll('.scene-section')[i]
              if (el) el.scrollIntoView({ behavior: prefersReducedMotion.current ? 'auto' : 'smooth' })
            }}
          />
        ))}
      </div>

      <div className="content-overlay">

        <section className="scene-section hero-section" id="access">
          <div className="direct-overlay" ref={(el) => (sectionRefs.current[0] = el)}>
            <span className="tag">// NODE_00: ESTABLISH</span>
            <AnimatedHeading text="Adam Head" level="h1" className="hero-heading" />
            <p className="direct-copy">
              Accessing digital sculpture archive. Procedurally lit mesh.
              Spring-physics camera subroutine active. Neon bloom rendering
              at 60 frames per second. Drag to orbit. Scroll to navigate.
            </p>
          </div>
        </section>

        <section className="scene-section section-left" id="interface">
          <div className="glass-card glass-minimal" ref={(el) => (sectionRefs.current[1] = el)}>
            <div className="accent-bar" />
            <span className="tag">// NODE_01: INTERFACE</span>
            <AnimatedHeading level="h2" className="space-grotesk">
              <span className="gradient-text">Mesh Protocol</span>
            </AnimatedHeading>
            <p className="glass-copy">
              14 PBR texture layers decoded. MeshPhysicalMaterial with
              clearcoat pass engaged. Night environment mapping active.
              ACESFilmic tone pipeline. Emissive subsurface at 0.3 intensity.
            </p>
          </div>
        </section>

        <section className="scene-section section-right" id="network">
          <div className="floating-text" ref={(el) => (sectionRefs.current[2] = el)}>
            <span className="tag">// NODE_02: NETWORK</span>
            <h2 className="floating-heading">
              <span className="gradient-text">Distributed</span> Render
            </h2>
            <p className="floating-copy">
              Spring-physics camera responding to scroll velocity.
              Model repositioning across X/Y/Z axes — not just orbit.
              Tension 260. Damping 10. Aggressive overshoot subroutine.
              Wireframe overlay at 8% opacity.
            </p>
            <PrimaryButton onClick={() => document.getElementById('terminal')?.scrollIntoView({ behavior: 'smooth' })}>
              <span>Execute</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </PrimaryButton>
          </div>
        </section>

        <section className="scene-section section-center" id="terminal">
          <div className="glass-card glass-wide" ref={(el) => (sectionRefs.current[3] = el)}>
            <div className="accent-bar" style={{ margin: '0 auto 1.5rem' }} />
            <span className="tag">// NODE_03: TERMINAL</span>
            <AnimatedHeading level="h2" className="space-grotesk">
              <span className="gradient-text">Session</span> Complete
            </AnimatedHeading>
            <p className="glass-copy" style={{ marginBottom: '2rem', textAlign: 'center' }}>
              Bloom pipeline: luminance threshold 0.4, kernel LARGE.
              Vignette 0.7. Spring settling at tension 90,
              damping 32. Model receding to -2.5Z. Ready for deployment.
            </p>
            <PrimaryButton onClick={() => window.open('https://github.com/nousresearch/hermes-agent', '_blank')}>
              <span>View Source</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            </PrimaryButton>
          </div>
        </section>

        <div style={{ height: '1px' }} />
      </div>
    </>
  )
}

function SceneController({ visuals }) {
  const { scene } = useThree()
  useFrame(() => {
    if (!visuals || !scene.fog) return
    const speed = 0.04
    scene.fog.near += ((visuals.fogNear || 6) - scene.fog.near) * speed
    scene.fog.far += ((visuals.fogFar || 18) - scene.fog.far) * speed
  })
  return null
}

function GlowingRings({ intensity = 1 }) {
  const ringRef1 = useRef()
  const ringRef2 = useRef()
  useFrame((_, delta) => {
    if (ringRef1.current) ringRef1.current.rotation.y += delta * 0.1
    if (ringRef2.current) ringRef2.current.rotation.x += delta * 0.08
  })
  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={ringRef1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.015, 16, 80]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.25 * intensity} />
      </mesh>
      <mesh ref={ringRef2} rotation={[Math.PI / 2 + 0.4, 0.3, 0]}>
        <torusGeometry args={[2.6, 0.012, 16, 80]} />
        <meshBasicMaterial color="#ff00cc" transparent opacity={0.15 * intensity} />
      </mesh>
    </group>
  )
}

function ScanningLine({ active }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (!ref.current || !active) return
    ref.current.position.y += delta * 0.6
    if (ref.current.position.y > 2.5) ref.current.position.y = -1.2
  })
  if (!active) return null
  return (
    <mesh position={[0, -1.2, 0]}>
      <planeGeometry args={[4, 0.06]} />
      <meshBasicMaterial color="#00f0ff" transparent opacity={0.12} depthWrite={false} />
    </mesh>
  )
}

function GridFloor({ intensity = 1 }) {
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
        <lineBasicMaterial color="#00f0ff" transparent opacity={0.06 * intensity} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function DataStream({ count = 250 }) {
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
        color="#00f0ff"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}