import { useEffect, useRef, useState, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import * as THREE from 'three'
import Lenis from 'lenis'
import Model from './components/Model'
import CameraAnimator, { initMouseTracking } from './components/CameraAnimator'
import Loader from './components/Loader'
import { AnimatedHeading, PrimaryButton, Nav } from './components/ui'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SECTIONS = [
  { id: 'hero',     camera: [0, 1.8, 4.5],  target: [2.5, 0.4, 0] },
  { id: 'about',    camera: [1.5, 1.2, 3.5], target: [1.0, 0.3, 0] },
  { id: 'features', camera: [0, 1.5, 4.0],  target: [0, 0.4, 0] },
  { id: 'cta',      camera: [0, 0.5, 5.5],   target: [0, 0.5, 0] },
]

const NAV_LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Tech', href: '#features' },
  { label: 'Contact', href: '#cta' },
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
  const [materialMode, setMaterialMode] = useState('Iridescence')
  const [hoverIntensity, setHoverIntensity] = useState(0)

  // Initialize Lenis + ScrollTrigger + scroll velocity tracking
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

    // Track scroll velocity for camera amplification
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

    // Initialize 3DOF mouse parallax
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
      <Nav links={NAV_LINKS} logo="3D Showcase" />
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 1.8, 4.5], fov: 45, near: 0.1, far: 100 }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <Environment preset="studio" background={false} blur={0.5} />

          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 8, 6]} intensity={1.8} color="#f0f0ff" />
          <directionalLight position={[-3, 4, -2]} intensity={0.6} color="#ec4899" />
          <directionalLight position={[0, -3, 4]} intensity={0.4} color="#ec4899" />
          <hemisphereLight args={['#ec4899', '#1a0a20', 0.4]} />
          <fog attach="fog" args={['#0a0a12', 8, 20]} />
          {/* Scene background sphere */}
          <mesh>
            <sphereGeometry args={[50, 32, 32]} />
            <meshBasicMaterial color={sectionVisuals?.sceneColor || '#0a0a0a'} side={THREE.BackSide} />
          </mesh>

          <Suspense fallback={null}>
            <SceneController visuals={sectionVisuals} />
            <Particles count={120} />

            <CameraAnimator
              sections={SECTIONS}
              scrollProgress={scrollProgress}
              scrollVelocity={scrollVelocity}
              controlsRef={controlsRef}
              onVisualsUpdate={onVisualsUpdate.current}
            />
            <Model modelRef={modelRef} visuals={sectionVisuals}
              onHover={(v) => setHoverIntensity(v)}
              onClickMode={(name) => setMaterialMode(name)}
            />

            <EffectComposer>
              <Bloom
                luminanceThreshold={0.6}
                luminanceSmoothing={0.8}
                intensity={sectionVisuals?.bloomIntensity || 0.4}
                kernelSize={KernelSize.MEDIUM}
              />
              <Vignette offset={0.3} darkness={0.6} />
              <Noise opacity={0.015} />
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
          </Suspense>
        </Canvas>

        <Loader />
      </div>

      {/* Scroll hint */}
      <div
        className="scroll-hint"
        style={{ opacity: scrollProgress > 0.05 ? 0 : 0.5 }}
      >
        <span>Scroll to explore</span>
        <div className="scroll-mouse" />
      </div>

      {/* ===== DIRECT TEXT OVERLAY (wraps around 3D model position) ===== */}
      <div className="content-overlay">
        {SECTIONS.map((sec, i) => {
          const isActive = activeSection === i
          const isNear = Math.abs(activeSection - i) <= 1
          // Text position wraps around the model's 3D position per section
          // Section 0: model is far RIGHT → text on LEFT (default)
          // Section 1: model is CENTER CLOSE → text on RIGHT
          // Section 2: model is CENTER ELEVATED → text on LEFT
          // Section 3: model is CENTER PUSHED BACK → text CENTERED
          const alignClass = i === 1 ? 'section-right' : (i === 3 ? 'section-center' : '')
          return (
            <section key={sec.id} className={`scene-section ${alignClass}`} id={sec.id}
              ref={(el) => (sectionRefs.current[i] = el)}
              style={{ opacity: isActive ? 1 : (isNear ? 0.1 : 0), transition: 'opacity 0.6s ease', pointerEvents: isActive ? 'auto' : 'none' }}>
              {i === 0 && (
                <div className="hero-text">
                  <span className="section-tag">Scroll to explore</span>
                  <h1 className="hero-heading">Adam Head</h1>
                  <p className="hero-sub">Click the model to cycle materials</p>
                </div>
              )}
              {i === 1 && (
                <div className="section-text-right">
                  <span className="section-tag">Inspection mode</span>
                  <h2 className="section-heading"><span className="gradient-text">Examine</span></h2>
                  <p className="section-sub">180° flip — swings closer, rises up</p>
                </div>
              )}
              {i === 2 && (
                <div className="section-text">
                  <span className="section-tag">Energy pulse</span>
                  <h2 className="section-heading"><span className="gradient-text">Awakened</span></h2>
                  <p className="section-sub">Elevated, pulsing with iridescence</p>
                </div>
              )}
              {i === 3 && (
                <div className="cta-fullscreen">
                  <h2 className="cta-mega-text"><span className="gradient-text">Stillness</span></h2>
                  <div className="cta-overlay-content">
                    <span className="section-tag">Return to stillness</span>
                    <p className="cta-sub">The model settles down and drifts back</p>
                    <button className="btn-ghost" onClick={() => window.open('https://github.com', '_blank')}>
                      View on GitHub →
                    </button>
                  </div>
                </div>
              )}
            </section>
          )
        })}
        <div style={{ height: '1px' }} />
      </div>
    </>
  )
}

// ─── Dynamic Scene Controller ─────────────────────────────────
function SceneController({ visuals }) {
  const { scene } = useThree()
  useFrame(() => {
    if (!visuals || !scene.fog) return
    const speed = 0.04
    scene.fog.near += ((visuals.fogNear || 8) - scene.fog.near) * speed
    scene.fog.far += ((visuals.fogFar || 20) - scene.fog.far) * speed
  })
  return null
}

// ─── Ambient Particles ────────────────────────────────────────
function Particles({ count = 100 }) {
  const ref = useRef()

  useEffect(() => {
    if (!ref.current) return
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2
    }
    ref.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const p = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      p[i * 3] += Math.sin(clock.elapsedTime * 0.1 + i) * 0.0003
      p[i * 3 + 1] += Math.cos(clock.elapsedTime * 0.08 + i * 0.5) * 0.0003
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry />
      <pointsMaterial
        size={0.015} color="#ec4899" transparent opacity={0.25}
        sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  )
}