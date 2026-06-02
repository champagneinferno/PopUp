let targetX = 0, targetY = 0;
document.addEventListener('mousemove', (e) => {
  targetX = (e.clientX / innerWidth - 0.5) * 0.4;
  targetY = (e.clientY / innerHeight - 0.5) * 0.2;
});
export function getMouse() { return { x: targetX, y: targetY }; }
