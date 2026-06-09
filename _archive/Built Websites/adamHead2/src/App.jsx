import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import * as THREE from 'three'
import Lenis from 'lenis'
import Model from './components/Model'
import CameraAnimator from './components/CameraAnimator'
import Loader from './components/Loader'
import { AnimatedHeading, PrimaryButton, Nav } from './components/ui'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SECTIONS = [
  { id: 'hero',     camera: [0, 1.8, 4.5],  target: [0, 0.6, 0] },
  { id: 'about',    camera: [3.5, 1.2, 2.5], target: [0, 0.4, 0] },
  { id: 'features', camera: [-3, 0.8, 3],    target: [0, 0.3, 0] },
  { id: 'cta',      camera: [0, 0.5, 5.5],   target: [0, 0.5, 0] },
]

export default function App() {
  const [activeSection, setActiveSection] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const sectionRefs = useRef([])
  const controlsRef = useRef()
  const modelRef = useRef()
  const [sectionVisuals, setSectionVisuals] = useState(null)
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Navigation links
  const navLinks = [
    { href: '#hero', label: 'Home' },
    { href: '#about', label: 'About' },
    { href: '#features', label: 'Features' },
    { href: '#cta', label: 'Get Involved' },
  ]

  // Initialize Lenis + ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !prefersReducedMotion.current,
      wheelMultiplier: 1,
    })

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    // GSAP ScrollTrigger per section
    const ctx = gsap.context(() => {
      SECTIONS.forEach((_, i) => {
        const el = sectionRefs.current[i]
        if (!el) return

        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (e) => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight
            const progress = totalHeight > 0 ? Math.min(Math.max(window.scrollY / totalHeight, 0), 1) : 0
            setScrollProgress(progress)
          },
        })
      })
    })

    // Detect active section
    const onScroll = () => {
      const sectionEls = document.querySelectorAll('.scene-section')
      let active = 0
      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.4 && rect.bottom > 0) {
          active = i
        }
      })
      setActiveSection(active)
    }
    lenis.on('scroll', onScroll)
    onScroll()

    return () => {
      lenis.destroy()
      ctx.revert()
      gsap.ticker.lagSmoothing(1)
    }
  }, [])

const onVisualsUpdate = useRef((v) => setSectionVisuals(v))

  return (
    <>
      <Nav links={navLinks} />
      
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 1.8, 4.5], fov: 45, near: 0.1, far: 100 }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          gl={{ antialias: true, alpha: false }}
        >
          {/* Environment lighting */}
          <Environment preset="studio" background={false} blur={0.5} />

          {/* Lights */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 8, 6]} intensity={1.8} color="#f0f0ff" />
          <directionalLight position={[-3, 4, -2]} intensity={0.6} color="#7c3aed" />
          <directionalLight position={[0, -3, 4]} intensity={0.4} color="#ec4899" />
          <hemisphereLight args={['#7c3aed', '#1a1a2e', 0.4]} />
          <fog attach="fog" args={['#0a0a0a', 8, 20]} />

          {/* Background sphere */}
          <mesh>
            <sphereGeometry args={[50, 32, 32]} />
            <meshBasicMaterial color={sectionVisuals?.bgColor || '#0a0a0a'} side={THREE.BackSide} />
          </mesh>

          {/* Dynamic scene controller — updates fog, bg per section */}
          <SceneController visuals={sectionVisuals} />

          {/* Ambient floating particles */}
          <Particles count={120} />

          {/* Scene content */}
          <CameraAnimator
            sections={SECTIONS}
            scrollProgress={scrollProgress}
            controlsRef={controlsRef}
            onVisualsUpdate={onVisualsUpdate.current}
          />
          <Model modelRef={modelRef} visuals={sectionVisuals} />

          {/* Post-processing */}
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

          {/* Controls */}
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

        {/* Loading screen component */}
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

      {/* Navigation dots */}
      <div className="nav-dots">
        {SECTIONS.map((_, i) => (
          <button
            key={i}
            className={`nav-dot ${activeSection === i ? 'active' : ''}`}
            onClick={() => {
              const el = document.querySelectorAll('.scene-section')[i]
              if (el) el.scrollIntoView({ behavior: prefersReducedMotion.current ? 'auto' : 'smooth' })
            }}
          />
        ))}
      </div>

      {/* ===== OVERLAY SECTIONS ===== */}
      <div className="content-overlay">

        <section className="scene-section" id="hero">
          <div className="glass-card" ref={(el) => (sectionRefs.current[0] = el)}>
            <div className="accent-bar" />
            <span className="tag">3D Cinematic Experience</span>
            <AnimatedHeading 
              text="Adam Head" 
              level="h1" 
              className="space-grotesk" 
              style={{ fontSize: '2.8rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '1rem' }}
            >
              <span className="gradient-text">Adam Head</span>
            </AnimatedHeading>
            <p style={{ fontSize: '0.9rem', opacity: 0.6, lineHeight: 1.7, marginBottom: '1.5rem' }}>
              A cinematic 3D interactive showcase — procedurally lit, 
              scroll-driven camera choreography, and real-time post-processing. 
              Drag to orbit, scroll to explore.
            </p>
            <div className="stats-grid">
              <div className="stat-item">
                <h3 className="gradient-text">4</h3><p>Scenes</p>
              </div>
              <div className="stat-item">
                <h3 className="gradient-text">60</h3><p>FPS</p>
              </div>
              <div className="stat-item">
                <h3 className="gradient-text">2</h3><p>MB</p>
              </div>
            </div>
          </div>
        </section>

        <section className="scene-section section-right" id="about">
          <div className="glass-card" ref={(el) => (sectionRefs.current[1] = el)}>
            <div className="accent-bar" />
            <span className="tag">Crafted with precision</span>
            <AnimatedHeading 
              text="Built from scratch" 
              level="h2" 
              className="space-grotesk" 
              style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}
            >
              Built from <span className="gradient-text">scratch</span>
            </AnimatedHeading>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.7, marginBottom: '1.5rem' }}>
              High-fidelity glTF scan enhanced with PBR materials, 
              HDRI environment lighting, bloom post-processing, and 
              smooth scroll — all at 60fps.
            </p>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">✦</div>
                <h4>PBR + HDRI</h4>
                <p>Photorealistic shading</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">◉</div>
                <h4>Post-Processing</h4>
                <p>Bloom + vignette</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⟳</div>
                <h4>Orbit Controls</h4>
                <p>Drag to rotate</p>
              </div>
            </div>
          </div>
        </section>

        <section className="scene-section" id="features">
          <div className="glass-card" ref={(el) => (sectionRefs.current[2] = el)}>
            <div className="accent-bar" />
            <span className="tag">Tech Stack</span>
            <AnimatedHeading 
              text="R3F + GSAP + Lenis" 
              level="h2" 
              className="space-grotesk" 
              style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}
            >
              R3F + GSAP + <span className="gradient-text">Lenis</span>
            </AnimatedHeading>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.7, marginBottom: '1.5rem' }}>
              React Three Fiber for 3D, GSAP ScrollTrigger for per-section 
              progress, Lenis for buttery smooth scrolling, and 
              @react-three/postprocessing for cinematic bloom and vignette.
            </p>
            <PrimaryButton 
              onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore further
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </PrimaryButton>
          </div>
        </section>

        <section className="scene-section section-center" id="cta">
          <div className="glass-card" ref={(el) => (sectionRefs.current[3] = el)} style={{ textAlign: 'center' }}>
            <div className="accent-bar" style={{ margin: '0 auto 1.5rem' }} />
            <span className="tag">Get Involved</span>
            <AnimatedHeading 
              text="Want your own 3D experience?" 
              level="h2" 
              className="space-grotesk" 
              style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.75rem' }}
            >
              Want your own <span className="gradient-text">3D experience?</span>
            </AnimatedHeading>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.7, marginBottom: '2rem', maxWidth: 440, margin: '0 auto 2rem' }}>
              Scroll-driven 3D websites with cinematic post-processing — 
              one model, one developer, one AI agent.
            </p>
            <PrimaryButton onClick={() => window.open('https://github.com', '_blank')}>
              View on GitHub
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

// ─── Dynamic Scene Controller ─────────────────────────────────
// Updates fog distance per section
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
        size={0.015}
        color="#7c3aed"
        transparent
        opacity={0.25}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}