import anime from 'animejs'
import { useEffect, useRef } from 'react'

// Primary CTA Button with anime.js animation
export function PrimaryButton({ children, onClick, className = '' }) {
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
    >
      {children}
    </button>
  )
}

// Glass Card with anime.js animation
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
    <div ref={cardRef} className={`glass-card ${className}`} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}

// Animated Heading with letter-by-letter animation
export function AnimatedHeading({ text, level = 'h1', className = '' }) {
  const headingRef = useRef(null)
  
  useEffect(() => {
    anime({
      targets: headingRef.current,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      easing: 'easeOutCubic'
    })
    
    // Letter-by-letter animation
    const letters = text.split('')
    const spans = headingRef.current.querySelectorAll('span')
    anime({
      targets: spans,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      delay: anime.stagger(50),
      easing: 'easeOutCubic'
    })
  }, [])
  
  const HeadingTag = level
  
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

// Navigation component
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
      <div className="nav-logo">Orion3D</div>
      <div className="nav-links">
        {links.map((link, i) => (
          <a 
            key={link.href} 
            href={link.href}
            className="nav-link"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
