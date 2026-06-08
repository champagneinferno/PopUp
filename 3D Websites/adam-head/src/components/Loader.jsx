import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

const BOOT_MESSAGES = [
  { threshold: 0, message: '[BOOT] INITIATING SECURE CONNECTION...' },
  { threshold: 20, message: '[HANDSHAKE] ENCRYPTED CHANNEL ESTABLISHED' },
  { threshold: 50, message: '[LOAD] RETRIEVING SCULPTURE DATA...' },
  { threshold: 80, message: '[RENDER] PREPARING CYBERSPACE ENVIRONMENT...' },
  { threshold: 100, message: '[READY] SESSION INITIALIZED' },
]

export default function Loader() {
  const { progress } = useProgress()
  const [bootMsg, setBootMsg] = useState(BOOT_MESSAGES[0].message)

  useEffect(() => {
    const bar = document.getElementById('loading-bar')
    const text = document.getElementById('loading-text')
    if (bar) bar.style.width = `${progress}%`
    if (text) text.textContent = `${Math.floor(progress)}%`

    for (let i = BOOT_MESSAGES.length - 1; i >= 0; i--) {
      if (progress >= BOOT_MESSAGES[i].threshold) {
        setBootMsg(BOOT_MESSAGES[i].message)
        break
      }
    }

    if (progress === 100) {
      const timeout = setTimeout(() => {
        const screen = document.getElementById('loading-screen')
        const msg = document.getElementById('boot-msg')
        if (msg) msg.textContent = '[SESSION_OPEN] Welcome, operator.'
        setTimeout(() => {
          if (screen) {
            screen.classList.add('fade-out')
            setTimeout(() => { screen.style.display = 'none' }, 800)
          }
        }, 800)
      }, 600)
      return () => clearTimeout(timeout)
    }
  }, [progress, setBootMsg])

  return null
}