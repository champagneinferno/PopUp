import { useState } from 'react'
import anime from 'animejs'
import { AnimatedHeading, GlassCard, PrimaryButton, Nav } from './components/ui'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './index.css'

function App() {
  const [count, setCount] = useState(0)

  const navLinks = [
    { href: '#center', label: 'Home' },
    { href: '#next-steps', label: 'Next Steps' },
    { href: '#spacer', label: 'About' },
  ]

  return (
    <>
      {/* Animated Navigation */}
      <Nav links={navLinks} />
      
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="Hero" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        
        {/* Animated Heading replaces standard h1 */}
        <AnimatedHeading text="Get started with Orion3D" level="h1" />
        
        <GlassCard>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
          <PrimaryButton onClick={() => setCount((count) => count + 1)}>
            Count is {count}
          </PrimaryButton>
        </GlassCard>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <GlassCard>
          <div id="docs">
            <svg className="icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#documentation-icon"></use>
            </svg>
            <AnimatedHeading text="Documentation" level="h2" />
            <p>Your questions, answered</p>
            <ul>
              <li>
                <a href="https://vite.dev/" target="_blank">
                  <img className="logo" src={viteLogo} alt="" />
                  Explore Vite
                </a>
              </li>
            </ul>
          </div>
        </GlassCard>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
