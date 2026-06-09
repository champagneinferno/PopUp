import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useEnvironment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Model — loads adamHead.gltf and enhances materials.
 * No auto-rotation — the narrative camera does the work.
 * Subtle breathing float animation only.
 */
export default function Model({ chapter }) {
  const groupRef = useRef(null);
  const { scene } = useGLTF('/adamHead.gltf');
  const envMap = useEnvironment({ preset: 'studio' });
  const cloned = useRef(null);

  // Clone the model once, enhance materials
  if (!cloned.current) {
    cloned.current = scene.clone(true);
    cloned.current.traverse((child) => {
      if (child.isMesh) {
        // Enhance original material without losing textures
        let mat = child.material;
        if (!(mat instanceof THREE.MeshPhysicalMaterial)) {
          const old = mat;
          mat = new THREE.MeshPhysicalMaterial();
          for (const key of Object.keys(old)) {
            try { mat[key] = old[key]; } catch (_) {}
          }
          if (old.map) mat.map = old.map;
          if (old.normalMap) mat.normalMap = old.normalMap;
          if (old.roughnessMap) mat.roughnessMap = old.roughnessMap;
          if (old.metalnessMap) mat.metalnessMap = old.metalnessMap;
          if (old.aoMap) mat.aoMap = old.aoMap;
        }
        mat.envMap = envMap;
        mat.envMapIntensity = 1.0;
        mat.needsUpdate = true;
        child.material = mat;
      }
    });
  }

  // Subtle breathing float — not spinning, just alive
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const breath = Math.sin(clock.elapsedTime * 0.4) * 0.015;
      groupRef.current.position.y = breath;
    }
  });

  return <primitive ref={groupRef} object={cloned.current} />;
}