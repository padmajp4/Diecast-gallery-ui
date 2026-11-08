// js/variants.js — cars you own in several versions (grouped by the "model" field)
//   /variants          hub: one card per model with 2+ versions
//   /variants/<model>  every version side by side + release tracker (from Car Info)

import { showDetailsModal } from './modal.js?v=16';
import { carThumbAttrs } from './carImage.js?v=3';
import { APP_CONFIG } from './config.js?v=2';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Grouping ───────────────────────────────────────────────── */
export const modelKey = m => String(m || '').trim().replace(/\s+/g, ' ').toLowerCase();

/* [{ key, name, cars }] for models with 2+ cars, most versions first */
export function variantGroups(cars) {
  const map = new Map();
  for (const c of cars) {
    const key = modelKey(c.model);
    if (!key || c.isWishlist) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return [...map].filter(([, cs]) => cs.length > 1).map(([key, cs]) => {
    // Display name: the most common spelling in the group
    const counts = {};
    cs.forEach(c => { const n = c.model.trim(); counts[n] = (counts[n] || 0) + 1; });
    const name = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { key, name, cars: sortByYear(cs) };
  }).sort((a, b) => b.cars.length - a.cars.length || a.name.localeCompare(b.name));
}

export function groupFor(car, cars = window.ALL_CARS || []) {
  const key = modelKey(car?.model);
  return key ? variantGroups(cars).find(g => g.key === key) || null : null;
}

export const variantPath = name => `/variants/${encodeURIComponent(name)}`;

function sortByYear(cs) {
  return [...cs].sort((a, b) => (parseInt(a.year) || 9999) - (parseInt(b.year) || 9999) || (a.Colour || '').localeCompare(b.Colour || ''));
}

/* Colour dot (uses the colour map in config.js; unknown colours get a neutral dot) */
function colourDot(colour) {
  const entry = (APP_CONFIG.CAR_COLOURS || {})[String(colour || '').trim().toLowerCase()];
  const bg = Array.isArray(entry) ? `linear-gradient(135deg, ${entry[0]} 50%, ${entry[1]} 50%)` : entry || 'var(--border)';
  return `<span class="vh-dot" style="background:${bg}" title="${esc(colour || 'Unknown')}"></span>`;
}

/* Fanned stack of up to 4 thumbnails */
export function variantStack(cars) {
  const shown = cars.slice(0, 4);
  return `<div class="vh-stack vh-stack-${shown.length}">${shown.map((c, i) =>
    `<img ${carThumbAttrs(c)} class="vh-stack-img car-img" style="--i:${i}" alt="" loading="lazy" decoding="async">`).join('')}</div>`;
}

function navigate(path) {
  if (window.appNavigate) window.appNavigate(path);
}

/* ── Hub ────────────────────────────────────────────────────── */
export function renderVariantsHub(cars) {
  const el = document.getElementById('view-variants');
  if (!el) return;
  const groups = variantGroups(cars);
  const total = groups.reduce((n, g) => n + g.cars.length, 0);

  const cards = groups.map(g => {
    const brands = [...new Set(g.cars.map(c => c.brand).filter(Boolean))];
    const years = g.cars.map(c => parseInt(c.year)).filter(Boolean);
    const span = years.length ? (Math.min(...years) === Math.max(...years) ? `${years[0]}` : `${Math.min(...years)}–${Math.max(...years)}`) : '';
    return `
      <a class="vh-card" href="${variantPath(g.name)}" data-model="${esc(g.name)}">
        ${variantStack(g.cars)}
        <div class="vh-body">
          <div class="vh-name">${esc(g.name)}</div>
          <div class="vh-meta"><span class="vh-count">${g.cars.length} versions</span>${span ? ` · ${span}` : ''}</div>
          <div class="vh-dots">${g.cars.slice(0, 12).map(c => colourDot(c.Colour)).join('')}</div>
          <div class="vh-brands">${brands.map(b => `<span class="shc-series-badge">${esc(b)}</span>`).join('')}</div>
        </div>
      </a>`;
  }).join('');

  el.innerHTML = `
    <div class="brands-hub">
      <div class="brands-hub-header">
        <div>
          <div class="brands-hub-eyebrow">Collection</div>
          <h2 class="brands-hub-title">Variants</h2>
        </div>
        <span class="brands-hub-meta">${groups.length} models &nbsp;·&nbsp; ${total} cars</span>
      </div>
      ${groups.length ? `<div class="vh-grid">${cards}</div>` : '<p class="empty-note">No models with more than one version yet. Set the same <b>Model</b> on cars in the admin to group them.</p>'}
    </div>`;

  el.querySelectorAll('.vh-card').forEach(card => card.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;   // let new-tab clicks through
    e.preventDefault();
    navigate(variantPath(card.dataset.model));
  }));
}

/* ── Model page ─────────────────────────────────────────────── */
export function renderVariantPage(cars, name) {
  const el = document.getElementById('view-variants');
  if (!el) return;
  const key = modelKey(name);
  const group = variantGroups(cars).find(g => g.key === key);
  const list = group ? group.cars : sortByYear(cars.filter(c => modelKey(c.model) === key));
  const title = group?.name || name;

  const cards = list.map(c => `
    <div class="sp-card vp-card" data-car-id="${c.id}">
      <div class="sp-img-wrap">
        <img ${carThumbAttrs(c)} alt="${esc(c.name)}" class="sp-img car-img" loading="lazy" decoding="async">
        ${c.year ? `<span class="sp-card-num">${esc(c.year)}</span>` : ''}
        ${c.isIncoming ? '<div class="sp-coming-soon">Coming Soon</div>' : ''}
        ${c.isTreasurehunt ? '<div class="vp-th">🔥 TH</div>' : ''}
      </div>
      <div class="sp-info">
        <div class="sp-name">${colourDot(c.Colour)} ${esc(c.Colour || c.name)}</div>
        <div class="sp-sub">${[c.brand, c.series, c.serial].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="brands-hub">
      <div class="brands-hub-header" style="align-items:flex-start;gap:16px">
        <div>
          <button class="sp-back-btn" id="variantsBackBtn">← All variants</button>
          <h2 class="brands-hub-title" style="margin-top:8px">${esc(title)}</h2>
          <div class="vh-dots" style="margin-top:10px">${list.map(c => colourDot(c.Colour)).join('')}</div>
        </div>
        <span class="brands-hub-meta" style="white-space:nowrap">${list.length} version${list.length !== 1 ? 's' : ''}</span>
      </div>
      ${list.length ? `<div class="sp-grid">${cards}</div>` : '<p class="empty-note">No cars found for this model.</p>'}
      <div id="variantTracker"></div>
    </div>`;

  document.getElementById('variantsBackBtn')?.addEventListener('click', () => navigate('/variants'));
  el.querySelectorAll('.vp-card').forEach(card => card.addEventListener('click', () => {
    const car = list.find(c => String(c.id) === card.dataset.carId);
    if (car) showDetailsModal(car);
  }));
  loadTracker(list);
}

/* ── Release tracker ────────────────────────────────────────────
   Car Info (admin) stores each casting's release list from the wiki and
   which release each car is. Compare them: "4 of 28 releases" + the gaps. */
const releaseKey = v => ['year', 'series', 'color', 'wheel', 'toy'].map(k => String(v?.[k] || '').trim().toLowerCase()).join('|');

async function loadTracker(list) {
  const slot = document.getElementById('variantTracker');
  if (!slot || window.DIECAST_DEMO || !list.length) return;
  let infos = {};
  try {
    const res = await fetch(`/api/car-info?ids=${list.map(c => c.id).join(',')}`);
    if (res.ok) infos = await res.json();
  } catch { return; }
  if (!slot.isConnected) return;

  const castings = new Map();   // casting url → { casting, owned: Set(keys), cars }
  for (const c of list) {
    const info = infos[c.id];
    if (!info?.casting?.url) continue;
    const entry = castings.get(info.casting.url) || { casting: info.casting, owned: new Set(), cars: 0 };
    if (!entry.casting.versions && info.casting.versions) entry.casting = info.casting;
    entry.cars++;
    if (info.version) entry.owned.add(releaseKey(info.version));
    castings.set(info.casting.url, entry);
  }
  const blocks = [...castings.values()].filter(e => Array.isArray(e.casting.versions) && e.casting.versions.length);
  if (!blocks.length) return;

  slot.innerHTML = blocks.map(({ casting, owned }) => {
    const versions = casting.versions;
    const have = versions.filter(v => owned.has(releaseKey(v))).length;
    const missing = versions.filter(v => !owned.has(releaseKey(v)));
    const pct = Math.round((have / versions.length) * 100);
    return `
      <section class="vt-block">
        <div class="vt-head">
          <div>
            <div class="brands-hub-eyebrow">Release tracker</div>
            <h3 class="vt-title">${esc(casting.title)}</h3>
          </div>
          <a class="dp-wiki-src" href="${esc(/^https:\/\//.test(casting.url) ? casting.url.replace(/%2F/gi, '/') : '#')}" target="_blank" rel="noopener">${esc(casting.source || 'Wiki')} ↗</a>
        </div>
        <div class="vt-progress"><div class="vt-bar"><span style="width:${pct}%"></span></div><span class="vt-label"><b>${have}</b> of ${versions.length} releases</span></div>
        ${missing.length ? `
          <div class="vt-sub">Missing (${missing.length})</div>
          <div class="vt-grid">${missing.map((v, i) => `
            <div class="vt-item${i >= 12 ? ' vt-more' : ''}">
              ${v.image ? `<img src="${esc(v.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<div class="vt-noimg">No photo</div>'}
              <div class="vt-t">${esc([v.year, (v.series || '').split(' / ')[0]].filter(Boolean).join(' · '))}</div>
              <div class="vt-s">${esc([v.color, v.wheel].filter(Boolean).join(' · '))}</div>
            </div>`).join('')}</div>
          ${missing.length > 12 ? `<button class="sp-back-btn vt-show-all">Show all ${missing.length}</button>` : ''}` : '<p class="vt-done">🏆 You have every release.</p>'}
      </section>`;
  }).join('');

  slot.querySelectorAll('.vt-show-all').forEach(btn => btn.addEventListener('click', () => {
    btn.closest('.vt-block').classList.add('vt-expanded'); btn.remove();
  }));
}
