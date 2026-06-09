import { sections } from './data.js';
const overlay = document.getElementById('ui-overlay');
const progress = document.getElementById('progress');
const secCurrent = document.getElementById('sec-current');
const secTotal = document.getElementById('sec-total');
const scrollHint = document.getElementById('scroll-hint');

sections.forEach((_, i) => {
  const d = document.createElement('div');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  progress.appendChild(d);
});

sections.forEach((s, i) => {
  const div = document.createElement('div');
  div.className = 'section' + (i === 0 ? ' active' : '');
  div.dataset.index = i;

  let h = `<div class="tag">${s.tag}</div><h2>${s.heading}</h2>`;
  if (s.body) h += `<p>${s.body}</p>`;
  if (s.specs) {
    h += '<div class="specs">';
    for (const sp of s.specs) h += `<div class="spec"><div class="val">${sp.val}</div><div class="lbl">${sp.lbl}</div></div>`;
    h += '</div>';
  }
  if (s.stats) {
    h += '<div class="stats-grid">';
    for (const st of s.stats) h += `<div class="stat-card"><div class="num">${st.num}</div><div class="desc">${st.desc}</div></div>`;
    h += '</div>';
  }
  if (s.cards) {
    h += '<div class="cards">';
    for (const c of s.cards) h += `<div class="card"><div class="icon">${c.icon}</div><div class="title">${c.title}</div><div class="desc">${c.desc}</div></div>`;
    h += '</div>';
  }
  if (s.ctas) {
    h += '<div>';
    for (const btn of s.ctas) h += `<a href="#" class="btn${btn.primary ? '' : ' btn-outline'}">${btn.text}</a>`;
    h += '</div>';
  }
  div.innerHTML = h;
  overlay.appendChild(div);
});

export const dotsEls = progress.querySelectorAll('.dot');
export const sectionEls = overlay.querySelectorAll('.section');
secTotal.textContent = String(sections.length).padStart(2, '0');

export function showSection(index) {
  sectionEls.forEach((el, i) => el.classList.toggle('active', i === index));
  dotsEls.forEach((el, i) => el.classList.toggle('active', i === index));
  secCurrent.textContent = String(index + 1).padStart(2, '0');
  if (index > 0) scrollHint.classList.add('hidden');
}
