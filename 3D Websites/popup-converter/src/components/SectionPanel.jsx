import anime from 'animejs'
import { useEffect, useRef } from 'react'

const THEMES = [
  { id: 'tech',     label: 'Tech',     accent: '#00f0ff', secondary: '#ff00cc' },
  { id: 'creative', label: 'Creative', accent: '#ff8844', secondary: '#ff4466' },
  { id: 'minimal',  label: 'Minimal',  accent: '#ffffff', secondary: '#888888' },
  { id: 'editorial',label: 'Editorial',accent: '#fff8e8', secondary: '#446688' },
]

export default function SectionPanel({ sections, activeSection, onSectionChange, theme, onThemeChange, branding }) {
  const panelRef = useRef(null)
  const contentRefs = useRef([])

  useEffect(() => {
    anime({
      targets: panelRef.current,
      opacity: [0, 1],
      translateX: [40, 0],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 300,
    })
  }, [])

  useEffect(() => {
    contentRefs.current.forEach((el, i) => {
      if (!el) return
      if (i === activeSection) {
        anime({
          targets: el,
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 400,
          easing: 'easeOutCubic',
        })
      }
    })
  }, [activeSection])

  const activeContent = sections[activeSection]
  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]

  return (
    <div className="section-panel" ref={panelRef} style={{ opacity: 0 }}>
      <div className="panel-header">
        <span className="panel-title">SECTIONS</span>
        <span className="panel-count">{sections.length} nodes</span>
      </div>

      {/* Section navigation */}
      <div className="panel-nav">
        {sections.map((section, i) => (
          <button
            key={i}
            className={`panel-nav-item ${i === activeSection ? 'active' : ''}`}
            onClick={() => onSectionChange(i)}
          >
            <span className="nav-index">[{(i + 1).toString().padStart(2, '0')}]</span>
            <span className="nav-label">{section.tag || `Section ${i + 1}`}</span>
            <span className="nav-arrow">&gt;</span>
          </button>
        ))}
      </div>

      {/* Active section content */}
      {activeContent && (
        <div
          className="panel-content"
          ref={(el) => { contentRefs.current[activeSection] = el }}
        >
          <div className="content-section-header">
            <span className="content-tag">{activeContent.tag}</span>
            <h3 className="content-heading">{activeContent.heading}</h3>
          </div>

          {activeContent.body && (
            <p className="content-body">{activeContent.body}</p>
          )}

          {activeContent.stats?.length > 0 && (
            <div className="content-stats">
              {activeContent.stats.map((stat, i) => (
                <div key={i} className="content-stat-item">
                  <span className="stat-value" style={{ color: activeTheme.accent }}>
                    {stat.value || stat.label}
                  </span>
                  <span className="stat-label">{stat.label || stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {activeContent.specs?.length > 0 && (
            <div className="content-specs">
              {activeContent.specs.map((spec, i) => (
                <div key={i} className="content-spec-item">
                  <span className="spec-key">{spec.key || spec.label}</span>
                  <span className="spec-value">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Branding info */}
      {branding && (
        <div className="panel-branding">
          <div className="branding-header">
            <span className="branding-label">BRANDING</span>
          </div>
          <div className="branding-colors">
            {branding.primary_color && (
              <div className="branding-color-item">
                <span
                  className="color-swatch"
                  style={{ backgroundColor: branding.primary_color }}
                />
                <span className="color-label">Primary</span>
                <span className="color-hex">{branding.primary_color}</span>
              </div>
            )}
            {branding.secondary_color && (
              <div className="branding-color-item">
                <span
                  className="color-swatch"
                  style={{ backgroundColor: branding.secondary_color }}
                />
                <span className="color-label">Secondary</span>
                <span className="color-hex">{branding.secondary_color}</span>
              </div>
            )}
          </div>
          {branding.typography && (
            <div className="branding-typography">
              <div className="typo-item">
                <span className="typo-label">Font:</span>
                <span className="typo-value">{branding.typography.family || branding.typography.mono_family || '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Theme switcher */}
      <div className="panel-themes">
        <span className="themes-label">LIGHTING</span>
        <div className="themes-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-btn ${theme === t.id ? 'active' : ''}`}
              onClick={() => onThemeChange(t.id)}
              style={{
                '--theme-accent': t.accent,
                '--theme-secondary': t.secondary,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats footer */}
      <div className="panel-footer">
        <div className="footer-stat">
          <span className="footer-stat-value">{sections.length}</span>
          <span className="footer-stat-label">sections</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-value">{activeContent?.stats?.length || 0}</span>
          <span className="footer-stat-label">metrics</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-value">{theme}</span>
          <span className="footer-stat-label">theme</span>
        </div>
      </div>
    </div>
  )
}