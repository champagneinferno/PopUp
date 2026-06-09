import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import * as THREE from 'three'
import Lenis from 'lenis'
import Model from './Model'
import CameraAnimator, { initMouseTracking } from './CameraAnimator'
import Globe from './Globe'
import GridFloor from './GridFloor'
import DataStream from './DataStream'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const THEME_LIGHTING = {
  tech: {
    bloom: 0.6, accent: '#00f0ff', secondary: '#ff00cc',
    env: 'night', fogCol: '#020812',
    lights: [
      { type: 'ambient', intensity: 0.15, color: '#001122' },
      { type: 'directional', position: [5, 6, 5], intensity: 2.2, color: '#00f0ff' },
      { type: 'directional', position: [-4, 3, -3], intensity: 1.0, color: '#ff00cc' },
      { type: 'directional', position: [0, -2, 4], intensity: 0.6, color: '#0055ff' },
      { type: 'point', position: [2, 2, 3], intensity: 8, color: '#00f0ff', distance: 10 },
      { type: 'point', position: [-2, -1, 2], intensity: 5, color: '#ff00cc', distance: 8 },
      { type: 'hemisphere', sky: '#001a33', ground: '#020812', intensity: 0.3 },
    ],
  },
  creative: {
    bloom: 0.8, accent: '#ff8844', secondary: '#ff4466',
    env: 'sunset', fogCol: '#0d0805',
    lights: [
      { type: 'ambient', intensity: 0.12, color: '#221100' },
      { type: 'directional', position: [4, 5, 4], intensity: 2.5, color: '#ff8844' },
      { type: 'directional', position: [-3, 2, -4], intensity: 1.2, color: '#ff4466' },
      { type: 'directional', position: [1, -1, 3], intensity: 0.5, color: '#ffaa00' },
      { type: 'point', position: [2, 1, 3], intensity: 10, color: '#ff8844', distance: 10 },
      { type: 'hemisphere', sky: '#2a1a0a', ground: '#0a0806', intensity: 0.4 },
    ],
  },
  minimal: {
    bloom: 0.3, accent: '#ffffff', secondary: '#888888',
    env: 'studio', fogCol: '#0a0a0a',
    lights: [
      { type: 'ambient', intensity: 0.2, color: '#111111' },
      { type: 'directional', position: [6, 8, 6], intensity: 3.0, color: '#ffffff' },
      { type: 'directional', position: [-5, 4, -4], intensity: 1.5, color: '#888888' },
      { type: 'hemisphere', sky: '#1a1a1a', ground: '#0a0a0a', intensity: 0.35 },
    ],
  },
  editorial: {
    bloom: 0.5, accent: '#fff8e8', secondary: '#446688',
    env: 'city', fogCol: '#0d0a08',
    lights: [
      { type: 'ambient', intensity: 0.18, color: '#1a1410' },
      { type: 'directional', position: [4, 5, 4], intensity: 2.0, color: '#fff8e8' },
      { type: 'directional', position: [-3, 2, -3], intensity: 1.0, color: '#446688' },
      { type: 'hemisphere', sky: '#2a2218', ground: '#0d0a08', intensity: 0.3 },
    ],
  },
}

function Lights({ preset }) {
  const p = preset || THEME_LIGHTING.tech
  return (
    <>
      {p.lights.map((l, i) => {
        if (l.type === 'ambient') return <ambientLight key={i} intensity={l.intensity} color={l.color} />
        if (l.type === 'directional') return <directionalLight key={i} position={l.position} intensity={l.intensity} color={l.color} />
        if (l.type === 'point') return <pointLight key={i} position={l.position} intensity={l.intensity} color={l.color} distance={l.distance} />
        if (l.type === 'hemisphere') return <hemisphereLight key={i} args={[l.sky, l.ground, l.intensity]} />
        return null
      })}
    </>
  )
}

// ─── Glowing Rings port ────────────────────────────────────
function GlowingRings({ accent, secondary, intensity = 1 }) {
  const r1 = useRef(), r2 = useRef()
  useFrame((_, delta) => {
    if (r1.current) r1.current.rotation.y += delta * 0.1
    if (r2.current) r2.current.rotation.x += delta * 0.08
  })
  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={r1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.015, 16, 80]} />
        <meshBasicMaterial color={accent} transparent opacity={0.25 * intensity} />
      </mesh>
      <mesh ref={r2} rotation={[Math.PI / 2 + 0.4, 0.3, 0]}>
        <torusGeometry args={[2.6, 0.012, 16, 80]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.15 * intensity} />
      </mesh>
    </group>
  )
}

// ─── Scanning Line port ────────────────────────────────────
function ScanningLine({ accent, active }) {
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
      <meshBasicMaterial color={accent} transparent opacity={0.12} depthWrite={false} />
    </mesh>
  )
}

function SceneBackground({ bgColor }) {
  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <meshBasicMaterial color={bgColor} side={THREE.BackSide} />
    </mesh>
  )
}

// ─── Section Overlay ───────────────────────────────────────
function SectionOverlay({ sections, activeSection, preset }) {
  const s = sections[activeSection]
  if (!s) return null
  return (
    <div className="scene-overlay">
      <div className="scene-overlay-content" style={{ borderColor: `${preset.accent}33` }}>
        <span className="scene-overlay-tag" style={{ color: preset.accent }}>{s.tag}</span>
        <h2 className="scene-overlay-heading" style={{ color: preset.accent }}>{s.heading}</h2>
        {s.body && <p className="scene-overlay-body">{s.body}</p>}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function ScenePreview({ blueprint, theme = 'tech', activeSection = 0, onSectionChange }) {
  const preset = THEME_LIGHTING[theme] || THEME_LIGHTING.tech
  const sections = blueprint?.sections || []
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollVelocity, setScrollVelocity] = useState(0)
  const [sectionVisuals, setSectionVisuals] = useState(null)
  const sectionRefs = useRef({})
  const controlsRef = useRef()
  const modelRef = useRef()

  // Build camera sections from blueprint
  const cameraSections = useMemo(() =>
    sections.map((s, i) => ({
      id: `s${i}`,
      camera: s.camera || [0, 1.5, 3.5],
      target: s.target || [0, 0.5, 0],
    }))
  , [sections])

  // ─── Lenis + GSAP + scroll tracking ──────────────────────
  useEffect(() => {
    if (sections.length === 0) return
    let lastProgress = 0, lastTime = performance.now()

    const lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
    })

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(time => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    const trackVelocity = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      const cur = total > 0 ? Math.min(Math.max(window.scrollY / total, 0), 1) : 0
      const now = performance.now(), dt = Math.max(now - lastTime, 16)
      setScrollVelocity(Math.abs((cur - lastProgress) / (dt / 1000)) * 10)
      lastProgress = cur; lastTime = now
      requestAnimationFrame(trackVelocity)
    }
    const raf = requestAnimationFrame(trackVelocity)

    const ctx = gsap.context(() => {
      Object.values(sectionRefs.current).forEach(el => {
        if (!el) return
        ScrollTrigger.create({
          trigger: el, start: 'top bottom', end: 'bottom top',
          onUpdate: () => {
            const total = document.documentElement.scrollHeight - window.innerHeight
            setScrollProgress(total > 0 ? Math.min(Math.max(window.scrollY / total, 0), 1) : 0)
          },
        })
      })
    })

    const onScroll = () => {
      const els = document.querySelectorAll('.scene-section')
      let active = 0
      els.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.4 && rect.bottom > 0) active = i
      })
      onSectionChange?.(active)
    }
    lenis.on('scroll', onScroll)

    const cleanupMouse = initMouseTracking()

    return () => { lenis.destroy(); ctx.revert(); cancelAnimationFrame(raf); cleanupMouse?.() }
  }, [sections.length])

  const onVisualsUpdate = useRef(v => setSectionVisuals(v))

  if (sections.length === 0) {
    // Fallback: show Globe + Grid + DataStream with orbit controls (no model, no scroll)
    return (
      <div className="scene-preview-container">
        <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <Environment preset={preset.env} background={false} blur={0.5} />
          <Lights preset={preset} />
          <SceneBackground bgColor={preset.fogCol} />
          <fog attach="fog" args={[preset.fogCol, 6, 18]} />
          <GridFloor accentColor={preset.accent} />
          <DataStream count={200} accentColor={preset.accent} />
          <Globe position={[0, 0.3, 0]} visible accentColor={preset.accent} secondaryColor={preset.secondary} />
          <GlowingRings accent={preset.accent} secondary={preset.secondary} />
          <ScanningLine accent={preset.accent} active />
          <EffectComposer>
            <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={preset.bloom} kernelSize={KernelSize.LARGE} />
            <Vignette offset={0.3} darkness={0.7} />
          </EffectComposer>
          <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.3} />
        </Canvas>
        <div className="scene-overlay">
          <div className="scene-overlay-content">
            <span className="scene-overlay-tag" style={{ color: preset.accent }}>// IDLE MODE</span>
            <h2 className="scene-overlay-heading" style={{ color: preset.accent }}>No sections extracted</h2>
            <p className="scene-overlay-body">Enter a URL and click CONVERT to populate the scene.</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Full scene with model + camera + scroll navigation ──
  return (
    <div className="scene-preview-container">
      <Canvas
        camera={{ position: [0, 1.5, 3.5], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 2, 2)]}
        gl={{ antialias: true, alpha: false, shadows: true, shadowMapType: THREE.PCFSoftShadowMap, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Environment preset={preset.env} background={false} blur={0.5} />
        <Lights preset={preset} />
        <SceneBackground bgColor={sectionVisuals?.bgColor || preset.fogCol} />
        <fog attach="fog" args={[preset.fogCol, 6, 18]} />

        <GridFloor accentColor={preset.accent} intensity={sectionVisuals?.sectionIndex === 2 ? 1.5 : 1} />
        <GlowingRings accent={preset.accent} secondary={preset.secondary} intensity={sectionVisuals?.sectionIndex === 2 ? 1.5 : 1} />
        <ScanningLine accent={preset.accent} active={!!sectionVisuals} />
        <DataStream count={250} accentColor={preset.accent} />
        <Globe position={[0, 0.3, 0]} visible accentColor={preset.accent} secondaryColor={preset.secondary} />

        <CameraAnimator
          sections={cameraSections}
          scrollProgress={scrollProgress}
          scrollVelocity={scrollVelocity}
          controlsRef={controlsRef}
          onVisualsUpdate={onVisualsUpdate.current}
        />
        <Model modelRef={modelRef} visuals={sectionVisuals} />

        <EffectComposer>
          <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={sectionVisuals?.bloomIntensity || preset.bloom} kernelSize={KernelSize.LARGE} />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>

        <OrbitControls ref={controlsRef} enablePan={false} enableZoom zoomSpeed={0.8} rotateSpeed={0.6} minDistance={2} maxDistance={8} maxPolarAngle={Math.PI / 2} autoRotate={false} />
      </Canvas>

      {/* Section overlays */}
      <div className="scene-sections-overlay" style={{ pointerEvents: 'none' }}>
        {sections.map((s, i) => (
          <section key={i} className="scene-section" ref={el => { if (el) sectionRefs.current[i] = el }}>
            <SectionOverlay sections={sections} activeSection={activeSection} preset={preset} />
            <div style={{ height: '100vh' }} />
          </section>
        ))}
      </div>
    </div>
  )
}