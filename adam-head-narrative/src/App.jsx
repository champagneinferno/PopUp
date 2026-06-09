import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import Lenis from 'lenis';
import * as THREE from 'three';
import CameraAnimator from './components/CameraAnimator.jsx';
import Model from './components/Model.jsx';
import Loader from './components/Loader.jsx';
import './App.css';

/* ------------------------------------------------------------------ */
/*  Chapter configs — 5 cinematic chapters for adamHead               */
/*  Each has: camera, lighting, fog, bloom, model, and text overlay   */
/*  Spring tension rises with narrative intensity                     */
/* ------------------------------------------------------------------ */
const CHAPTERS = [
  {
    id: 'encounter',
    title: 'Encounter',
    tagline: 'From the void, a face emerges.',
    cameraPosition: [0, 1.8, 6],
    cameraTarget: [0, 0.4, 0],
    modelRotY: 0,
    bgColor: '#0a0a0f',
    fogNear: 8, fogFar: 22,
    ambientLight: 0.4,
    keyLight: { position: [4, 6, 5], intensity: 1.2, color: '#ddeeff' },
    fillLight: { position: [-3, 2, -4], intensity: 0.3, color: '#8888ff' },
    bloomIntensity: 0.3,
    springTension: 80,
    springDamping: 28,
  },
  {
    id: 'examine',
    title: 'Examine',
    tagline: 'Turn the gaze — every angle tells a story.',
    cameraPosition: [3.5, 1.2, 3],
    cameraTarget: [0, 0.5, 0],
    modelRotY: 0.8,
    bgColor: '#0a0a18',
    fogNear: 5, fogFar: 16,
    ambientLight: 0.25,
    keyLight: { position: [3, 4, 4], intensity: 1.6, color: '#ccaaff' },
    fillLight: { position: [-4, 3, -3], intensity: 0.3, color: '#4488ff' },
    bloomIntensity: 0.5,
    springTension: 130,
    springDamping: 20,
  },
  {
    id: 'reveal',
    title: 'Revelation',
    tagline: 'Beneath the surface, something stirs.',
    cameraPosition: [1.5, 0.6, 2.5],
    cameraTarget: [0, 0.6, 0],
    modelRotY: -0.3,
    bgColor: '#0f0518',
    fogNear: 3, fogFar: 12,
    ambientLight: 0.15,
    keyLight: { position: [2, 3, 2], intensity: 2.2, color: '#ff66aa' },
    fillLight: { position: [-2, 1, -2], intensity: 0.5, color: '#ffaa44' },
    bloomIntensity: 1.2,
    springTension: 200,
    springDamping: 12,
  },
  {
    id: 'transform',
    title: 'Transformation',
    tagline: 'Light rearranges matter.',
    cameraPosition: [-2.5, 1.0, 3.5],
    cameraTarget: [0, 0.3, 0],
    modelRotY: -0.6,
    bgColor: '#080f10',
    fogNear: 4, fogFar: 14,
    ambientLight: 0.35,
    keyLight: { position: [3, 4, 3], intensity: 1.8, color: '#88ffbb' },
    fillLight: { position: [-3, 2, -4], intensity: 0.4, color: '#44ccff' },
    bloomIntensity: 0.7,
    springTension: 160,
    springDamping: 16,
  },
  {
    id: 'stillness',
    title: 'Stillness',
    tagline: 'The head is at peace.',
    cameraPosition: [0, 1.2, 5.5],
    cameraTarget: [0, 0.4, 0],
    modelRotY: 0,
    bgColor: '#08080f',
    fogNear: 7, fogFar: 22,
    ambientLight: 0.45,
    keyLight: { position: [5, 6, 6], intensity: 1.0, color: '#eeeeff' },
    fillLight: { position: [-4, 3, -4], intensity: 0.3, color: '#aaaaff' },
    bloomIntensity: 0.25,
    springTension: 90,
    springDamping: 26,
  },
];

/* ------------------------------------------------------------------ */
/*  Scene content — lighting, fog, model, post-processing per chapter */
/* ------------------------------------------------------------------ */
function SceneContent({ chapter }) {
  const c = CHAPTERS[chapter];

  return (
    <>
      {/* Color background sphere */}
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color={c.bgColor} side={THREE.BackSide} />
      </mesh>

      {/* Fog */}
      <fog attach="fog" args={[c.bgColor, c.fogNear, c.fogFar]} />

      {/* Lighting */}
      <ambientLight intensity={c.ambientLight} />
      <directionalLight
        position={c.keyLight.position}
        intensity={c.keyLight.intensity}
        color={c.keyLight.color}
      />
      <directionalLight
        position={c.fillLight.position}
        intensity={c.fillLight.intensity}
        color={c.fillLight.color}
      />
      <hemisphereLight args={['#7c3aed', '#1a1a2e', 0.3]} />

      {/* Environment */}
      <Environment preset="studio" background={false} blur={0.5} />

      {/* Model — positioned and rotated per chapter */}
      <group rotation={[0, c.modelRotY, 0]}>
        <Model chapter={chapter} />
      </group>

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.5}
          luminanceSmoothing={0.7}
          intensity={c.bloomIntensity}
          kernelSize={KernelSize.MEDIUM}
        />
        <Vignette offset={0.3} darkness={0.55} />
        <Noise opacity={0.012} />
      </EffectComposer>

      {/* R3F Loader */}
      <Loader />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const [chapter, setChapter] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);
  const textRef = useRef(null);
  const cameraAnimatorRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !prefersReducedMotion.current,
      wheelMultiplier: 0.8,
    });

    const totalChapters = CHAPTERS.length;
    const spacer = document.getElementById('scroll-spacer');
    if (spacer) {
      spacer.style.height = `${(totalChapters - 1) * 100}vh`;
    }

    // Lenis scroll event — smooth, only fires when actually scrolling
    lenis.on('scroll', (e) => {
      const limit = e.limit || document.body.scrollHeight - window.innerHeight;
      const progress = limit > 0 ? Math.min(Math.max(e.progress, 0), 1) : 0;
      const currentChapter = Math.min(
        Math.floor(progress * totalChapters),
        totalChapters - 1
      );

      setChapter(currentChapter);
      setChapterProgress((progress * totalChapters) - currentChapter);

      if (cameraAnimatorRef.current) {
        cameraAnimatorRef.current.setScroll(progress);
      }
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  const currentChapter = CHAPTERS[chapter];

  return (
    <div className="narrative-container">
      {/* Full-viewport Canvas — always fills screen */}
      <div className="canvas-wrapper">
        <Canvas
          camera={{
            position: CHAPTERS[0].cameraPosition,
            fov: 42,
            near: 0.1,
            far: 50,
          }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}
        >
          {/* Camera animator interpolates position + target */}
          <CameraAnimator
            ref={cameraAnimatorRef}
            chapters={CHAPTERS}
          />

          <SceneContent chapter={chapter} />
        </Canvas>
      </div>

      {/* Text overlay per chapter — minimal, fades in/out */}
      <div className="chapter-text-overlay" ref={textRef}>
        {CHAPTERS.map((c, i) => (
          <div
            key={c.id}
            className={`chapter-text ${i === chapter ? 'chapter-text--visible' : 'chapter-text--hidden'}`}
          >
            <span className="chapter-tagline">{c.tagline}</span>
            <h2 className="chapter-title">{c.title}</h2>
          </div>
        ))}
      </div>

      {/* Chapter progress indicator */}
      <div className="chapter-dots">
        {CHAPTERS.map((c, i) => (
          <div
            key={c.id}
            className={`chapter-dot ${i === chapter ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* Scroll hint — fades after first scroll */}
      <div
        className="scroll-hint-narrative"
        style={{ opacity: chapter > 0 ? 0 : 0.5 }}
      >
        Scroll to explore
      </div>

      {/* Scroll spacer to create scrollable area */}
      <div id="scroll-spacer" />
    </div>
  );
}