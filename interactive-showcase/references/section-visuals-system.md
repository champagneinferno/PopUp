# Section Visuals — v2.0 (Spring Physics + Color Lerp)

Upgraded from v1.0 lerp-based to v2.0 spring physics with smooth color interpolation.

## 1. Define SECTION_VISUALS with Spring Personality

```jsx
export const SECTION_VISUALS = [
  {
    // Section 0: Hero — snappy, confident
    modelScale: 1.2, modelY: 0, modelRotY: 0,
    bloomIntensity: 0.3, bgColor: '#0a0a0a',
    fogNear: 8, fogFar: 20,
    springTension: 200, springDamping: 20,   // camera spring
    visualTension: 100, visualDamping: 16,   // model response
  },
  {
    // Section 1: About — moderate
    modelScale: 1.25, modelY: 0.1, modelRotY: 0.4,
    bloomIntensity: 0.5, bgColor: '#0a0a12',
    fogNear: 6, fogFar: 18,
    springTension: 160, springDamping: 18,
    visualTension: 80, visualDamping: 14,
  },
  {
    // Section 2: Features — dramatic overshoot (low damping = bounce)
    modelScale: 1.3, modelY: 0.2, modelRotY: -0.3,
    bloomIntensity: 0.7, bgColor: '#0d0a12',
    fogNear: 5, fogFar: 15,
    springTension: 220, springDamping: 14,
    visualTension: 120, visualDamping: 12,
  },
  {
    // Section 3: CTA — calm resolution (heavy damping = no bounce)
    modelScale: 1.15, modelY: -0.1, modelRotY: 0,
    bloomIntensity: 0.6, bgColor: '#0a0a0a',
    fogNear: 10, fogFar: 25,
    springTension: 120, springDamping: 28,
    visualTension: 60, visualDamping: 22,
  },
]
```

## 2. CameraAnimator — Spring Physics (replaces lerp)

```jsx
function applySpring(current, target, velocity, tension, damping, delta) {
  const dt = Math.min(delta, 0.05)
  velocity.x += (target.x - current.x) * tension * dt
  velocity.y += (target.y - current.y) * tension * dt
  velocity.z += (target.z - current.z) * tension * dt
  const f = 1 - Math.min(damping * dt, 0.99)
  velocity.x *= f; velocity.y *= f; velocity.z *= f
  current.x += velocity.x * dt
  current.y += velocity.y * dt
  current.z += velocity.z * dt
}

export default function CameraAnimator({ sections, scrollProgress, controlsRef, onVisualsUpdate, scrollVelocity }) {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3(...sections[0].camera))
  const tgt = useRef(new THREE.Vector3(...sections[0].target))
  const posVel = useRef(new THREE.Vector3())
  const tgtVel = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const raw = scrollProgress * (sections.length - 1)
    const prev = Math.min(Math.floor(raw), sections.length - 2)
    const next = prev + 1
    const t = raw - prev

    // Blend sections ...
    const vA = SECTION_VISUALS[prev]
    const vB = SECTION_VISUALS[next]

    // Blended spring params
    const tension = vA.springTension + (vB.springTension - vA.springTension) * t
    const damping = vA.springDamping + (vB.springDamping - vA.springDamping) * t
    const velFactor = 1 + Math.min(Math.abs(scrollVelocity || 0) * 4, 2)

    // Spring!
    applySpring(pos.current, targetPos, posVel.current, tension * velFactor, damping, delta)
    applySpring(tgt.current, targetTgt, tgtVel.current, tension * velFactor * 0.8, damping, delta)

    // 3DOF mouse parallax
    camera.position.x = pos.current.x + (mouse3DOF.x - (camera.position.x - pos.current.x)) * 0.02
    camera.position.y = pos.current.y + (mouse3DOF.y - (camera.position.y - pos.current.y)) * 0.02
    camera.position.z = pos.current.z
    camera.lookAt(tgt.current)

    // Smooth bgColor interpolation (NOT snaps!)
    const blendedColor = new THREE.Color(vA.bgColor).lerp(new THREE.Color(vB.bgColor), t).getStyle()
    // ...
  })
  return null
}
```

## 3. 3DOF Mouse Tracking (in App.jsx)

```jsx
import CameraAnimator, { initMouseTracking } from './components/CameraAnimator'

useEffect(() => {
  const cleanup = initMouseTracking()
  return () => cleanup?.()
}, [])
```

## 4. Scroll Velocity Tracking (in App.jsx)

```jsx
const [scrollVelocity, setScrollVelocity] = useState(0)

useEffect(() => {
  let lastProgress = 0, lastTime = performance.now()
  const track = () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight
    const cur = totalHeight > 0 ? Math.min(Math.max(window.scrollY / totalHeight, 0), 1) : 0
    const dt = Math.max(performance.now() - lastTime, 16)
    setScrollVelocity(Math.abs((cur - lastProgress) / (dt / 1000)) * 10)
    lastProgress = cur; lastTime += dt
    requestAnimationFrame(track)
  }
  const raf = requestAnimationFrame(track)
  return () => cancelAnimationFrame(raf)
}, [])

// Pass to CameraAnimator:
<CameraAnimator scrollVelocity={scrollVelocity} ... />
```

## 5. Quality Gate (v2.0 additions)

- [ ] **Spring feel**: Camera has physical weight (not linear slide)
- [ ] **Section personalities**: Each section feels different (snappy vs calm vs dramatic)
- [ ] **Color transitions**: bgColor lerps smoothly between sections (not snap)
- [ ] **Mouse parallax**: Subtle head-tracking visible when idle
- [ ] **Scroll velocity**: Fast scroll triggers faster camera response