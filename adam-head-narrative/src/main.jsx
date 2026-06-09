import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// --- Loading screen orchestration ---
function init() {
  const loaderFill = document.getElementById('loader-fill');
  const loadingScreen = document.getElementById('loading-screen');
  const appEl = document.getElementById('app');

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 95) progress = 95;
    if (loaderFill) loaderFill.style.width = `${Math.min(progress, 100)}%`;
  }, 200);

  // wait for DOM + fonts
  Promise.all([
    document.fonts.ready,
    new Promise((r) => setTimeout(r, 1800)),
  ]).then(() => {
    clearInterval(interval);
    if (loaderFill) loaderFill.style.width = '100%';

    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (appEl) appEl.classList.add('ready');
    }, 400);
  });
}

init();

ReactDOM.createRoot(document.getElementById('app')).render(
  <App />
);