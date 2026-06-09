import anime from 'animejs'
import { useEffect, useRef } from 'react'

export function PrimaryButton({ children, onClick, className = '', ...props }) {
  const btnRef = useRef(null)

  useEffect(() => {
    anime({
      targets: btnRef.current,
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 600,
      easing: 'easeOutBack',
      delay: 300
    })
  }, [])

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      className={`btn-primary ${className}`}
      style={{ opacity: 0 }}
      {...props}
    >
      {children}
    </button>
  )
}

export function GlassCard({ children, className = '' }) {
  const cardRef = useRef(null)

  useEffect(() => {
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      easing: 'easeOutCubic',
      delay: 200
    })
  }, [])

  return (
    <div ref={cardRef} className={`glass-card-enhanced ${className}`} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}

export function AnimatedHeading({ children, text, level = 'h1', className = '' }) {
  const headingRef = useRef(null)
  const HeadingTag = level

  useEffect(() => {
    if (text) {
      // Letter-by-letter animation
      const spans = headingRef.current?.querySelectorAll('span')
      if (spans?.length) {
        anime({
          targets: spans,
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 600,
          delay: anime.stagger(50),
          easing: 'easeOutCubic'
        })
      }
    } else {
      // Simple fade-in for child content (preserves gradient-text spans)
      anime({
        targets: headingRef.current,
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        easing: 'easeOutCubic'
      })
    }
  }, [])

  if (text) {
    return (
      <HeadingTag ref={headingRef} className={`heading-animated ${className}`} style={{ opacity: 0 }}>
        {text.split('').map((char, i) => (
          <span key={i} style={{ display: 'inline-block', opacity: 0 }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </HeadingTag>
    )
  }

  return (
    <HeadingTag ref={headingRef} className={`heading-animated ${className}`} style={{ opacity: 0 }}>
      {children}
    </HeadingTag>
  )
}

export function Nav({ links }) {
  const navRef = useRef(null)

  useEffect(() => {
    anime({
      targets: navRef.current,
      opacity: [0, 1],
      translateY: [-20, 0],
      duration: 600,
      easing: 'easeOutCubic'
    })
  }, [])

  return (
    <nav ref={navRef} className="nav" style={{ opacity: 0 }}>
      <div className="nav-logo">Adam Head</div>
      <div className="nav-links">
        {links.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            className="nav-link"
            style={{ animationDelay: `${i * 0.1}s` }}
            onClick={(e) => {
              e.preventDefault()
              const el = document.querySelector(link.href)
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}