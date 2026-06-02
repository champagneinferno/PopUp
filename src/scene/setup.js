import * as THREE from 'three';

export const scene    = new THREE.Scene();
export const camera   = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
export const renderer = new THREE.WebGLRenderer({ antialias: true });

const container = document.getElementById('canvas-container');

scene.background = new THREE.Color(0x06060f);
scene.fog        = new THREE.FogExp2(0x06060f, 0.012);

camera.position.set(0, 0.5, 8);

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping          = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure  = 1.2;
container.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0x222244, 0.4);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xbbddff, 2.5);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0x6699ff, 0.6);
fill.position.set(-4, 1, -3);
scene.add(fill);

const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
rim.position.set(-2, 0.5, 5);
scene.add(rim);

// Environment map for PBR
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x0a0a20);
const envTexture = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
scene.environment = envTexture;
pmrem.dispose();
