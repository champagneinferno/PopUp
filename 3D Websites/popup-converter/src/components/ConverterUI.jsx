import { useRef, useEffect, useState } from 'react'
import anime from 'animejs'

export default function ConverterUI({ onConvert, isLoading, statusMessage }) {
  const [hasValue, setHasValue] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    anime({
      targets: containerRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 800,
      easing: 'easeOutCubic',
      delay: 400,
    })
    setTimeout(() => inputRef.current?.focus(), 500)
  }, [])

  const handleClick = () => {
    const val = inputRef.current?.value?.trim()
    if (!val || isLoading) return
    onConvert(val)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleClick()
  }

  return (
    <div className="converter-ui" ref={containerRef} style={{ opacity: 0 }}>
      <div className="converter-header">
        <span className="converter-tag">// CYBER://CONVERT v1.0</span>
        <h1 className="converter-heading">
          <span className="gradient-text">Transform</span> any website
        </h1>
        <p className="converter-sub">
          into a 3D cyberspace experience
        </p>
      </div>

      <div className="converter-form">
        <div className="terminal-input-group">
          <span className="terminal-prompt">$</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            placeholder="Enter URL to convert..."
            onInput={() => setHasValue(!!inputRef.current?.value?.trim())}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-label="Website URL to convert"
          />
          <span className="terminal-cursor" />
        </div>

        <button
          type="button"
          className="btn-convert"
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? 'CONVERTING...' : 'CONVERT'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {statusMessage && (
        <div className="converter-status">
          <span className="status-indicator" />
          <span className="status-text">{statusMessage}</span>
        </div>
      )}

      <div className="converter-stats">
        <div className="stat-item">
          <span className="stat-value">R3F</span>
          <span className="stat-label">Engine</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">Bloom</span>
          <span className="stat-label">Post-Processing</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">WebGL</span>
          <span className="stat-label">Renderer</span>
        </div>
      </div>
    </div>
  )
}