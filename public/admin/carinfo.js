/* ── Car Info tab ─────────────────────────────────────────────
   Match each car to its casting page on the Hot Wheels / Matchbox
   Fandom wiki (and the exact version, by comparing photos) plus the
   real car on Wikipedia. Wiki calls go straight from the browser
   (MediaWiki allows CORS with origin=*); only the confirmed result is
   saved via /admin/api/car-info/:id. Uses globals from index.html:
   allCars, loadCars, authFetch, esc.
─────────────────────────────────────────────────────────────── */

const CI_WIKIS = {
  hotwheels: { name: 'Hot Wheels Wiki', api: 'https://hotwheels.fandom.com/api.php', base: 'https://hotwheels.fandom.com/wiki/' },
  matchbox:  { name: 'Matchbox Wiki',   api: 'https://matchbox.fandom.com/api.php',  base: 'https://matchbox.fandom.com/wiki/' },
};
const CI_WP_API  = 'https://en.wikipedia.org/w/api.php';
const CI_WP_BASE = 'https://en.wikipedia.org/wiki/';

let ciRows = new Map();   // car_id → { status, data }
let ciQueue = [];         // cars currently listed (review order)
let ciIdx = -1;
let ciState = null;       // review dialog state
let ciLoaded = false;

/* ── Data ── */
async function ciInit() {
  if (!allCars.length) await loadCars();
  const res = await authFetch('/admin/api/car-info');
  if (res.ok) ciRows = new Map((await res.json()).map(r => [r.car_id, r]));
  if (!ciLoaded) {
    const brands = [...new Set(allCars.map(c => c.brand).filter(Boolean))].sort();
    document.getElementById('ciBrand').insertAdjacentHTML('beforeend',
      brands.map(b => `<option>${esc(b)}</option>`).join(''));
    ciLoaded = true;
  }
  ciRender();
}

function ciStatus(car) { return ciRows.get(car.id)?.status || 'todo'; }

const CI_STOP_WORDS = new Set(['the', 'and', 'of', 'hot', 'wheels', 'hw', 'car', 'edition', 'series', 'de', 'la', 'company', 'inc', 'motor']);
function ciWords(t) {
  return new Set((t || '').toLowerCase().replace('mercedes-benz', 'mercedes benz').match(/[a-z0-9]+/g)?.filter(w =>
    w.length > 1 && !CI_STOP_WORDS.has(w) && !/^\d{2}$|^\d{4}$/.test(w)) || []);
}
function ciSharesWord(a, b) {
  const x = ciWords(a);
  return [...ciWords(b)].some(w => x.has(w));
}

/* Things worth a second look on a confirmed match */
function ciWarnings(car) {
  const row = ciRows.get(car.id);
  if (row?.status !== 'confirmed' || !row.data) return [];
  const { casting, version, realCar } = row.data;
  const w = [];
  if (realCar && ciIsFantasy(car)) w.push('Fantasy casting has a real-car article');
  else if (realCar && !CI_VEHICLE_RE.test(`${realCar.description} ${realCar.summary?.slice(0, 200)}`)) w.push(`Real car "${realCar.title}" may not be a vehicle`);
  else if (realCar && !ciSharesWord(`${car.name} ${car.Manufacture || ''}`, realCar.title)) w.push(`Real car "${realCar.title}" looks unrelated`);
  if (version) {
    const mine = ciColours(car.Colour), theirs = ciColours(version.color);
    if (mine.size && theirs.size && ![...mine].some(c => theirs.has(c))) w.push(`Colour: yours "${car.Colour}" vs version "${version.color}"`);
    if (car.year && !String(version.year || '').includes(String(car.year))) w.push(`Year: yours ${car.year} vs version ${version.year}`);
  } else if (casting) w.push('No version picked');
  return w;
}

function ciRender() {
  const q      = document.getElementById('ciSearch').value.trim().toLowerCase();
  const filter = document.getElementById('ciFilter').value;
  const brand  = document.getElementById('ciBrand').value;

  ciQueue = allCars.filter(c =>
    (!brand || c.brand === brand) &&
    (filter === 'all' || (filter === 'check' ? ciWarnings(c).length > 0 : ciStatus(c) === filter)) &&
    (!q || `${c.name} ${c.brand} ${c.serial}`.toLowerCase().includes(q))
  );

  const done = allCars.filter(c => ciStatus(c) === 'confirmed').length;
  document.getElementById('ciProgress').textContent = `${done} / ${allCars.length} confirmed`;

  const list = document.getElementById('ciList');
  if (!ciQueue.length) { list.innerHTML = '<p class="ci-empty">Nothing here 🎉</p>'; return; }
  list.innerHTML = ciQueue.map((car, i) => {
    const st = ciStatus(car);
    const thumb = (car.images || [])[0];
    return `<div class="ci-row" data-i="${i}">
      ${thumb ? `<img class="car-thumb" src="${esc(thumbUrl(thumb))}" data-full="${esc(thumb)}" onerror="if(this.dataset.full&&this.src!==this.dataset.full)this.src=this.dataset.full" loading="lazy">` : '<div class="car-thumb"></div>'}
      <div class="ci-row-main">
        <div class="ci-row-name">${esc(car.name)}</div>
        <div class="ci-row-sub">${[car.brand, car.year, car.Colour, car.serial].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
      ${(() => { const w = ciWarnings(car); return w.length ? `<span class="ci-badge ci-warn" title="${esc(w.join('\n'))}">⚠ ${w.length}</span>` : ''; })()}
      <span class="ci-badge ci-${st}">${st === 'todo' ? 'To do' : st === 'confirmed' ? '✓ Confirmed' : 'Skipped'}</span>
    </div>`;
  }).join('');
}

document.getElementById('ciList').addEventListener('click', e => {
  const row = e.target.closest('.ci-row');
  if (row) ciOpen(+row.dataset.i);
});

/* ── MediaWiki helpers ── */
async function ciMw(api, params) {
  const url = `${api}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} from ${new URL(api).host}`);
  return res.json();
}

async function ciSearchTitles(api, q, limit = 6) {
  const j = await ciMw(api, { action: 'query', list: 'search', srsearch: q, srlimit: limit, srnamespace: 0 });
  return (j.query?.search || []).map(r => r.title);
}

function ciWikiFor(car) {
  const b = (car.brand || '').toLowerCase();
  if (b.includes('hot wheels')) return 'hotwheels';
  if (b.includes('matchbox')) return 'matchbox';
  return '';
}

function ciText(el) {
  if (!el) return '';
  const c = el.cloneNode(true);
  c.querySelectorAll('br').forEach(br => br.replaceWith(' / '));
  c.querySelectorAll('sup').forEach(s => s.remove());
  return c.textContent.replace(/\s+/g, ' ').replace(/(\s\/\s)+$/, '').trim();
}

function ciImgSrc(img, width = 300) {
  if (!img) return '';
  const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
  if (!src || src.startsWith('data:') || /Image_Not_Available/i.test(src)) return '';
  return src.replace(/\/scale-to-width-down\/\d+/, `/scale-to-width-down/${width}`);
}

/* Wiki article path: like MediaWiki's own links, keep / : , readable ("R/T", "S/C") */
function ciWikiPath(title) {
  return encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/').replace(/%3A/g, ':').replace(/%2C/g, ',');
}

/* Expand a wikitable (rowspan/colspan aware) into header-keyed rows */
function ciParseTable(table) {
  const rows = [...table.rows];
  const headIdx = rows.findIndex(r => r.querySelector('th'));
  if (headIdx < 0) return [];
  const headers = [...rows[headIdx].cells].map(c => ciText(c));
  const carry = [];   // per column: { cell, left }
  const out = [];

  for (const tr of rows.slice(headIdx + 1)) {
    const cells = [...tr.cells];
    if (!cells.length || cells.every(c => c.tagName === 'TH')) continue;
    const row = [];
    let col = 0;
    const fillCarry = () => {
      while (carry[col]?.left > 0) { row[col] = carry[col].cell; carry[col].left--; col++; }
    };
    for (const cell of cells) {
      fillCarry();
      const span = cell.colSpan || 1, rs = cell.rowSpan || 1;
      for (let k = 0; k < span; k++) {
        row[col] = cell;
        carry[col] = rs > 1 ? { cell, left: rs - 1 } : null;
        col++;
      }
    }
    while (col < headers.length) { fillCarry(); if (!row[col]) col++; }
    out.push(row);
  }

  const find = re => headers.findIndex(h => re.test(h));
  const ix = {
    year: find(/^year/i), series: find(/^series/i), color: find(/^colou?r$/i),
    tampo: find(/tampo/i), wheel: find(/wheel/i), toy: find(/toy/i),
    notes: find(/notes/i), photo: find(/photo/i),
  };
  if (ix.year < 0 || ix.color < 0) return [];

  return out.map(r => {
    const get = k => (ix[k] >= 0 ? ciText(r[ix[k]]) : '');
    return {
      year: get('year'), series: get('series'), color: get('color'), tampo: get('tampo'),
      wheel: get('wheel'), toy: get('toy'), notes: get('notes'),
      image: ix.photo >= 0 ? ciImgSrc(r[ix.photo]?.querySelector('img')) : '',
    };
  }).filter(v => v.year || v.color);
}

async function ciLoadCasting(wikiKey, title) {
  const wiki = CI_WIKIS[wikiKey];
  const j = await ciMw(wiki.api, { action: 'parse', page: title, prop: 'text', redirects: 1 });
  const doc = new DOMParser().parseFromString(j.parse.text['*'], 'text/html');

  const fields = {};
  doc.querySelectorAll('.portable-infobox .pi-data').forEach(d => {
    const k = ciText(d.querySelector('.pi-data-label'));
    const v = ciText(d.querySelector('.pi-data-value'));
    if (k && v) fields[k] = v;
  });

  const versions = [...doc.querySelectorAll('table.wikitable')].flatMap(ciParseTable);
  return {
    source: wiki.name,
    title: j.parse.title,
    url: wiki.base + ciWikiPath(j.parse.title),
    image: ciImgSrc(doc.querySelector('.portable-infobox figure img'), 400),
    fields,
    versions,
  };
}

const CI_VEHICLE_RE = /\b(car|cars|automobile|vehicle|truck|pickup|van|suv|coup[eé]|sedan|roadster|convertible|hatchback|grand tourer|supercar|hypercar|race ?car|racing|motorcycle|bus|tractor|locomotive|concept|model of|produced by|manufactured by)\b/i;

async function ciSearchWpHits(q) {
  const j = await ciMw(CI_WP_API, {
    action: 'query', generator: 'search', gsrsearch: q, gsrlimit: 6, gsrnamespace: 0, prop: 'description',
  });
  return Object.values(j.query?.pages || {})
    .sort((a, b) => a.index - b.index)
    .map(p => ({ title: p.title, description: p.description || '' }));
}

/* Best vehicle-looking hit: most query words in the title, search order breaks ties */
function ciBestWpHit(hits, q) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1);
  let best = null, bestScore = 0;
  for (const h of hits) {
    if (!CI_VEHICLE_RE.test(h.description)) continue;
    const t = h.title.toLowerCase();
    const score = 1 + words.filter(w => t.includes(w)).length;
    if (score > bestScore) { best = h; bestScore = score; }
  }
  return best;
}

function ciIsFantasy(car) {
  const m = (car.Manufacture || '').trim().toLowerCase();
  return !m || m === 'fantasy';
}

async function ciLoadWikipedia(title) {
  const j = await ciMw(CI_WP_API, {
    action: 'query', prop: 'extracts|pageimages|description', exintro: 1, explaintext: 1,
    piprop: 'thumbnail', pithumbsize: 400, redirects: 1, titles: title,
  });
  const page = Object.values(j.query?.pages || {})[0];
  if (!page || page.missing !== undefined) return null;
  // Keep the first ~3 sentences
  const sentences = (page.extract || '').split(/(?<=\.)\s+/);
  let summary = '';
  for (const s of sentences) { if ((summary + s).length > 600) break; summary += (summary ? ' ' : '') + s; }
  return {
    title: page.title,
    url: CI_WP_BASE + ciWikiPath(page.title),
    description: page.description || '',
    summary: summary || (page.extract || '').slice(0, 600),
    thumbnail: page.thumbnail?.source || '',
  };
}

/* Wiki colour names are often marketing / Italian (Lamborghini "Rosso Scintilla") */
const CI_COLOUR_SYNONYMS = {
  red: ['red', 'rosso', 'rouge', 'rojo', 'scarlet', 'crimson', 'cherry'],
  black: ['black', 'nero', 'noir', 'negro', 'ebony'],
  white: ['white', 'bianco', 'blanc', 'blanco', 'pearl'],
  blue: ['blue', 'blu', 'azzurro', 'bleu', 'azul', 'navy', 'teal'],
  green: ['green', 'verde', 'vert', 'olive', 'lime'],
  yellow: ['yellow', 'giallo', 'jaune', 'amarillo'],
  orange: ['orange', 'arancio', 'arancione', 'naranja'],
  gray: ['gray', 'grey', 'grigio', 'gris', 'gunmetal', 'graphite'],
  silver: ['silver', 'argento', 'chrome', 'zamac'],
  purple: ['purple', 'viola', 'violet', 'magenta', 'lavender'],
  pink: ['pink', 'rosa'],
  gold: ['gold', 'oro'],
  brown: ['brown', 'marrone', 'tan', 'bronze', 'copper'],
};
const CI_COLOUR_OF = Object.fromEntries(
  Object.entries(CI_COLOUR_SYNONYMS).flatMap(([base, words]) => words.map(w => [w, base])));

function ciColours(text) {
  return new Set((text || '').toLowerCase().split(/[^a-z]+/).map(w => CI_COLOUR_OF[w]).filter(Boolean));
}

/* Rank versions against what we know about the car */
function ciScore(v, car) {
  let s = 0;
  if (car.year && v.year.includes(String(car.year))) s += 3;
  const vc = ciColours(v.color);
  ciColours(car.Colour).forEach(c => { if (vc.has(c)) s += 2; });
  if (car.isTreasurehunt && /treasure hunt/i.test(v.series + ' ' + v.notes)) s += 2;
  return s;
}

/* ── Review dialog ── */
function ciOpen(i) {
  ciIdx = i;
  const car = ciQueue[i];
  if (!car) return ciClose();
  const saved = ciRows.get(car.id)?.data || null;

  ciState = {
    car,
    wiki: saved?.casting ? (saved.casting.source === CI_WIKIS.matchbox.name ? 'matchbox' : 'hotwheels') : ciWikiFor(car),
    castingHits: [], casting: null, castingErr: '', castingLoading: false,
    version: saved?.version || null,
    wpHits: [], realCar: saved?.realCar || null, wpErr: '', wpLoading: false,
    photo: 0,
  };
  document.getElementById('ciReview').classList.add('open');
  document.body.style.overflow = 'hidden';
  ciDraw();

  const castingQ = saved?.casting?.title || car.name;
  if (ciState.wiki) ciSearchCasting(castingQ, !!saved?.casting);
  // Saved row → keep exactly what was confirmed (including "None")
  ciSearchWp(saved?.realCar?.title || ciWpQuery(car), !!saved);
}

function ciClose() {
  document.getElementById('ciReview').classList.remove('open');
  document.body.style.overflow = '';
  ciState = null;
  ciRender();
}

function ciWpQuery(car) {
  const name = (car.name || '').replace(/^[‘’']?\d{2,4}\s+/, '');
  const make = car.Manufacture || '';
  return make && !name.toLowerCase().includes(make.toLowerCase()) ? `${make} ${name}` : name;
}

async function ciSearchCasting(q, keepVersion = false) {
  const st = ciState; if (!st || !st.wiki) return;
  st.castingLoading = true; st.castingErr = ''; ciDraw();
  try {
    st.castingHits = await ciSearchTitles(CI_WIKIS[st.wiki].api, q);
    if (st !== ciState) return;
    if (st.castingHits.length) await ciPickCasting(st.castingHits[0], keepVersion);
    else st.castingErr = 'No pages found — try a different search.';
  } catch (e) { st.castingErr = e.message; }
  st.castingLoading = false;
  if (st === ciState) ciDraw();
}

async function ciPickCasting(title, keepVersion = false) {
  const st = ciState;
  st.castingLoading = true; ciDraw();
  try {
    const c = await ciLoadCasting(st.wiki, title);
    if (st !== ciState) return;
    c.versions.forEach(v => (v.score = ciScore(v, st.car)));
    c.versions.sort((a, b) => b.score - a.score);
    st.casting = c;
    if (keepVersion) {
      // Swap the saved copy for the matching card so only that one is highlighted
      if (st.version) {
        const key = ciVersionKey(st.version);
        st.version = c.versions.find(v => ciVersionKey(v) === key) || st.version;
      }
    } else {
      // Suggest the top version only when it clearly beats the runner-up
      st.version = ciHasBestGuess(c.versions) ? c.versions[0] : null;
    }
  } catch (e) { st.castingErr = e.message; }
  st.castingLoading = false;
  if (st === ciState) ciDraw();
}

async function ciSearchWp(q, keep = false) {
  const st = ciState; if (!st) return;
  st.wpLoading = true; st.wpErr = ''; ciDraw();
  try {
    st.wpHits = await ciSearchWpHits(q);
    if (st !== ciState) return;
    if (!keep) {
      const best = ciIsFantasy(st.car) ? null : ciBestWpHit(st.wpHits, q);
      st.realCar = best ? await ciLoadWikipedia(best.title) : null;
    }
    if (!st.wpHits.length) st.wpErr = 'No articles found.';
  } catch (e) { st.wpErr = e.message; }
  st.wpLoading = false;
  if (st === ciState) ciDraw();
}

async function ciPickWp(title) {
  const st = ciState;
  st.wpLoading = true; ciDraw();
  try { st.realCar = await ciLoadWikipedia(title); } catch (e) { st.wpErr = e.message; }
  st.wpLoading = false;
  if (st === ciState) ciDraw();
}

function ciHasBestGuess(versions) {
  const [a, b] = versions;
  // A tie is fine when the tied versions are the same colour (e.g. US vs international card)
  return !!a && a.score > 0 && (!b || a.score > b.score || a.color === b.color);
}

/* Versions of one casting often share year/series/colour/toy # and differ only
   by wheels or tampo — compare every field we store. */
const CI_VERSION_KEYS = ['year', 'series', 'color', 'tampo', 'wheel', 'toy', 'notes', 'image'];
function ciVersionKey(v) { return CI_VERSION_KEYS.map(k => v?.[k] || '').join('\u0001'); }

function ciDraw() {
  const st = ciState; if (!st) return;
  const { car } = st;
  const photos = car.images || [];
  const c = st.casting;

  const versionCards = c ? c.versions.map((v, i) => `
    <button class="ci-ver ${v === st.version ? 'sel' : ''}" data-v="${i}">
      ${v.image ? `<img src="${esc(v.image)}" loading="lazy" referrerpolicy="no-referrer">` : '<div class="ci-noimg">No photo</div>'}
      ${i === 0 && ciHasBestGuess(c.versions) ? '<span class="ci-best">Best guess</span>' : ''}
      <div class="ci-ver-t">${esc([v.year, v.series].filter(Boolean).join(' · '))}</div>
      <div class="ci-ver-s">${esc([v.color, v.wheel].filter(Boolean).join(' · '))}</div>
    </button>`).join('') : '';

  document.getElementById('ciDialog').innerHTML = `
    <div class="ci-head">
      <div>
        <div class="ci-title">${esc(car.name)}</div>
        <div class="ci-row-sub">${document.getElementById('ciFilter').value === 'todo' ? `${ciQueue.length} left to do` : `${ciIdx + 1} of ${ciQueue.length}`} · ${[car.brand, car.year, car.series, car.Colour].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
      <button class="btn btn-secondary btn-sm" data-act="close">✕</button>
    </div>

    ${ciWarnings(car).length ? `<div class="ci-warnbar">⚠ ${ciWarnings(car).map(esc).join(' · ')}</div>` : ''}
    <div class="ci-body">
      <div class="ci-mine">
        <div class="ci-label">Your car</div>
        ${photos.length ? `<img class="ci-mine-img" src="${esc(photos[st.photo] || photos[0])}">` : '<div class="ci-mine-img ci-noimg">No photo</div>'}
        ${photos.length > 1 ? `<div class="ci-mine-thumbs">${photos.map((p, i) => `<img src="${esc(p)}" data-photo="${i}" class="${i === st.photo ? 'sel' : ''}">`).join('')}</div>` : ''}
        ${st.version ? `<div class="ci-label" style="margin-top:14px">Selected version</div>
          ${st.version.image ? `<img class="ci-mine-img" src="${esc(st.version.image)}" referrerpolicy="no-referrer">` : ''}
          <div class="ci-row-sub">${esc([st.version.year, st.version.series, st.version.color, st.version.wheel, st.version.toy].filter(Boolean).join(' · '))}</div>` : ''}
      </div>

      <div class="ci-side">
        <section class="ci-sec">
          <div class="ci-sec-head">
            <span class="ci-label">Casting</span>
            <select id="ciWiki">
              <option value="">— None —</option>
              ${Object.entries(CI_WIKIS).map(([k, w]) => `<option value="${k}" ${k === st.wiki ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          ${st.wiki ? `
            <form class="ci-search" data-form="casting"><input type="text" name="q" value="${esc(c?.title || car.name)}"><button class="btn btn-secondary btn-sm">Search</button></form>
            ${st.castingHits.length ? `<div class="ci-chips">${st.castingHits.map(t => `<button class="ci-chip ${c?.title === t ? 'sel' : ''}" data-casting="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
            ${st.castingLoading ? '<p class="ci-muted">Loading…</p>' : ''}
            ${st.castingErr ? `<p class="ci-err">${esc(st.castingErr)}</p>` : ''}
            ${c ? `
              <div class="ci-casting">
                ${c.image ? `<img src="${esc(c.image)}" referrerpolicy="no-referrer">` : ''}
                <div>
                  <a href="${esc(c.url)}" target="_blank" rel="noopener" class="ci-link">${esc(c.title)} ↗</a>
                  ${Object.entries(c.fields).map(([k, v]) => `<div class="ci-field"><b>${esc(k)}</b> ${esc(v)}</div>`).join('')}
                </div>
              </div>
              <div class="ci-label" style="margin-top:12px">Which version is yours? <span class="ci-muted">(${c.versions.length} listed, best matches first)</span></div>
              <div class="ci-vers">
                <button class="ci-ver ci-ver-none ${!st.version ? 'sel' : ''}" data-v="-1"><div class="ci-noimg">Not listed / not sure</div></button>
                ${versionCards}
              </div>` : ''}
          ` : '<p class="ci-muted">No casting wiki for this brand. Pick one above if it applies.</p>'}
        </section>

        <section class="ci-sec">
          <div class="ci-sec-head"><span class="ci-label">Real car · Wikipedia</span></div>
          <form class="ci-search" data-form="wp"><input type="text" name="q" value="${esc(st.realCar?.title || ciWpQuery(car))}"><button class="btn btn-secondary btn-sm">Search</button></form>
          <div class="ci-chips">
            <button class="ci-chip ${!st.realCar ? 'sel' : ''}" data-wp="">✕ None</button>
            ${st.wpHits.map(h => `<button class="ci-chip ${st.realCar?.title === h.title ? 'sel' : ''}" data-wp="${esc(h.title)}" title="${esc(h.description)}">${esc(h.title)}${h.description ? ` <span class="ci-chip-d">· ${esc(h.description)}</span>` : ''}</button>`).join('')}
          </div>
          ${st.wpLoading ? '<p class="ci-muted">Loading…</p>' : ''}
          ${st.wpErr ? `<p class="ci-err">${esc(st.wpErr)}</p>` : ''}
          ${!st.realCar && !st.wpLoading ? `<p class="ci-muted">No real-car info will be shown${ciIsFantasy(car) ? ' (fantasy casting)' : ''}.</p>` : ''}
          ${st.realCar ? `
            <div class="ci-casting">
              ${st.realCar.thumbnail ? `<img src="${esc(st.realCar.thumbnail)}">` : ''}
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
                  <a href="${esc(st.realCar.url)}" target="_blank" rel="noopener" class="ci-link">${esc(st.realCar.title)} ↗</a>
                  <button class="btn btn-danger btn-sm" data-wp="">✕ Remove</button>
                </div>
                ${st.realCar.description ? `<div class="ci-muted">${esc(st.realCar.description)}</div>` : ''}
                <p class="ci-summary">${esc(st.realCar.summary)}</p>
              </div>
            </div>` : ''}
        </section>
      </div>
    </div>

    <div class="ci-foot">
      <button class="btn btn-secondary btn-sm" data-act="prev" ${ciIdx <= 0 ? 'disabled' : ''}>← Prev</button>
      <span style="flex:1"></span>
      ${ciRows.has(car.id) ? '<button class="btn btn-danger btn-sm" data-act="reset">Reset</button>' : ''}
      <button class="btn btn-secondary btn-sm" data-act="skip">Skip</button>
      <button class="btn btn-primary" data-act="save" ${(!c && !st.realCar) || st.castingLoading || st.wpLoading ? 'disabled' : ''}>Confirm &amp; next →</button>
    </div>`;
}

/* Release list kept with the casting so the public Variants page can show
   "4 of 28 releases" and the missing ones (no wiki calls from the public site). */
function ciCompactVersions(versions) {
  const list = (versions || []).map(({ year, series, color, wheel, toy, image }) => ({ year, series, color, wheel, toy, image }));
  // Stay well under the worker's 64 KB limit for huge castings
  return JSON.stringify(list).length > 45000 ? list.map(({ image, ...v }) => v) : list;
}

/* One-off: add release lists to matches confirmed before they were stored */
async function ciBackfillReleases() {
  const btn = document.getElementById('ciBackfillBtn');
  const todo = [...ciRows.values()].filter(r => r.status === 'confirmed' && r.data?.casting?.url && !Array.isArray(r.data.casting.versions));
  if (!todo.length) { btn.textContent = '✓ Release lists up to date'; return; }
  if (!confirm(`Fetch release lists from the wiki for ${todo.length} confirmed cars? This takes about ${Math.ceil(todo.length * 1.2 / 60)} min — keep this tab open.`)) return;
  btn.disabled = true;
  let done = 0, failed = 0;
  const titleCache = new Map();
  for (const row of todo) {
    btn.textContent = `Updating… ${done + failed}/${todo.length}`;
    const { casting } = row.data;
    const wiki = casting.url.includes('matchbox.fandom.com') ? 'matchbox' : 'hotwheels';
    try {
      const k = wiki + '|' + casting.title;
      let versions = titleCache.get(k);
      if (!versions) {
        versions = ciCompactVersions((await ciLoadCasting(wiki, casting.title)).versions);
        titleCache.set(k, versions);
        await new Promise(r => setTimeout(r, 800));   // be gentle with the wiki
      }
      const data = { ...row.data, casting: { ...casting, versions } };
      const res = await authFetch(`/admin/api/car-info/${row.car_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', data }),
      });
      if (!res.ok) throw new Error(await res.text());
      ciRows.set(row.car_id, { ...row, data });
      done++;
    } catch (e) {
      console.warn('release list failed for car', row.car_id, e);
      failed++;
    }
  }
  btn.disabled = false;
  btn.textContent = failed ? `✓ ${done} updated · ${failed} failed (click to retry)` : `✓ ${done} release lists added`;
}

async function ciSave(status) {
  const st = ciState; if (!st) return;
  const c = st.casting;
  const data = status === 'skipped' ? null : {
    casting: c ? { source: c.source, title: c.title, url: c.url, fields: c.fields, versions: ciCompactVersions(c.versions) } : null,
    version: st.version ? (({ score, ...v }) => v)(st.version) : null,
    realCar: st.realCar ? { title: st.realCar.title, url: st.realCar.url, description: st.realCar.description, summary: st.realCar.summary } : null,
  };
  const res = await authFetch(`/admin/api/car-info/${st.car.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, data }),
  });
  if (!res.ok) { alert('Save failed: ' + (await res.text())); return; }
  ciRows.set(st.car.id, { car_id: st.car.id, status, data });
  ciNext();
}

function ciNext() {
  // A saved car may drop out of the filtered list ("To do", "Needs check") or stay in it
  const prevCar = ciState?.car;
  ciRender();
  const i = ciQueue[ciIdx] === prevCar ? ciIdx + 1 : ciIdx;
  if (i < ciQueue.length) ciOpen(i); else ciClose();
}

document.getElementById('ciDialog').addEventListener('click', async e => {
  const st = ciState; if (!st) return;
  const t = e.target.closest('button, img[data-photo]');
  if (!t) return;
  if (t.dataset.photo) { st.photo = +t.dataset.photo; return ciDraw(); }
  if (t.dataset.v !== undefined) { st.version = +t.dataset.v < 0 ? null : st.casting.versions[+t.dataset.v]; return ciDraw(); }
  if (t.dataset.casting !== undefined) { e.preventDefault(); return ciPickCasting(t.dataset.casting); }
  if (t.dataset.wp !== undefined) {
    e.preventDefault();
    if (!t.dataset.wp) { st.realCar = null; return ciDraw(); }
    return ciPickWp(t.dataset.wp);
  }
  switch (t.dataset.act) {
    case 'close': return ciClose();
    case 'prev':  return ciOpen(ciIdx - 1);
    case 'skip':  return ciSave('skipped');
    case 'save':  return ciSave('confirmed');
    case 'reset':
      if (!confirm('Remove saved info for this car?')) return;
      await authFetch(`/admin/api/car-info/${st.car.id}`, { method: 'DELETE' });
      ciRows.delete(st.car.id);
      return ciOpen(ciIdx);
  }
});

document.getElementById('ciDialog').addEventListener('submit', e => {
  e.preventDefault();
  const q = e.target.q.value.trim();
  if (!q) return;
  if (e.target.dataset.form === 'casting') ciSearchCasting(q);
  else ciSearchWp(q);
});

document.getElementById('ciDialog').addEventListener('change', e => {
  if (e.target.id !== 'ciWiki' || !ciState) return;
  Object.assign(ciState, { wiki: e.target.value, casting: null, castingHits: [], version: null, castingErr: '' });
  if (ciState.wiki) ciSearchCasting(ciState.car.name); else ciDraw();
});

document.getElementById('ciReview').addEventListener('click', e => { if (e.target.id === 'ciReview') ciClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ciState) ciClose(); });
