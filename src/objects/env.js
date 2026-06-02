import * as THREE from 'three';
import { scene } from '../scene/setup.js';

// --- Starfield background ---
const starCount = 1500;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 30 + Math.random() * 70;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  starPos[i*3+2] = r * Math.cos(phi);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.12,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// --- Ambient floating particles (knowledge dust) ---
const dustCount = 400;
const dustPos = new Float32Array(dustCount * 3);
const dustVel = new Float32Array(dustCount);
for (let i = 0; i < dustCount; i++) {
  dustPos[i*3] = (Math.random() - 0.5) * 20;
  dustPos[i*3+1] = (Math.random() - 0.5) * 15;
  dustPos[i*3+2] = (Math.random() - 0.5) * 10 - 3;
  dustVel[i] = 0.2 + Math.random() * 0.4;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({
  color: 0x6699ff,
  size: 0.015,
  transparent: true,
  opacity: 0.06,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

// --- Ground glow disc ---
const discGeo = new THREE.RingGeometry(1.0, 2.5, 48);
const discMat = new THREE.MeshBasicMaterial({
  color: 0x3366cc,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.03,
});
const disc = new THREE.Mesh(discGeo, discMat);
disc.rotation.x = -Math.PI / 2;
disc.position.y = -1.8;
scene.add(disc);

const disc2Geo = new THREE.RingGeometry(1.8, 3.2, 48);
const disc2Mat = new THREE.MeshBasicMaterial({
  color: 0x6699ff,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.02,
});
const disc2 = new THREE.Mesh(disc2Geo, disc2Mat);
disc2.rotation.x = -Math.PI / 2;
disc2.position.y = -1.85;
scene.add(disc2);

// --- Knowledge connection lines ---
// A network of thin lines emanating from center
const lineCount = 60;
const linePositions = new Float32Array(lineCount * 6); // 2 points per line
for (let i = 0; i < lineCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 1.8 + Math.random() * 2.5;
  linePositions[i*6] = Math.sin(phi) * Math.cos(theta) * 1.8;
  linePositions[i*6+1] = Math.sin(phi) * Math.sin(theta) * 1.8;
  linePositions[i*6+2] = Math.cos(phi) * 1.8;
  linePositions[i*6+3] = Math.sin(phi) * Math.cos(theta) * r;
  linePositions[i*6+4] = Math.sin(phi) * Math.sin(theta) * r;
  linePositions[i*6+5] = Math.cos(phi) * r;
}
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
const lineMat = new THREE.LineBasicMaterial({
  color: 0x3366cc,
  transparent: true,
  opacity: 0.04,
});
const lines = new THREE.LineSegments(lineGeo, lineMat);
scene.add(lines);

export function updateEnv(time) {
  // Rotate stars slowly
  stars.rotation.y += 0.0001;

  // Float dust upward
  const dp = dust.geometry.attributes.position.array;
  for (let i = 0; i < dustCount; i++) {
    dp[i*3+1] += dustVel[i] * 0.002;
    if (dp[i*3+1] > 7) dp[i*3+1] = -7;
  }
  dust.geometry.attributes.position.needsUpdate = true;

  // Pulse ground discs
  const p = 0.02 + Math.sin(time * 0.6) * 0.015;
  discMat.opacity = p;
  disc2Mat.opacity = p * 0.7;
  disc.rotation.z += 0.002;
  disc2.rotation.z -= 0.003;

  // Pulse knowledge lines
  lineMat.opacity = 0.03 + Math.sin(time) * 0.02;
}
