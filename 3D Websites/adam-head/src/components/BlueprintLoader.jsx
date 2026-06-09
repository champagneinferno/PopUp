import { useEffect, useRef } from 'react'

/**
 * Lighting presets mapped from theme string to Three.js light configuration.
 * Each preset defines:
 *   lights    – array of { type, position, intensity, color, args? }
 *   fog       – { color, near, far }
 *   bgColor   – background color string
 *   ambient   – { intensity, color }
 *   hemisphere – { skyColor, groundColor, intensity }
 *   bloom     – default bloom intensity
 *   accent    – primary accent color for UI chrome
 */
const THEME_LIGHTING = {
  tech: {
    ambient: { intensity: 0.15, color: '#001122' },
    hemisphere: { skyColor: '#001a33', groundColor: '#020812', intensity: 0.3 },
    fog: { color: '#020812', near: 6, far: 18 },
    bgColor: '#020812',
    bloom: 0.6,
    accent: '#00f0ff',
    lights: [
      { type: 'directional', position: [5, 6, 5], intensity: 2.2, color: '#00f0ff' },
      { type: 'directional', position: [-4, 3, -3], intensity: 1.0, color: '#ff00cc' },
      { type: 'directional', position: [0, -2, 4], intensity: 0.6, color: '#0055ff' },
      { type: 'point', position: [2, 2, 3], intensity: 8, color: '#00f0ff', distance: 10 },
      { type: 'point', position: [-2, -1, 2], intensity: 5, color: '#ff00cc', distance: 8 },
    ],
  },
  creative: {
    ambient: { intensity: 0.12, color: '#221100' },
    hemisphere: { skyColor: '#2a1a0a', groundColor: '#0a0806', intensity: 0.4 },
    fog: { color: '#0d0805', near: 4, far: 14 },
    bgColor: '#0d0805',
    bloom: 0.8,
    accent: '#ff8844',
    lights: [
      { type: 'directional', position: [4, 5, 4], intensity: 2.5, color: '#ff8844' },
      { type: 'directional', position: [-3, 2, -4], intensity: 1.2, color: '#ff4466' },
      { type: 'directional', position: [1, -1, 3], intensity: 0.5, color: '#ffaa00' },
      { type: 'point', position: [2, 1, 3], intensity: 10, color: '#ff8844', distance: 10 },
      { type: 'point', position: [-1, -1, 2], intensity: 6, color: '#ff4466', distance: 8 },
    ],
  },
  minimal: {
    ambient: { intensity: 0.2, color: '#111111' },
    hemisphere: { skyColor: '#1a1a1a', groundColor: '#0a0a0a', intensity: 0.35 },
    fog: { color: '#0a0a0a', near: 5, far: 20 },
    bgColor: '#0a0a0a',
    bloom: 0.3,
    accent: '#ffffff',
    lights: [
      { type: 'directional', position: [6, 8, 6], intensity: 3.0, color: '#ffffff' },
      { type: 'directional', position: [-5, 4, -4], intensity: 1.5, color: '#888888' },
      { type: 'point', position: [0, 3, 0], intensity: 4, color: '#ffffff', distance: 12 },
    ],
  },
  editorial: {
    ambient: { intensity: 0.18, color: '#1a1410' },
    hemisphere: { skyColor: '#2a2218', groundColor: '#0d0a08', intensity: 0.3 },
    fog: { color: '#0d0a08', near: 5, far: 16 },
    bgColor: '#0d0a08',
    bloom: 0.5,
    accent: '#fff8e8',
    lights: [
      { type: 'directional', position: [4, 5, 4], intensity: 2.0, color: '#fff8e8' },
      { type: 'directional', position: [-3, 2, -3], intensity: 1.0, color: '#446688' },
      { type: 'point', position: [2, 2, 2], intensity: 6, color: '#fff8e8', distance: 10 },
    ],
  },
}

/**
 * Section-level visual presets generated per section.
 * Controls model scale/position, bloom intensity, fog range, spring physics.
 */
function generateSectionVisuals(sectionCount, theme) {
  const preset = THEME_LIGHTING[theme] || THEME_LIGHTING.tech
  const visuals = []

  for (let i = 0; i < sectionCount; i++) {
    const t = sectionCount > 1 ? i / (sectionCount - 1) : 0
    // Model positioning — fan out horizontally then bring back center on last
    const angle = (t - 0.5) * Math.PI * 0.6
    const orbitRadius = 2.0 + t * 1.5

    visuals.push({
      modelScale: 1.5 - t * 0.8,
      modelX: Math.sin(angle) * orbitRadius,
      modelY: 0.5 + Math.sin(t * Math.PI) * 0.4,
      modelZ: -t * 2.5,
      modelRotY: angle * 0.5,
      bloomIntensity: preset.bloom + Math.sin(t * Math.PI) * 0.3,
      bgColor: preset.bgColor,
      fogNear: 6 - t * 3,
      fogFar: 18 - t * 6,
      springTension: 240 - t * 150,
      springDamping: 16 + t * 16,
      visualTension: 130 - t * 85,
      visualDamping: 12 + t * 14,
    })
  }

  return visuals
}

/**
 * Generate nav links from section tags.
 */
function generateNavLinks(sections) {
  return sections.map((s, i) => ({
    label: s.tag?.split(' ')[0] || `Section ${i + 1}`,
    href: `#section-${i}`,
  }))
}

/**
 * Map branding colors to CSS custom properties on :root.
 */
function applyBrandingCSS(branding, theme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const lighting = THEME_LIGHTING[theme] || THEME_LIGHTING.tech
  const primary = branding?.primary_color || lighting.accent
  const secondary = branding?.secondary_color || (theme === 'tech' ? '#ff00cc'
    : theme === 'creative' ? '#ff4466'
    : theme === 'minimal' ? '#888888'
    : '#446688')
  const bgColor = lighting.bgColor

  root.style.setProperty('--bp-primary', primary)
  root.style.setProperty('--bp-secondary', secondary)
  root.style.setProperty('--bp-bg', bgColor)
  root.style.setProperty('--bp-text', '#d0e8ff')
  root.style.setProperty('--bp-accent-bar', `linear-gradient(135deg, ${primary}, ${secondary})`)
  root.style.setProperty('--bp-glass-bg', `rgba(0, 15, 40, 0.55)`)
  root.style.setProperty('--bp-glass-border', `${primary}1e`)

  // Override existing cyber vars so all UI components pick up the new theme
  root.style.setProperty('--cyber-cyan', primary)
  root.style.setProperty('--cyber-magenta', secondary)
  root.style.setProperty('--cyber-bg', bgColor)

  // Typography
  if (branding?.typography?.family) {
    root.style.setProperty('--bp-font-ui', branding.typography.family)
    root.style.setProperty('--font-ui', branding.typography.family)
  }
  if (branding?.typography?.mono_family) {
    root.style.setProperty('--bp-font-mono', branding.typography.mono_family)
    root.style.setProperty('--font-mono', branding.typography.mono_family)
  }
}

/**
 * Default import path for the evaluator's blueprint file.
 */
const DEFAULT_BLUEPRINT_PATH = '../reference/sample-blueprint.json'

/**
 * BlueprintLoader — reads a 3d_scene_blueprint.json and dynamically
 * populates the cyberspace template's sections, colors, lighting, and content.
 *
 * Props:
 *   blueprint          – JSON object (optional; imported by default from reference)
 *   onBlueprintLoaded  – callback({ sections, sectionContent, sectionVisuals, branding, theme, navLinks })
 *   themeOverride      – force a specific theme ('tech'|'creative'|'minimal'|'editorial')
 *
 * Usage:
 *   <BlueprintLoader onBlueprintLoaded={(data) => {
 *     setSections(data.sections)
 *     setSectionContent(data.sectionContent)
 *     // ...
 *   }} />
 */
export default function BlueprintLoader({
  blueprint: blueprintProp,
  onBlueprintLoaded,
  themeOverride,
}) {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    let blueprint = blueprintProp

    // If no blueprint prop, try the default import
    if (!blueprint) {
      // Attempt dynamic import — silent fail if file missing
      try {
        blueprint = require(DEFAULT_BLUEPRINT_PATH)
      } catch {
        console.warn('[BlueprintLoader] No blueprint found at default path. Pass blueprint prop.')
        return
      }
    }

    if (!blueprint?.sections?.length) {
      console.warn('[BlueprintLoader] Blueprint has no sections array.')
      return
    }

    const theme = themeOverride || blueprint.theme || 'tech'
    const branding = blueprint.branding || {}
    const sectionCount = blueprint.sections.length
    const validatedTheme = THEME_LIGHTING[theme] ? theme : 'tech'

    // 1. Generate SECTIONS array (camera + target for CameraAnimator)
    const sections = blueprint.sections.map((s, i) => {
      const cam = s.camera || { x: 0, y: 0.5, z: 8 }
      return {
        id: `section-${i}`,
        camera: [cam.x, cam.y, cam.z],
        target: [0, 0.5, 0],
      }
    })

    // 2. Generate sectionContent (for dynamic JSX rendering)
    const sectionContent = blueprint.sections.map((s, i) => ({
      id: `section-${i}`,
      tag: s.tag || `SECTION_${i}`,
      heading: s.heading || '',
      body: s.body || '',
      stats: s.stats || [],
      specs: s.specs || [],
      cards: s.cards || [],
      camera: s.camera || { x: 0, y: 0.5, z: 8 },
    }))

    // 3. Generate sectionVisuals (for CameraAnimator / SceneController)
    const sectionVisuals = generateSectionVisuals(sectionCount, validatedTheme)

    // 4. Generate nav links
    const navLinks = generateNavLinks(blueprint.sections)

    // 5. Apply branding CSS
    applyBrandingCSS(branding, validatedTheme)

    // 6. Callback with all processed data
    if (onBlueprintLoaded) {
      onBlueprintLoaded({
        sections,
        sectionContent,
        sectionVisuals,
        branding,
        theme: validatedTheme,
        navLinks,
        focalPoint: blueprint.focal_point || '',
        lightingPreset: THEME_LIGHTING[validatedTheme],
      })
    }
  }, [blueprintProp, onBlueprintLoaded, themeOverride])

  return null
}

// Export helpers for external use
export { THEME_LIGHTING, generateSectionVisuals, generateNavLinks, applyBrandingCSS }