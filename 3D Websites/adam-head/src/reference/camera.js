import { scene, camera, renderer } from '../scene/setup.js';
import { sections } from '../sections/data.js';
import { getCurrent } from './scroll.js';
import { getMouse } from './mouse.js';
import { updateGlobe } from '../objects/globe.js';
import { updateEnv } from '../objects/env.js';

let running = false, time = 0;

export function animate() {
  if (running) return; running = true;
  function loop() {
    requestAnimationFrame(loop);
    time += 0.008;
    const t = sections[getCurrent()].camera;
    const m = getMouse();
    camera.position.x += (t.x + m.x * 0.3 - camera.position.x) * 0.035;
    camera.position.y += (t.y - camera.position.y) * 0.035;
    camera.position.z += (t.z - camera.position.z) * 0.035;
    camera.lookAt(0, 0, 0);
    updateGlobe(time);
    updateEnv(time);
    renderer.render(scene, camera);
  }
  loop();
}
