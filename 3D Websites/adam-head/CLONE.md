# Base Template: Product Showcase

A scroll-driven 3D product showcase with dynamic camera transitions, post-processing effects, and glassmorphism UI overlays.

**Built with:** React 19 + Vite + React Three Fiber + GSAP ScrollTrigger + Lenis

---

## 🚀 Quick Start

### 1. Clone the Template

```bash
# Create a new project from this template
cp -r ~/.hermes/templates/3d-websites/base ~/path/to/my-project
cd ~/path/to/my-project

# Install dependencies
npm install

# Start dev server
npm run dev
```

The site will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
base/
├── public/
│   ├── model.gltf          # Your 3D model (required)
│   └── ...                 # Textures and bin files
├── src/
│   ├── App.jsx             # Main layout + scroll logic + 4 sections
│   ├── App.css             # Glassmorphism + responsive styles
│   ├── main.jsx            # React entry point
│   └── components/
|       ├── CameraAnimator.jsx   # Spring-physics camera + section visuals (v2.0)
|       ├── Model.jsx            # glTF loader + PBR materials
|       ├── Loader.jsx           # Loading screen with progress bar
|       └── ui.jsx               # anime.js animated UI components (Nav, AnimatedHeading, PrimaryButton)
├── index.html              # Root HTML with loading screen
├── package.json            # Dependencies + overrides
├── vite.config.js          # Build config
└── CLONE.md                # This file
```

---

## 🎯 Customization Checklist

### Required Changes

- [ ] **Replace 3D Model**: Add your `.gltf` + `.bin` + textures to `public/`
- [ ] **Update Model Path**: Edit `src/components/Model.jsx` line to point to your model file
- [ ] **Update Copy**: Edit `src/App.jsx` sections (hero, about, features, CTA)

### Optional Changes

- [ ] **Camera Positions**: Edit `SECTIONS` array in `App.jsx` (lines ~16-21)
- [ ] **Section Visuals**: Edit `SECTION_VISUALS` in `CameraAnimator.jsx`
- [ ] **Colors**: Update CSS variables in `App.css` (gradient colors, accent colors)
- [ ] **Post-Processing**: Adjust bloom/vignette in `App.jsx` EffectComposer
- [ ] **Particles**: Modify count, color, opacity in Particles component

---

## 🎨 Section Visuals System

Each section has its own visual identity defined in `CameraAnimator.jsx`:

```javascript
export const SECTION_VISUALS = [
  {
    // Section 0: Hero
    modelScale: 1.2,
    modelY: 0,
    modelRotY: 0,
    bloomIntensity: 0.3,
    bgColor: '#0a0a0a',
    fogNear: 8,
    fogFar: 20,
  },
  {
    // Section 1: About
    modelScale: 1.25,
    modelY: 0.1,
    modelRotY: 0.4,
    bloomIntensity: 0.5,
    bgColor: '#0a0a12',
    fogNear: 6,
    fogFar: 18,
  },
  // ... more sections
]
```

**Adjust these to match your reference site's pacing.**

---

## 🔧 Key Components

### CameraAnimator.jsx (v2.0 — Spring Physics)

Handles:
- **Spring-physics camera** — replaces lerp with damped spring for physical weight
- **Per-section spring personality** — snappy entry, dramatic overshoot, calm resolution
- **Smooth bgColor interpolation** — Three.js Color.lerp (no snap transitions)
- **3DOF mouse parallax** — subtle head-tracking on top of scroll camera
- **Scroll velocity amplification** — fast scroll = faster camera response
- Section visual blending (model scale, bloom, fog)
- OrbitControls sync

**Customize**: `SECTIONS` array (camera positions), `SECTION_VISUALS` (per-section transforms + spring params)

### Model.jsx

Handles:
- Loading glTF model
- PBR material setup
- HDRI environment mapping
- Per-section scale/position/rotation animation

**Customize**: Material properties (metalness, roughness, clearcoat), envMap preset

### App.jsx

Handles:
- Lenis smooth scroll initialization
- GSAP ScrollTrigger per section
- React state for section visuals
- Overlay sections (HTML on top of canvas)

**Customize**: Section content, scroll easing, animation speed

---

## 🎭 Post-Processing Effects

Located in `App.jsx` inside `<Canvas>`:

```jsx
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
```

**Adjust**:
- Bloom intensity per section (via `SECTION_VISUALS`)
- Vignette darkness (0.0 = no vignette, 1.0 = full black edges)
- Noise opacity (subtle film grain)

---

## 📱 Performance Tips

- **Mobile DPR**: Capped at 2 in `Canvas` config (prevents overdraw)
- **Particle Count**: 120 particles (reduce to 50 on mobile if needed)
- **Texture Resolution**: Use compressed formats (KTX2, Basis) for production
- **Model Optimization**: Reduce polygon count with Blender decimation

---

## 🐛 Known Pitfalls

1. **React 19 + R3F v8**: Requires `overrides` in `package.json` (already configured)
2. **glTF Texture Paths**: Must mirror exact directory structure under `public/`
3. **Terminal Blocks Vite**: Use `execute_code` with subprocess for building
4. **CORS on file://**: Never open build output directly — always serve via HTTP
5. **Cloning Breaks Animations**: Use `onBeforeCompile` instead of `scene.clone()`

---

## 📚 Related Skills

Load these for advanced customization:

- `react-three-fiber-website` — Component patterns, lighting, gotchas
- `3d-website-reference-catalog` — Reference sites for inspiration
- `ui-ux-pro-max` — UI design for overlays
- `popular-web-designs` — Borrow design systems (Stripe, Linear, etc.)

---

## 🆘 Troubleshooting

### Model doesn't load
- Check browser console for 404 errors
- Verify texture paths in glTF match `public/` structure
- Run dev server (not `file://` protocol)

### Scroll feels jerky
- Ensure Lenis is initialized in `App.jsx`
- Check `gsap.ticker.lagSmoothing(0)` is set
- Verify `smoothWheel: !prefersReducedMotion.current`

### Camera doesn't move
- Check `SCROLL_PROGRESS` is updating in `CameraAnimator.jsx`
- Verify section refs are attached to DOM elements
- Check browser console for GSAP errors

### Post-processing not visible
- Ensure `<EffectComposer>` is inside `<Canvas>`
- Verify `@react-three/postprocessing` is installed
- Check bloom threshold (too high = no bloom)

---

## 📝 Version History

- **v2.0.0** (2026-06-04): Spring physics camera + smooth color + baked UI
  - Spring-physics camera (tension/damping per section, replaces lerp)
  - Smooth bgColor interpolation via Three.js Color.lerp
  - 3DOF mouse parallax (subtle head-tracking)
  - Scroll velocity amplification (fast scroll = faster camera)
  - anime.js animated UI components baked in (Nav, AnimatedHeading, PrimaryButton)
  - Per-section spring personality (snappy, dramatic, calm)

- **v1.0.0** (2026-06-03): Initial release based on adamHead2 project
  - Lenis smooth scroll
  - GSAP ScrollTrigger
  - Dynamic section visuals
  - Post-processing (bloom, vignette, noise)
  - Loading screen with progress bar
  - Ambient particles

---

## 💡 Next Steps

After cloning and customizing:

1. **Test on mobile** — Check DPR capping, particle count
2. **Optimize textures** — Compress to KTX2 for production
3. **Add analytics** — Track scroll depth, section engagement
4. **Deploy** — Vercel, Netlify, or static hosting
5. **Create new template** — Fork this and build a configurator variant

---

**Built by Hermes 3D Website Builder System**
