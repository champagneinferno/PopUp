import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import ConverterUI from './components/ConverterUI'
import BootSequence from './components/BootSequence'

// Heavy 3D components — only loaded when entering PREVIEW state
const ScenePreview = lazy(() => import('./components/ScenePreview'))
const SectionPanel = lazy(() => import('./components/SectionPanel'))

export default function App() {
  const [appState, setAppState] = useState('LANDING')  // LANDING | LOADING | PREVIEW
  const [blueprint, setBlueprint] = useState(null)
  const [activeSection, setActiveSection] = useState(0)
  const [theme, setTheme] = useState('tech')
  const [bootProgress, setBootProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const abortRef = useRef(null)
  const bootTimers = useRef([])

  useEffect(() => {
    return () => {
      bootTimers.current.forEach(t => clearTimeout(t))
      bootTimers.current = []
    }
  }, [])

  const handleConvert = useCallback(async (url) => {
    console.log('[DEBUG] handleConvert')
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setAppState('LOADING')
    setBootProgress(0)
    setBlueprint(null)
    setActiveSection(0)

    const stages = [
      { progress: 5, delay: 400 },
      { progress: 15, delay: 1000 },
      { progress: 30, delay: 2000 },
      { progress: 50, delay: 3000 },
      { progress: 65, delay: 4200 },
      { progress: 80, delay: 5500 },
      { progress: 90, delay: 7000 },
    ]

    stages.forEach(({ progress, delay }) => {
      const timer = setTimeout(() => {
        setBootProgress(prev => Math.max(prev, progress))
      }, delay)
      bootTimers.current.push(timer)
    })

    setStatusMessage('Connecting to converter engine...')

    try {
      const response = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()
      setBlueprint(data)

      setBootProgress(100)
      setStatusMessage('Scene ready')

      setTimeout(() => {
        setAppState('PREVIEW')
        setStatusMessage('')
        const screen = document.getElementById('loading-screen')
        if (screen) {
          screen.classList.add('fade-out')
          setTimeout(() => { screen.style.display = 'none' }, 800)
        }
      }, 1200)

    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Convert failed:', err)
      setStatusMessage(`Error: ${err.message}`)
      setTimeout(() => {
        setAppState('LANDING')
        setStatusMessage('')
      }, 3000)
    }
  }, [])

  const handleSectionChange = useCallback((index) => {
    setActiveSection(index)
  }, [])

  const handleThemeChange = useCallback((newTheme) => {
    setTheme(newTheme)
  }, [])

  return (
    <div className="app-container">
      {/* ─── LANDING: Pure CSS + DOM, no 3D ─── */}
      {appState === 'LANDING' && (
        <div className="landing-state">
          <div className="landing-bg" />
          <div className="landing-content">
            <ConverterUI
              onConvert={handleConvert}
              isLoading={false}
              statusMessage={statusMessage}
            />
          </div>
        </div>
      )}

      {/* ─── LOADING: Boot sequence ─── */}
      {appState === 'LOADING' && (
        <div className="loading-state">
          <BootSequence
            progress={bootProgress}
            onComplete={() => {}}
          />
        </div>
      )}

      {/* ─── PREVIEW: R3F scene loads here via lazy ─── */}
      {appState === 'PREVIEW' && blueprint && (
        <Suspense fallback={
          <div className="preview-loading">
            <div className="preview-loading-text">INITIALIZING SCENE...</div>
          </div>
        }>
          <div className="preview-state">
            <div className="preview-scene">
              <ScenePreview
                blueprint={blueprint}
                theme={theme}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </div>

            <div className="preview-nav">
              <span className="preview-nav-logo">CYBER://CONVERT</span>
              <div className="preview-nav-actions">
                <button
                  className="preview-nav-back"
                  onClick={() => {
                    setAppState('LANDING')
                    setBlueprint(null)
                    const screen = document.getElementById('loading-screen')
                    if (screen) {
                      screen.style.display = 'flex'
                      screen.classList.remove('fade-out')
                      const bar = document.getElementById('loading-bar')
                      const text = document.getElementById('loading-text')
                      if (bar) bar.style.width = '0%'
                      if (text) text.textContent = '0%'
                    }
                  }}
                >
                  &larr; New URL
                </button>
              </div>
            </div>

            <SectionPanel
              sections={blueprint.sections || []}
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              theme={theme}
              onThemeChange={handleThemeChange}
              branding={blueprint.branding || {}}
            />

            <div className="preview-dots">
              {(blueprint.sections || []).map((_, i) => (
                <button
                  key={i}
                  className={`preview-dot ${i === activeSection ? 'active' : ''}`}
                  aria-label={`Go to section ${i + 1}`}
                  onClick={() => handleSectionChange(i)}
                />
              ))}
            </div>
          </div>
        </Suspense>
      )}
    </div>
  )
}