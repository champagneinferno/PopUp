import { useEffect } from 'react'
import { useProgress } from '@react-three/drei'

export default function Loader() {
  const { progress, active } = useProgress()

  useEffect(() => {
    const bar = document.getElementById('loading-bar')
    const text = document.getElementById('loading-text')
    if (bar) bar.style.width = `${progress}%`
    if (text) text.textContent = `${Math.floor(progress)}%`

    if (progress === 100) {
      const timeout = setTimeout(() => {
        const screen = document.getElementById('loading-screen')
        if (screen) {
          screen.classList.add('fade-out')
          setTimeout(() => {
            screen.style.display = 'none'
          }, 800)
        }
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [progress])

  return null
}