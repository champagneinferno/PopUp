import * as THREE from 'three';
import { scene } from '../scene/setup.js';

export const knowledgeGroup = new THREE.Group();
scene.add(knowledgeGroup);

// --- Central knowledge globe ---
// Outer wireframe sphere
const globeGeo = new THREE.IcosahedronGeometry(1.6, 2);
const globeMat = new THREE.MeshBasicMaterial({
  color: 0x3366cc,
  wireframe: true,
  transparent: true,
  opacity: 0.15,
});
const globe = new THREE.Mesh(globeGeo, globeMat);
knowledgeGroup.add(globe);

// Inner translucent sphere
const innerGlobeGeo = new THREE.IcosahedronGeometry(1.55, 1);
const innerGlobeMat = new THREE.MeshBasicMaterial({
  color: 0x3366cc,
  transparent: true,
  opacity: 0.04,
});
const innerGlobe = new THREE.Mesh(innerGlobeGeo, innerGlobeMat);
knowledgeGroup.add(innerGlobe);

// Glowing core
const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
const coreMat = new THREE.MeshBasicMaterial({
  color: 0x6699ff,
  transparent: true,
  opacity: 0.3,
});
const core = new THREE.Mesh(coreGeo, coreMat);
knowledgeGroup.add(core);

// Core glow
const glowGeo = new THREE.SphereGeometry(0.5, 16, 16);
const glowMat = new THREE.MeshBasicMaterial({
  color: 0x3366cc,
  transparent: true,
  opacity: 0.08,
});
const glow = new THREE.Mesh(glowGeo, glowMat);
knowledgeGroup.add(glow);

// --- Orbit rings ---
function makeOrbitRing(radius, tiltAngle, color, opacity) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(64);
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geo, mat);
  line.rotation.x = tiltAngle;
  return line;
}

const orbit1 = makeOrbitRing(2.2, Math.PI / 3, 0x3366cc, 0.12);
knowledgeGroup.add(orbit1);

const orbit2 = makeOrbitRing(2.8, -Math.PI / 4, 0x6699ff, 0.08);
knowledgeGroup.add(orbit2);

const orbit3 = makeOrbitRing(2.0, Math.PI / 5.5, 0x88aaff, 0.06);
knowledgeGroup.add(orbit3);

// --- Orbiting knowledge nodes (data particles on orbits) ---
const nodeCount = 40;
const nodePositions = [];
const nodeSpeeds = [];
const nodeRadii = [];
const nodeTilts = [];
const nodePhases = [];

for (let i = 0; i < nodeCount; i++) {
  nodeRadii.push(1.8 + Math.random() * 1.8);
  nodeTilts.push((Math.random() - 0.5) * 1.2);
  nodeSpeeds.push(0.2 + Math.random() * 0.4);
  nodePhases.push(Math.random() * Math.PI * 2);
}

const nodeGeo = new THREE.BufferGeometry();
const nodePositionsArray = new Float32Array(nodeCount * 3);
nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositionsArray, 3));

const nodeMat = new THREE.PointsMaterial({
  color: 0x6699ff,
  size: 0.04,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const nodes = new THREE.Points(nodeGeo, nodeMat);
knowledgeGroup.add(nodes);

// --- Small book geometries floating in orbit ---
const books = [];
for (let i = 0; i < 8; i++) {
  const w = 0.08 + Math.random() * 0.12;
  const h = 0.12 + Math.random() * 0.18;
  const d = 0.04 + Math.random() * 0.06;
  const bookGeo = new THREE.BoxGeometry(w, h, d);
  const bookMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.58 + Math.random() * 0.08, 0.5, 0.2 + Math.random() * 0.3),
    metalness: 0.1,
    roughness: 0.6,
    transparent: true,
    opacity: 0.5,
  });
  const book = new THREE.Mesh(bookGeo, bookMat);
  const angle = (i / 8) * Math.PI * 2;
  const radius = 2.8 + Math.random() * 0.4;
  const tilt = (Math.random() - 0.5) * 0.6;
  book.userData = { angle, radius, tilt, speed: 0.1 + Math.random() * 0.15, yOffset: (Math.random() - 0.5) * 1.5 };
  book.position.set(Math.cos(angle) * radius, book.userData.yOffset, Math.sin(angle) * radius);
  book.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.3);
  knowledgeGroup.add(book);
  books.push(book);
}

export function updateGlobe(time) {
  // Rotate the whole globe slowly
  globe.rotation.y += 0.002;
  innerGlobe.rotation.y += 0.001;
  core.rotation.y += 0.003;
  glow.rotation.y += 0.002;

  // Pulse core
  const pulse = 0.2 + Math.sin(time * 1.5) * 0.1;
  glowMat.opacity = pulse;

  // Orbit rings rotate
  orbit1.rotation.z += 0.004;
  orbit2.rotation.z -= 0.003;
  orbit3.rotation.z += 0.005;

  // Update orbiting nodes
  const pos = nodes.geometry.attributes.position.array;
  for (let i = 0; i < nodeCount; i++) {
    const angle = time * nodeSpeeds[i] + nodePhases[i];
    const r = nodeRadii[i];
    const tilt = nodeTilts[i];
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r * Math.cos(tilt);
    const y = Math.sin(angle) * r * Math.sin(tilt) * 0.5;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }
  nodes.geometry.attributes.position.needsUpdate = true;

  // Update floating books
  books.forEach((book) => {
    book.userData.angle += book.userData.speed * 0.01;
    const a = book.userData.angle;
    const r = book.userData.radius;
    book.position.x = Math.cos(a) * r;
    book.position.z = Math.sin(a) * r;
    book.position.y = book.userData.yOffset + Math.sin(a * 0.7 + time) * 0.3;
    book.rotation.y += 0.005;
    book.rotation.x += 0.002;
  });
}
