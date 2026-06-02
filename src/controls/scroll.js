import { sections } from '../sections/data.js';
import { showSection } from '../sections/ui.js';
let current = 0, scrolling = false, accum = 0;
const THRESH = 80;
function go(i) {
  if (scrolling || i === current || i < 0 || i >= sections.length) return;
  scrolling = true; current = i; showSection(i);
  setTimeout(() => { scrolling = false; }, 600);
}
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (scrolling) return;
  accum += Math.abs(e.deltaY);
  if (accum >= THRESH) { go(current + (e.deltaY > 0 ? 1 : -1)); accum = 0; }
}, { passive: false });
let ty = 0;
window.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', (e) => {
  const d = e.changedTouches[0].clientY - ty;
  if (Math.abs(d) > 50) go(current + (d < 0 ? 1 : -1));
}, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(current + 1);
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(current - 1);
});
export function getCurrent() { return current; }
