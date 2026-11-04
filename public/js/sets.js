// js/sets.js — Sets hub + individual set pages

import { showDetailsModal } from './modal.js?v=12';
import { fallbackCarImage, carThumbAttrs, thumbOf } from './carImage.js?v=3';

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getBestImage(car) {
  if (Array.isArray(car.images) && car.images.length > 0) return car.images[0];
  if (car.featuredImage) return car.featuredImage;
  return '';
}

/* ──────────────────────────────────────────────
   SETS HUB
─────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
   COMPLETION BAR
─────────────────────────────────────────────── */
function buildCompletionBar(setCars) {
  // Infer total from highest set_number value ("3/10" → 10, or plain "3" → use max)
  let total = 0;
  for (const c of setCars) {
    if (c.setNumber) {
      const slashMatch = c.setNumber.match(/\/(\d+)/);
      if (slashMatch) {
        total = Math.max(total, parseInt(slashMatch[1], 10));
      } else {
        const n = parseInt(c.setNumber, 10);
        if (!isNaN(n)) total = Math.max(total, n);
      }
    }
  }
  if (!total) return ''; // no set numbers → skip bar

  const owned    = setCars.filter(c => !c.isIncoming).length;
  const incoming = setCars.filter(c =>  c.isIncoming).length;
  const pctOwned = Math.round((owned / total) * 100);
  const pctIncoming = Math.round((incoming / total) * 100);

  return `
    <div class="shc-completion">
      <div class="shc-completion-bar">
        <div class="shc-bar-owned"    style="width:${pctOwned}%"></div>
        <div class="shc-bar-incoming" style="width:${pctIncoming}%"></div>
      </div>
      <div class="shc-completion-label">
        <span>${owned}/${total} owned</span>
        ${incoming ? `<span class="shc-incoming-label">· ${incoming} incoming</span>` : ''}
      </div>
    </div>`;
}

let _setLogos = null;
export function bustSetLogosCache() { _setLogos = null; }
async function getSetLogos() {
  if (_setLogos) return _setLogos;
  if (window.DIECAST_DEMO) return (_setLogos = {});
  try {
    const res = await fetch('/api/set-logos');
    _setLogos = res.ok ? await res.json() : {};
  } catch { _setLogos = {}; }
  return _setLogos;
}

export async function renderSetsHub(cars) {
  const el = document.getElementById('view-sets');
  if (!el) return;

  // Group by set_name
  const map = {};
  for (const car of cars) {
    const setName = (car.setName || '').trim();
    if (!setName) continue;
    if (!map[setName]) map[setName] = [];
    map[setName].push(car);
  }

  const sets = Object.entries(map).sort((a, b) => b[1].length - a[1].length);

  if (sets.length === 0) {
    el.innerHTML = `<div class="brands-hub"><p class="empty-note" style="padding:40px;color:var(--muted)">No sets found. Add a Set Name to your cars in the admin panel.</p></div>`;
    return;
  }

  const totalCars = sets.reduce((n, [, c]) => n + c.length, 0);
  const logos = await getSetLogos();

  const cards = sets.map(([setName, setCars]) => {
    const logoUrl = logos[setName] || '';

    // Up to 4 preview images (used when no logo)
    const previews = setCars.map(getBestImage).filter(Boolean).slice(0, 4);
    const seriesMix = [...new Set(setCars.map(c => c.series).filter(Boolean))];

    const headerArea = logoUrl
      ? `<div class="shc-logo-wrap">
           <img src="${esc(logoUrl)}" class="shc-logo" alt="${esc(setName)} logo" loading="lazy">
         </div>`
      : previews.length
        ? `<div class="shc-previews">
             ${previews.map(src => `<img src="${esc(thumbOf(src))}" data-full="${esc(src)}" class="shc-thumb car-img" loading="lazy" decoding="async">`).join('')}
           </div>`
        : `<div class="shc-previews shc-previews--empty"><span>🚗</span></div>`;

    const seriesBadges = seriesMix.slice(0, 3).map(s =>
      `<span class="shc-series-badge">${esc(s)}</span>`
    ).join('');

    // Completion tracker — only when set_number is used
    const completionBar = buildCompletionBar(setCars);

    return `
      <div class="shc" data-set="${esc(setName)}">
        ${headerArea}
        <div class="shc-body">
          <div class="shc-name">${esc(setName)}</div>
          <div class="shc-meta">
            <span class="shc-count">${setCars.length} car${setCars.length !== 1 ? 's' : ''}</span>
            <div class="shc-series">${seriesBadges}</div>
          </div>
          ${completionBar}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="brands-hub">
      <div class="brands-hub-header">
        <div>
          <div class="brands-hub-eyebrow">Collection</div>
          <h2 class="brands-hub-title">Sets</h2>
        </div>
        <span class="brands-hub-meta">${sets.length} set${sets.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${totalCars} cars</span>
      </div>
      <div class="shc-grid">${cards}</div>
    </div>`;

  el.querySelectorAll('.shc').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.set;
      renderSetPage(cars, name);
      history.pushState({ view: 'sets', set: name }, '', `/sets/${encodeURIComponent(name)}`);
    });
  });
}

/* ──────────────────────────────────────────────
   INDIVIDUAL SET PAGE
─────────────────────────────────────────────── */
export function renderSetPage(cars, setName) {
  const el = document.getElementById('view-sets');
  if (!el) return;

  const setCars = cars.filter(c => (c.setName || '').trim() === setName.trim());

  // Sort by set_number (numeric part), then name
  const sorted = [...setCars].sort((a, b) => {
    const na = parseInt((a.setNumber || '').replace(/[^\d]/g, ''), 10);
    const nb = parseInt((b.setNumber || '').replace(/[^\d]/g, ''), 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const seriesMix = [...new Set(setCars.map(c => c.series).filter(Boolean))];

  const carCards = sorted.map(car => {
    const img = getBestImage(car);
    const num = car.setNumber ? `<span class="sp-card-num">${esc(car.setNumber)}</span>` : '';
    return `
      <div class="sp-card" data-car-id="${car.id}">
        <div class="sp-img-wrap">
          <img ${carThumbAttrs(car)} alt="${esc(car.name)}" class="sp-img car-img" loading="lazy" decoding="async"${!img && car.isIncoming ? ' style="opacity:.75"' : ''}>
          ${num}
          ${car.isIncoming ? `<div class="sp-coming-soon">Coming Soon</div>` : ''}
        </div>
        <div class="sp-info">
          <div class="sp-name">${esc(car.name)}</div>
          <div class="sp-sub">${[car.series, car.Colour].filter(Boolean).map(esc).join(' · ')}</div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="brands-hub">
      <div class="brands-hub-header" style="align-items:flex-start;gap:16px">
        <div>
          <button class="sp-back-btn" id="setsBackBtn">← All Sets</button>
          <h2 class="brands-hub-title" style="margin-top:8px">${esc(setName)}</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            ${seriesMix.map(s => `<span class="shc-series-badge">${esc(s)}</span>`).join('')}
          </div>
          ${buildCompletionBar(setCars)}
        </div>
        <span class="brands-hub-meta" style="white-space:nowrap">${setCars.length} car${setCars.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="sp-grid">${carCards}</div>
    </div>`;

  document.getElementById('setsBackBtn')?.addEventListener('click', () => {
    renderSetsHub(cars);
    history.pushState({ view: 'sets' }, '', '/sets');
  });

  el.querySelectorAll('.sp-card').forEach(card => {
    card.addEventListener('click', () => {
      const car = cars.find(c => String(c.id) === String(card.dataset.carId));
      if (car) showDetailsModal(car);
    });
  });
}
