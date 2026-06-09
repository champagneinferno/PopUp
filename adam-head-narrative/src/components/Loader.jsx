import React from 'react';
import { Html, useProgress } from '@react-three/drei';

/**
 * Loader — overlay shown while R3F assets load inside each Canvas.
 * Displayed as a minimal progress bar in the bottom-centre of each viewport.
 */
export default function Loader() {
  const { progress, active } = useProgress();

  if (!active) return null;

  return (
    <Html center>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'Inter', sans-serif",
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <div
          style={{
            width: 80,
            height: 2,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span>{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}