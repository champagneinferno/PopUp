import anime from 'animejs'
import { useEffect, useRef } from 'react'

export function PrimaryButton({ children, onClick, className = '', ...props }) {
  const ref = useRef(null)
  useEffect(() => {
    anime({ targets: ref.current, opacity: [0, 1], scale: [0.9, 1], duration: 600, easing: 'easeOutBack', delay: 300 })
  }, [])
  return <button ref={ref} onClick={onClick} className={`btn-primary ${className}`} style={{ opacity: 0 }} {...props}>{children}</button>
}

export function GlassCard({ children, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    anime({ targets: ref.current, opacity: [0, 1], translateY: [30, 0], duration: 800, easing: 'easeOutCubic', delay: 200 })
  }, [])
  return <div ref={ref} className={`glass-card-enhanced ${className}`} style={{ opacity: 0 }}>{children}</div>
}

export function AnimatedHeading({ children, text, level = 'h1', className = '' }) {
  const ref = useRef(null)
  const Tag = level

  useEffect(() => {
    if (text) {
      const spans = ref.current?.querySelectorAll('span')
      if (spans?.length) {
        anime({ targets: spans, opacity: [0, 1], translateY: [20, 0], duration: 600, delay: anime.stagger(50), easing: 'easeOutCubic' })
      }
    } else {
      anime({ targets: ref.current, opacity: [0, 1], translateY: [30, 0], duration: 800, easing: 'easeOutCubic' })
    }
  }, [])

  if (text) {
    return (
      <Tag ref={ref} className={`heading-animated ${className}`} style={{ opacity: 0 }}>
        {text.split('').map((c, i) => (
          <span key={i} style={{ display: 'inline-block', opacity: 0 }}>{c === ' ' ? '\u00A0' : c}</span>
        ))}
      </Tag>
    )
  }

  return <Tag ref={ref} className={`heading-animated ${className}`} style={{ opacity: 0 }}>{children}</Tag>
}

export function Nav({ links, logo }) {
  const ref = useRef(null)
  useEffect(() => {
    anime({ targets: ref.current, opacity: [0, 1], translateY: [-20, 0], duration: 600, easing: 'easeOutCubic' })
  }, [])
  return (
    <nav ref={ref} className="nav" style={{ opacity: 0 }}>
      <div className="nav-logo">{logo || 'LOGO'}</div>
      <div className="nav-links">
        {links.map((link, i) => (
          <a key={link.href} href={link.href} className="nav-link"
            onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' }) }}>
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}