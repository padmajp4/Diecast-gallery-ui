// js/brands.js — Manufacturer brand hub + individual brand pages
import { carThumbAttrs, thumbOf, PLACEHOLDER_IMG } from './carImage.js?v=3';

const BRAND_THEME = {
  'Ferrari':       { accent: '#DC143C', glow: 'rgba(220,20,60,0.35)',    bg: '#130103', label: 'Maranello, Italy · Est. 1939' },
  'Lamborghini':   { accent: '#E8A000', glow: 'rgba(232,160,0,0.35)',    bg: '#120d00', label: 'Sant\'Agata Bolognese, Italy · Est. 1963' },
  'Porsche':       { accent: '#C8A96E', glow: 'rgba(200,169,110,0.35)',  bg: '#100e08', label: 'Zuffenhausen, Stuttgart · Est. 1931' },
  'BMW':           { accent: '#1C69D4', glow: 'rgba(28,105,212,0.35)',   bg: '#02060f', label: 'Munich, Germany · Est. 1916' },
  'Mercedes-Benz': { accent: '#A8B2AE', glow: 'rgba(168,178,174,0.30)', bg: '#080c0b', label: 'Stuttgart, Germany · Est. 1926' },
  'Mercedes':      { accent: '#A8B2AE', glow: 'rgba(168,178,174,0.30)', bg: '#080c0b', label: 'Stuttgart, Germany · Est. 1926' },
  'Audi':          { accent: '#BB0A30', glow: 'rgba(187,10,48,0.35)',    bg: '#0e0003', label: 'Ingolstadt, Germany · Est. 1909' },
  'Toyota':        { accent: '#EB0A1E', glow: 'rgba(235,10,30,0.35)',    bg: '#0f0002', label: 'Toyota City, Japan · Est. 1937' },
  'Honda':         { accent: '#CC0000', glow: 'rgba(204,0,0,0.35)',      bg: '#0d0000', label: 'Minato, Tokyo, Japan · Est. 1948' },
  'Ford':          { accent: '#4A90D9', glow: 'rgba(74,144,217,0.35)',   bg: '#02070f', label: 'Dearborn, Michigan · Est. 1903' },
  'Chevrolet':     { accent: '#D4AF37', glow: 'rgba(212,175,55,0.35)',   bg: '#0e0c00', label: 'Detroit, Michigan · Est. 1911' },
  'Dodge':         { accent: '#E52B2B', glow: 'rgba(229,43,43,0.35)',    bg: '#0f0202', label: 'Auburn Hills, Michigan · Est. 1900' },
  'Nissan':        { accent: '#C3002F', glow: 'rgba(195,0,47,0.35)',     bg: '#0e0003', label: 'Yokohama, Japan · Est. 1933' },
  'Mazda':         { accent: '#C0392B', glow: 'rgba(192,57,43,0.35)',    bg: '#0e0200', label: 'Fuchū, Hiroshima, Japan · Est. 1920' },
  'Volkswagen':    { accent: '#4A90D9', glow: 'rgba(74,144,217,0.35)',   bg: '#02070f', label: 'Wolfsburg, Germany · Est. 1937' },
  'Subaru':        { accent: '#2E86C1', glow: 'rgba(46,134,193,0.35)',   bg: '#02060e', label: 'Shibuya, Tokyo, Japan · Est. 1953' },
  'Mitsubishi':    { accent: '#E74C3C', glow: 'rgba(231,76,60,0.35)',    bg: '#0f0200', label: 'Minato, Tokyo, Japan · Est. 1970' },
  'McLaren':       { accent: '#FF8000', glow: 'rgba(255,128,0,0.35)',    bg: '#100600', label: 'Woking, Surrey, UK · Est. 1963' },
  'Bugatti':       { accent: '#2B4B9A', glow: 'rgba(43,75,154,0.35)',    bg: '#02040e', label: 'Molsheim, France · Est. 1909' },
  'Maserati':      { accent: '#1A5FB4', glow: 'rgba(26,95,180,0.35)',    bg: '#02050d', label: 'Modena, Italy · Est. 1914' },
  'Alfa Romeo':    { accent: '#D32F2F', glow: 'rgba(211,47,47,0.35)',    bg: '#0e0202', label: 'Milan, Italy · Est. 1910' },
  'Jaguar':        { accent: '#1B5E7E', glow: 'rgba(27,94,126,0.35)',    bg: '#010609', label: 'Coventry, England · Est. 1935' },
  'Land Rover':    { accent: '#27AE60', glow: 'rgba(39,174,96,0.35)',    bg: '#010a04', label: 'Solihull, England · Est. 1948' },
  'Rolls-Royce':   { accent: '#C8A96E', glow: 'rgba(200,169,110,0.30)', bg: '#0d0a05', label: 'Goodwood, England · Est. 1906' },
  'Bentley':       { accent: '#27AE60', glow: 'rgba(39,174,96,0.30)',    bg: '#010a04', label: 'Crewe, England · Est. 1919' },
  'Pagani':        { accent: '#C8A96E', glow: 'rgba(200,169,110,0.30)', bg: '#0d0a05', label: 'San Cesario sul Panaro, Italy · Est. 1992' },
  'Koenigsegg':    { accent: '#FFD700', glow: 'rgba(255,215,0,0.35)',    bg: '#0f0e00', label: 'Ängelholm, Sweden · Est. 1994' },
  'Volvo':         { accent: '#1B6CA8', glow: 'rgba(27,108,168,0.35)',   bg: '#01060d', label: 'Gothenburg, Sweden · Est. 1927' },
  'Peugeot':       { accent: '#003189', glow: 'rgba(0,49,137,0.35)',     bg: '#00020b', label: 'Paris, France · Est. 1882' },
  'Renault':       { accent: '#EFCD00', glow: 'rgba(239,205,0,0.35)',    bg: '#0f0d00', label: 'Boulogne-Billancourt, France · Est. 1899' },
};

const DEFAULT_THEME = { accent: '#FF2D2D', glow: 'rgba(255,45,45,0.35)', bg: '#130102', label: '' };

// Self-hosted SVG logos (images/manufacturer-logos/*.svg)
const BRAND_LOGO_FILE = {
  'Ferrari':       'ferrari',
  'Lamborghini':   'lamborghini',
  'Porsche':       'porsche',
  'BMW':           'bmw',
  'Mercedes-Benz': 'mercedes',
  'Mercedes':      'mercedes',
  'Benz':          'mercedes',
  'Audi':          'audi',
  'Toyota':        'toyota',
  'Honda':         'honda',
  'Ford':          'ford',
  'Chevrolet':     'chevrolet',
  'Dodge':         'dodge',
  'Nissan':        'nissan',
  'Mazda':         'mazda',
  'Volkswagen':    'volkswagen',
  'Subaru':        'subaru',
  'Mitsubishi':    'mitsubishi',
  'McLaren':       'mclaren',
  'Bugatti':       'bugatti',
  'Volvo':         'volvo',
  'Jaguar':        null,
  'Land Rover':    'land_rover',
  'Range Rover':   'land_rover',
  'Hyundai':       'hyundai',
  'Kia':           null,
  'Lexus':         'lexus',
  'Acura':         'acura',
  'Jeep':          'jeep',
  'Fiat':          'fiat',
  'GMC':           null,
  'Alfa Romeo':    'alfa_romeo',
  'Cadillac':      'cadillac',
  'Kia':           'kia',
};

const LOGO_PNG = new Set(['alfa_romeo', 'datsun', 'lamborghini', 'subaru']);

function getBrandLogoPath(make) {
  const key = Object.keys(BRAND_LOGO_FILE).find(k =>
    k.toLowerCase() === make.toLowerCase() ||
    make.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(make.toLowerCase())
  );
  const file = key ? BRAND_LOGO_FILE[key] : null;
  if (!file) return null;
  const ext = LOGO_PNG.has(file) ? 'png' : 'svg';
  return `images/manufacturer-logos/${file}.${ext}`;
}


function getTheme(make) {
  if (!make) return DEFAULT_THEME;
  const key = Object.keys(BRAND_THEME).find(k =>
    k.toLowerCase() === make.toLowerCase() ||
    make.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(make.toLowerCase())
  );
  return key ? BRAND_THEME[key] : DEFAULT_THEME;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getBestImage(car) {
  if (Array.isArray(car.images) && car.images.length > 0) return car.images[0];
  if (car.featuredImage) return car.featuredImage;
  return '';
}

/* ──────────────────────────────────────────────
   BRANDS HUB
─────────────────────────────────────────────── */
export function renderBrandsHub(cars) {
  const el = document.getElementById('view-brands');
  if (!el) return;

  const HIDDEN_MAKES = new Set(['fantasy']);

  // Group by Manufacture
  const map = {};
  for (const car of cars) {
    const make = (car.Manufacture || '').trim();
    if (!make) continue;
    if (HIDDEN_MAKES.has(make.toLowerCase())) continue;
    if (!map[make]) map[make] = [];
    map[make].push(car);
  }

  const makes = Object.entries(map).sort((a, b) => b[1].length - a[1].length);

  if (makes.length === 0) {
    el.innerHTML = `<div class="brands-hub"><p class="empty-note">No manufacturer data found in collection.</p></div>`;
    return;
  }

  const cards = makes.map(([make, makeCars]) => {
    const theme = getTheme(make);
    const logoPath = getBrandLogoPath(make);
    const previewCar = makeCars.find(c => getBestImage(c));
    const fallbackSrc = esc(previewCar ? thumbOf(getBestImage(previewCar)) : PLACEHOLDER_IMG);
    const thumbContent = logoPath
      ? `<img src="${esc(logoPath)}" alt="${esc(make)} logo" class="bhc-logo" loading="lazy"
             data-loaded-class="loaded" data-on-error="swap" data-swap-class="bhc-preview" data-swap-src="${fallbackSrc}">`
      : (previewCar
          ? `<img src="${fallbackSrc}" alt="${esc(make)}" class="bhc-preview" loading="lazy" data-loaded-class="loaded">`
          : '');

    return `
      <div class="bhc" data-make="${esc(make)}" style="--ba:${theme.accent};">
        <div class="bhc-body">
          <div class="bhc-top">
            <div>
              <div class="bhc-name">${esc(make)}</div>
              <div class="bhc-count">${makeCars.length}<span> model${makeCars.length !== 1 ? 's' : ''}</span></div>
            </div>
            <div class="bhc-thumb">${thumbContent}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="brands-hub">
      <div class="brands-hub-header">
        <div>
          <div class="brands-hub-eyebrow">Collection</div>
          <h2 class="brands-hub-title">Manufacturers</h2>
        </div>
        <span class="brands-hub-meta">${makes.length} makes &nbsp;·&nbsp; ${cars.filter(c=>c.Manufacture).length} models</span>
      </div>
      <div class="brands-hub-grid">${cards}</div>
    </div>`;

  el.querySelectorAll('.bhc').forEach(card => {
    card.addEventListener('click', () => {
      const make = card.dataset.make;
      renderBrandPage(cars, make);
      history.pushState({ view: 'brands', make }, '', `/brands/${encodeURIComponent(make)}`);
    });
  });
}

/* ──────────────────────────────────────────────
   INDIVIDUAL BRAND PAGE
─────────────────────────────────────────────── */
export function renderBrandPage(cars, make) {
  const el = document.getElementById('view-brands');
  if (!el) return;

  const makeCars = cars.filter(c =>
    (c.Manufacture || '').trim().toLowerCase() === make.toLowerCase()
  );
  const theme = getTheme(make);

  // Stats
  const years = [...new Set(makeCars.map(c => c.year).filter(Boolean))].sort();
  const seriesSet = [...new Set(makeCars.map(c => c.series).filter(Boolean))];
  const thCount = makeCars.filter(c => c.isTreasurehunt).length;
  const diecastBrands = [...new Set(makeCars.map(c => c.brand).filter(Boolean))];

  const stats = [
    { label: 'Models', value: makeCars.length },
    { label: 'Years', value: years.length > 1 ? `${years[0]}–${years[years.length-1]}` : (years[0] || '—') },
    { label: 'Series', value: seriesSet.length || '—' },
    { label: 'Brands', value: diecastBrands.length > 0 ? diecastBrands.slice(0,2).join(', ') + (diecastBrands.length > 2 ? '…' : '') : '—' },
    ...(thCount > 0 ? [{ label: '🔥 TH', value: thCount }] : []),
  ];

  const statChips = stats.map(s => `
    <div class="bp-stat">
      <div class="bp-stat-value">${esc(String(s.value))}</div>
      <div class="bp-stat-label">${esc(s.label)}</div>
    </div>`).join('');

  const grid = makeCars.map(car => `
    <div class="gc-card" data-car-id="${Number(car.id)}">
      <div class="gc-img-wrap">
        <img class="gc-img car-img" ${carThumbAttrs(car)} alt="${esc(car.name)}" loading="lazy" decoding="async"
             data-loaded-class="img-loaded">
        <div class="gc-overlay"><div class="gc-name">${esc(car.name)}</div></div>
        ${car.isTreasurehunt ? `<img src="images/th.png" class="th-logo" style="position:absolute;top:6px;right:6px;width:28px;height:28px;" loading="lazy">` : ''}
      </div>
    </div>`).join('');

  const label = getTheme(make).label;
  const logoPath = getBrandLogoPath(make);
  const logoHtml = logoPath
    ? `<img src="${esc(logoPath)}" alt="${esc(make)} logo" class="bp-logo" loading="lazy"
           data-loaded-class="loaded" data-on-error="hide-parent">`
    : `<span class="bp-logo-fallback">${esc(make.charAt(0))}</span>`;

  el.innerHTML = `
    <div class="brand-page" style="--ba:${theme.accent};--bg:${theme.bg};--glow:${theme.glow};">

      <div class="bp-hero">
        <!-- decorative accent stripes -->
        <div class="bp-stripes" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>

        <button class="bp-back" id="bpBack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          All Brands
        </button>

        <div class="bp-hero-inner">
          <div class="bp-hero-top">
            <div class="bp-hero-text">
              <div class="bp-eyebrow">Manufacturer</div>
              <div class="bp-make">${esc(make)}</div>
              <div class="bp-accent-line"></div>
              ${label ? `<div class="bp-label">${esc(label)}</div>` : ''}
            </div>
            <div class="bp-logo-wrap">${logoHtml}</div>
          </div>
          <div class="bp-stats">${statChips}</div>
        </div>
      </div>

      <div class="bp-body">
        <div class="bp-section-header">
          <div class="bp-section-title">
            <span class="bp-section-dot"></span>
            Collection
          </div>
          <span class="bp-section-count">${makeCars.length} model${makeCars.length !== 1 ? 's' : ''}</span>
        </div>
        ${makeCars.length === 0
          ? `<p class="empty-note">No ${esc(make)} models in the collection yet.</p>`
          : `<div class="bp-grid">${grid}</div>`
        }
      </div>

    </div>`;

  el.querySelectorAll('.gc-card[data-car-id]').forEach(card => {
    card.addEventListener('click', () => {
      const car = makeCars.find(c => String(c.id) === card.dataset.carId);
      if (car) window.showDetails(car);
    });
  });

  document.getElementById('bpBack')?.addEventListener('click', () => {
    renderBrandsHub(cars);
    history.pushState({ view: 'brands' }, '', '/brands');
  });
}
