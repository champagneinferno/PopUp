import { useState, useEffect, useRef } from 'react'
import anime from 'animejs'

const BOOT_STAGES = [
  { label: '[CONNECT] Resolving domain...',        threshold: 5 },
  { label: '[FETCH] Downloading page data...',      threshold: 25 },
  { label: '[EXTRACT] Parsing structure...',        threshold: 50 },
  { label: '[ANALYZE] Evaluating visual DNA...',    threshold: 70 },
  { label: '[BUILD] Generating scene blueprint...', threshold: 88 },
  { label: '[DONE] Scene ready',                    threshold: 100 },
]

export default function BootSequence({ progress, onComplete }) {
  const [bootMsg, setBootMsg] = useState(BOOT_STAGES[0].label)
  const [displayProgress, setDisplayProgress] = useState(0)
  const containerRef = useRef(null)
  const completedRef = useRef(false)

  useEffect(() => {
    anime({
      targets: containerRef.current,
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutCubic',
    })
  }, [])

  // Smooth progress animation
  useEffect(() => {
    const target = Math.min(progress, 100)
    anime({
      targets: { val: displayProgress },
      val: target,
      duration: 400,
      easing: 'easeOutCubic',
      update: (a) => setDisplayProgress(Math.round(a.animations[0].currentValue)),
    })
  }, [progress])

  // Update boot message based on progress
  useEffect(() => {
    for (let i = BOOT_STAGES.length - 1; i >= 0; i--) {
      if (displayProgress >= BOOT_STAGES[i].threshold) {
        setBootMsg(BOOT_STAGES[i].label)
        break
      }
    }
  }, [displayProgress])

  // Signal completion
  useEffect(() => {
    if (displayProgress >= 100 && !completedRef.current) {
      completedRef.current = true
      const timeout = setTimeout(() => {
        onComplete?.()
      }, 600)
      return () => clearTimeout(timeout)
    }
  }, [displayProgress, onComplete])

  // Update the DOM loading screen elements for the loading-screen overlay
  useEffect(() => {
    const bar = document.getElementById('loading-bar')
    const text = document.getElementById('loading-text')
    const msg = document.getElementById('boot-msg')
    if (bar) bar.style.width = `${displayProgress}%`
    if (text) text.textContent = `${displayProgress}%`
    if (msg) msg.textContent = bootMsg
  }, [displayProgress, bootMsg])

  const barWidth = `${displayProgress}%`

  return (
    <div className="boot-sequence" ref={containerRef} style={{ opacity: 0 }}>
      <div className="boot-header">
        <span className="boot-logo">CYBER://CONVERT</span>
        <span className="boot-phase">BOOT SEQUENCE</span>
      </div>

      <div className="boot-progress-container">
        <div className="boot-progress-bar" style={{ width: barWidth }} />
        <div className="boot-progress-glow" style={{ width: barWidth }} />
      </div>

      <div className="boot-percentage">{displayProgress}%</div>

      <div className="boot-message">
        <span className="boot-cursor">{'>'}</span>
        <span className="boot-text">{bootMsg}</span>
        <span className="boot-blink" />
      </div>

      <div className="boot-stages">
        {BOOT_STAGES.map((stage, i) => (
          <div
            key={i}
            className={`boot-stage ${displayProgress >= stage.threshold ? 'done' : ''}`}
          >
            <span className="boot-stage-icon">
              {displayProgress >= stage.threshold ? '[OK]' : '[..]'}
            </span>
            <span className="boot-stage-label">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}