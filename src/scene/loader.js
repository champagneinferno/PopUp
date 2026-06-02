const loadBar = document.getElementById('load-bar');
let progress = 0;
const interval = setInterval(() => {
  progress += Math.random() * 10;
  if (progress > 90) progress = 90;
  loadBar.style.width = progress + '%';
}, 200);
export function setLoadProgress(pct) { progress = Math.min(pct, 100); loadBar.style.width = progress + '%'; }
export function finishLoading() {
  clearInterval(interval);
  loadBar.style.width = '100%';
  setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 400);
}
