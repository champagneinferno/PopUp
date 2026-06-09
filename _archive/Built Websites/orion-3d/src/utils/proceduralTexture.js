// Procedural texture generation - no external images
// Simplex noise-based leather texture for the sneaker

// Simple value noise
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) / 2147483647;
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  
  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);
  
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  
  return nx0 + (nx1 - nx0) * sy;
}

function fbm(x, y, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value;
}

export function generateLeatherTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  
  const baseColor = [30, 25, 35]; // dark leather base
  const accentColor = [40, 32, 45]; // slightly lighter
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // Multi-octave noise for pebbled leather effect
      const n1 = fbm(x / 80, y / 80, 3); // Large grain
      const n2 = fbm(x / 20, y / 20, 2); // Fine pebble
      const combined = n1 * 0.7 + n2 * 0.3;
      
      // Add some directional streaks (leather grain)
      const streak = smoothNoise(x / 200, y / 15) * 0.08;
      
      const noise = Math.max(0, Math.min(1, combined + streak));
      
      // Blend between base colors
      data[i] = baseColor[0] + (accentColor[0] - baseColor[0]) * noise;
      data[i + 1] = baseColor[1] + (accentColor[1] - baseColor[1]) * noise;
      data[i + 2] = baseColor[2] + (accentColor[2] - baseColor[2]) * noise;
      data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateLeatherBump(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // Bump from noise - pebbled surface displacement
      const n1 = fbm(x / 25, y / 25, 3);
      const n2 = fbm(x / 8, y / 8, 2);
      const bump = (n1 * 0.7 + n2 * 0.3) * 255;
      
      data[i] = bump;
      data[i + 1] = bump;
      data[i + 2] = bump;
      data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function generateSolePattern(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // Tread pattern - horizontal ridges
      const ridge = Math.sin(y * 0.15) * 0.5 + 0.5;
      const crossRidge = Math.sin(x * 0.1) * 0.3;
      const noise = fbm(x / 100, y / 100, 2) * 0.2;
      
      const value = Math.max(0, Math.min(1, ridge + crossRidge + noise));
      const v = value * 255;
      
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  return texture;
}

// Import THREE dynamically
let THREE;
export function setThree(three) {
  THREE = three;
}