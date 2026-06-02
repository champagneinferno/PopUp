import './scene/setup.js';
import './scene/loader.js';
import './scene/resize.js';
import './objects/globe.js';
import './objects/env.js';
import './sections/data.js';
import './sections/ui.js';
import './controls/mouse.js';
import './controls/scroll.js';
import { animate } from './controls/camera.js';

// Simulate loading then start
setTimeout(() => {
  document.getElementById('load-bar').style.width = '100%';
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    animate();
  }, 400);
}, 800);
