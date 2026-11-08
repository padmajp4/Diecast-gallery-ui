/* ── Variants tab ─────────────────────────────────────────────
   Suggests cars that look like versions of the same casting but aren't
   grouped under one "Model" yet, so the public Variants page is complete.
   Uses globals from index.html: allCars, loadCars, authFetch, esc,
   buildCarPayload, thumbUrl.
─────────────────────────────────────────────────────────────── */

const VA_DISMISSED_KEY = 'diecast_admin_variants_dismissed';
let vaDismissed = new Set();
try { vaDismissed = new Set(JSON.parse(localStorage.getItem(VA_DISMISSED_KEY) || '[]')); } catch {}

const vaModelKey = m => String(m || '').trim().replace(/\s+/g, ' ').toLowerCase();

/* Name → comparable key: lower-case, '67 / 67 / 1967 → 67, punctuation dropped.
   Keeps the year, so '67 and '68 Shelby GT500 stay separate castings. */
function vaNameKey(name) {
  let n = String(name || '').toLowerCase().trim();
  n = n.replace(/^[‘’']?(?:19|20)?(\d{2})\s+/, '$1 ');
  return n.replace(/[^a-z0-9]/g, '');
}

function vaSuggestions() {
  const cars = allCars.filter(c => !c.isWishlist);
  const out = [];

  // 1. Same model, different spelling ("Honda Civic" vs "honda civic ")
  const byModelKey = new Map();
  for (const c of cars) {
    const k = vaModelKey(c.model); if (!k) continue;
    if (!byModelKey.has(k)) byModelKey.set(k, []);
    byModelKey.get(k).push(c);
  }
  for (const [k, cs] of byModelKey) {
    const spellings = [...new Set(cs.map(c => c.model))];
    if (spellings.length > 1) {
      const counts = {}; cs.forEach(c => counts[c.model] = (counts[c.model] || 0) + 1);
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0].trim().replace(/\s+/g, ' ');
      out.push({ id: 'spell:' + k, kind: 'Unify spelling', model: best, cars: cs.filter(c => c.model !== best) , context: cs.filter(c => c.model === best) });
    }
  }

  // 2. Cars without a model that match an existing model's name → add to that group
  const modelByNameKey = new Map();
  for (const [k, cs] of byModelKey) modelByNameKey.set(vaNameKey(cs[0].model), cs[0].model.trim());
  const ungrouped = cars.filter(c => !vaModelKey(c.model));
  const usedIds = new Set();
  for (const c of ungrouped) {
    const target = modelByNameKey.get(vaNameKey(c.name));
    if (target) {
      const id = 'join:' + vaModelKey(target);
      let s = out.find(x => x.id === id);
      if (!s) { s = { id, kind: 'Add to existing group', model: target, cars: [], context: byModelKey.get(vaModelKey(target)) }; out.push(s); }
      s.cars.push(c); usedIds.add(c.id);
    }
  }

  // 3. Cars without a model that share a name with each other → new group
  const byName = new Map();
  for (const c of ungrouped) {
    if (usedIds.has(c.id)) continue;
    const k = vaNameKey(c.name); if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(c);
  }
  for (const [k, cs] of byName) {
    if (cs.length < 2) continue;
    // Prefer the most "proper" spelling: mixed case over ALL CAPS, then the
    // '67 year style, then the fuller name ("R/T" over "RT")
    const name = [...cs.map(c => c.name.trim())].sort((a, b) =>
      (a === a.toUpperCase()) - (b === b.toUpperCase()) ||
      (/^['‘’]\d{2}\s/.test(b) - /^['‘’]\d{2}\s/.test(a)) ||
      b.length - a.length)[0];
    out.push({ id: 'new:' + k, kind: 'New group', model: name, cars: cs, context: [] });
  }
  return out.filter(s => s.cars.length && !vaDismissed.has(s.id));
}

async function vaInit() {
  if (!allCars.length) await loadCars();
  vaRender();
}

function vaCarChip(c, checkbox) {
  const thumb = (c.images || [])[0];
  return `<label class="va-car">
    ${checkbox ? `<input type="checkbox" class="va-cb" data-id="${c.id}" checked>` : ''}
    ${thumb ? `<img src="${esc(thumbUrl(thumb))}" data-full="${esc(thumb)}" onerror="if(this.dataset.full&&this.src!==this.dataset.full)this.src=this.dataset.full" loading="lazy">` : '<span class="va-noimg"></span>'}
    <span><b>${esc(c.name)}</b><br><small>${[c.Colour, c.year, c.brand, c.serial].filter(Boolean).map(esc).join(' · ')}${c.model ? ` · model: “${esc(c.model)}”` : ''}</small></span>
  </label>`;
}

/* Same colour + year + brand → probably the same car entered twice, not a variant */
function vaLooksDuplicated(s) {
  const seen = new Set();
  for (const c of [...s.cars, ...s.context]) {
    const k = [c.Colour, c.year, c.brand].map(v => String(v || '').trim().toLowerCase()).join('|');
    if (k.replace(/\|/g, '') && seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

function vaRender() {
  const list = vaSuggestions();
  const el = document.getElementById('vaList');
  document.getElementById('vaCount').textContent = list.length ? `${list.length} suggestion${list.length !== 1 ? 's' : ''}` : '';
  if (!list.length) { el.innerHTML = '<p class="ci-empty">No suggestions — your variants look tidy 🎉</p>'; return; }
  el.innerHTML = list.map(s => `
    <div class="va-card" data-sid="${esc(s.id)}">
      <div class="va-head">
        <span class="ci-badge">${esc(s.kind)}</span>
        <label class="va-model">Model <input type="text" class="va-model-input" value="${esc(s.model)}"></label>
      </div>
      <div class="va-cars">${s.cars.map(c => vaCarChip(c, true)).join('')}</div>
      ${vaLooksDuplicated(s) ? `<div class="va-warn">⚠ Some of these have the same colour, year and brand — if it's one car entered twice, delete the extra and set <b>Copies owned</b> instead.</div>` : ''}
      ${s.context.length ? `<div class="va-context">Already in “${esc(s.model)}”: ${s.context.map(c => esc([c.Colour, c.year].filter(Boolean).join(' ') || c.name)).join(', ')}</div>` : ''}
      <div class="va-actions">
        <button class="btn btn-primary btn-sm" data-act="group">Group</button>
        <button class="btn btn-secondary btn-sm" data-act="dismiss">Not the same car</button>
      </div>
    </div>`).join('');
}

document.getElementById('vaList').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-act]'); if (!btn) return;
  const card = btn.closest('.va-card'); const sid = card.dataset.sid;
  if (btn.dataset.act === 'dismiss') {
    vaDismissed.add(sid);
    try { localStorage.setItem(VA_DISMISSED_KEY, JSON.stringify([...vaDismissed])); } catch {}
    return vaRender();
  }
  const model = card.querySelector('.va-model-input').value.trim().replace(/\s+/g, ' ');
  const ids = [...card.querySelectorAll('.va-cb:checked')].map(cb => cb.dataset.id);
  if (!model || !ids.length) return;
  btn.disabled = true; btn.textContent = 'Saving…';
  let failed = 0;
  for (const id of ids) {
    const car = allCars.find(c => String(c.id) === id);
    const res = await authFetch(`/admin/api/cars/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCarPayload(car, { model })),
    });
    if (res.ok) car.model = model; else failed++;
  }
  if (failed) alert(`${failed} car(s) could not be saved — try again.`);
  await loadCars(true);
  vaRender();
});
