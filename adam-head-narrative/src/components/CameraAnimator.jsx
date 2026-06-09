import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraAnimator — stable spring-physics camera interpolation across chapters.
 *
 * Uses a semi-implicit Euler integrator with velocity clamping to prevent
 * explosive behavior when targets change abruptly at chapter boundaries.
 *
 * Exposes setScroll(progress) via ref so the parent drives camera position.
 */
const CameraAnimator = forwardRef(function CameraAnimator({ chapters }, ref) {
  const { camera } = useThree();

  // Current interpolated values
  const pos = useRef(new THREE.Vector3(...chapters[0].cameraPosition));
  const target = useRef(new THREE.Vector3(...chapters[0].cameraTarget));
  const targetPos = useRef(new THREE.Vector3(...chapters[0].cameraPosition));
  const targetTarget = useRef(new THREE.Vector3(...chapters[0].cameraTarget));

  // Spring velocities
  const velPos = useRef(new THREE.Vector3(0, 0, 0));
  const velTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Current spring params
  const tension = useRef(120);
  const damping = useRef(20);

  // Expose setScroll to parent
  useImperativeHandle(ref, () => ({
    setScroll(progress) {
      const clamped = Math.min(Math.max(progress, 0), 1);
      const total = chapters.length;
      const n = total - 1;
      const raw = clamped * n;
      const idx = Math.min(Math.floor(raw), n - 1);
      const t = Math.max(0, Math.min(raw - idx, 1));

      const cur = chapters[idx];
      const next = chapters[Math.min(idx + 1, total - 1)];

      // Linear blend for target (spring handles the smoothing)
      targetPos.current.set(
        cur.cameraPosition[0] + (next.cameraPosition[0] - cur.cameraPosition[0]) * t,
        cur.cameraPosition[1] + (next.cameraPosition[1] - cur.cameraPosition[1]) * t,
        cur.cameraPosition[2] + (next.cameraPosition[2] - cur.cameraPosition[2]) * t,
      );
      targetTarget.current.set(
        cur.cameraTarget[0] + (next.cameraTarget[0] - cur.cameraTarget[0]) * t,
        cur.cameraTarget[1] + (next.cameraTarget[1] - cur.cameraTarget[1]) * t,
        cur.cameraTarget[2] + (next.cameraTarget[2] - cur.cameraTarget[2]) * t,
      );

      // Blend spring params from current chapter
      tension.current = cur.springTension || 120;
      damping.current = cur.springDamping || 20;
    },
  }));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.032); // cap at ~30fps for stability

    // ─── Stable semi-implicit Euler spring ───
    // Force = tension * (target - current)
    // Damping applied implicitly: vel *= 1/(1 + damping * dt)
    // This never goes negative, unlike (1 - damping * dt)

    // Position spring
    const pdx = targetPos.current.x - pos.current.x;
    const pdy = targetPos.current.y - pos.current.y;
    const pdz = targetPos.current.z - pos.current.z;

    velPos.current.x += pdx * tension.current * dt;
    velPos.current.y += pdy * tension.current * dt;
    velPos.current.z += pdz * tension.current * dt;

    // Stable damping: never inverts velocity
    const dampFactor = 1 / (1 + damping.current * dt);
    velPos.current.x *= dampFactor;
    velPos.current.y *= dampFactor;
    velPos.current.z *= dampFactor;

    // Clamp velocity to prevent explosive behavior
    const maxVel = 8;
    const vLen = velPos.current.length();
    if (vLen > maxVel) {
      velPos.current.multiplyScalar(maxVel / vLen);
    }

    pos.current.x += velPos.current.x * dt;
    pos.current.y += velPos.current.y * dt;
    pos.current.z += velPos.current.z * dt;

    // Target spring (tighter than position)
    const tdx = targetTarget.current.x - target.current.x;
    const tdy = targetTarget.current.y - target.current.y;
    const tdz = targetTarget.current.z - target.current.z;

    velTarget.current.x += tdx * tension.current * 1.5 * dt;
    velTarget.current.y += tdy * tension.current * 1.5 * dt;
    velTarget.current.z += tdz * tension.current * 1.5 * dt;

    velTarget.current.x *= dampFactor;
    velTarget.current.y *= dampFactor;
    velTarget.current.z *= dampFactor;

    const maxTVel = 6;
    const tvLen = velTarget.current.length();
    if (tvLen > maxTVel) {
      velTarget.current.multiplyScalar(maxTVel / tvLen);
    }

    target.current.x += velTarget.current.x * dt;
    target.current.y += velTarget.current.y * dt;
    target.current.z += velTarget.current.z * dt;

    // Apply to camera
    camera.position.copy(pos.current);
    camera.lookAt(target.current);
  });

  return null;
});

export default CameraAnimator;