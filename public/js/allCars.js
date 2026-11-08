// js/allCars.js
import { showDetailsModal } from './modal.js?v=13';
import { realCarImage, fallbackCarImage, thumbOf } from './carImage.js?v=3';

/********************************************
 * IMAGE LOAD CACHE (SESSION ONLY)
 ********************************************/
const loadedImageCache = new Set();

/********************************************
 * QUICK FILTER STATE
 ********************************************/
let filterVariantsOnly = false;

let internalCars = [];
let allPage = 0;
let PAGE_SIZE = 15;

if (window.innerWidth <= 800) {
  PAGE_SIZE = 10;
}

let _resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    PAGE_SIZE = window.innerWidth <= 800 ? 10 : 15;
  }, 150);
}, { passive: true });

let currentAllList = [];

/********************************************
 * INIT
 ********************************************/
export function initAll(cars){
  internalCars = cars || [];
  buildModelCounts();
  setupControls();
  injectVariantQuickFilter();
  populateFilterOptions();
  resetFiltersAll();
  setupMobileFilterSheet();
  setupRandomCar();
}

export function refreshAll(cars){
  internalCars = cars || [];
  buildModelCounts();
  populateFilterOptions();
  resetFiltersAll();
}

/********************************************
 * QUICK FILTER — UNDER FILTER BOX
 ********************************************/
function injectVariantQuickFilter() {
  if (document.querySelector(".quick-filter-badge")) return;

  const stack = document.querySelector(".filters-stack");
  if (!stack) return;

  const badge = document.createElement("span");
  badge.className = "tag quick-filter-badge";
  badge.textContent = "🔁 Multiple Variants";
  badge.style.cursor = "pointer";

  badge.onclick = () => {
    filterVariantsOnly = !filterVariantsOnly;
    badge.classList.toggle("active", filterVariantsOnly);
    badge.style.background = filterVariantsOnly ? "var(--accent)" : "";
    badge.style.color = filterVariantsOnly ? "#fff" : "";
    allPage = 0;
    applyFiltersAll();
  };

  stack.appendChild(badge);
}

/********************************************
 * VARIANT CHECK
 ********************************************/
let modelCounts = new Map();

function buildModelCounts() {
  modelCounts = new Map();
  for (const c of internalCars) {
    if (c.model) modelCounts.set(c.model, (modelCounts.get(c.model) || 0) + 1);
  }
}

function hasMultipleVariants(car) {
  return !!car?.model && (modelCounts.get(car.model) || 0) > 1;
}

/********************************************
 * CONTROLS
 ********************************************/
function setupControls(){
  const search = document.getElementById('searchBarALL');
  const selM   = document.getElementById('filterManufactureALL');
  const selS   = document.getElementById('filterSeriesALL');
  const selB   = document.getElementById('filterBrandALL');
  const selSet = document.getElementById('filterSetALL');
  const selSt  = document.getElementById('filterStatusALL');
  const sort   = document.getElementById('allSort');
  const reset  = document.getElementById('resetBtnALL');
  const prev   = document.getElementById('prevPage');
  const next   = document.getElementById('nextPage');

  let searchTimer;
  if(search) search.addEventListener('input', ()=> {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(()=> { allPage = 0; applyFiltersAll(); }, 120);
  });
  if(selM)   selM.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
  if(selS)   selS.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
  if(selB)   selB.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
  if(selSet) selSet.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
  if(selSt)  selSt.addEventListener('change',  ()=> { allPage = 0; applyFiltersAll(); });
  if(sort)   sort.addEventListener('change', ()=> { allPage = 0; renderAllCars(); });
  if(reset)  reset.addEventListener('click', resetFiltersAll);

  if(prev) prev.addEventListener('click', ()=> {
    if(allPage > 0){ allPage--; renderAllCars(); }
  });

  if(next) next.addEventListener('click', ()=> {
    const total = currentAllList.length || internalCars.length;
    if((allPage + 1) * PAGE_SIZE < total){ allPage++; renderAllCars(); }
  });
}

/********************************************
 * FILTER OPTIONS
 ********************************************/
function populateFilterOptions(){
  const selM   = document.getElementById('filterManufactureALL');
  const selS   = document.getElementById('filterSeriesALL');
  const selB   = document.getElementById('filterBrandALL');
  const selSet = document.getElementById('filterSetALL');
  if(!selM) return;

  while(selM.options.length > 1)   selM.remove(1);
  while(selS.options.length > 1)   selS.remove(1);
  while(selB.options.length > 1)   selB.remove(1);
  if(selSet) while(selSet.options.length > 1) selSet.remove(1);

  const mvals   = [...new Set(internalCars.map(c => (c.Manufacture || c.manufacture || '').trim()).filter(Boolean))].sort();
  const svals   = [...new Set(internalCars.map(c => (c.series || c.Series || '').trim()).filter(Boolean))].sort();
  const bvals   = [...new Set(internalCars.map(c => (c.brand || c.Brand || '').trim()).filter(Boolean))].sort();
  const setvals = [...new Set(internalCars.map(c => (c.setName || '').trim()).filter(Boolean))].sort();

  mvals.forEach(v => selM.add(new Option(v)));
  svals.forEach(v => selS.add(new Option(v)));
  bvals.forEach(v => selB.add(new Option(v)));
  if(selSet) setvals.forEach(v => selSet.add(new Option(v)));
}

/********************************************
 * RENDER
 ********************************************/
function renderAllCars(){
  const list = currentAllList.length ? currentAllList : internalCars;
  renderAllCarsList(list);
}

function renderAllCarsList(list){
  const container = document.getElementById('allCarsContainer');

  container.classList.remove("nores-container");
  container.innerHTML = '';

  if (!list || list.length === 0) {
    renderNoResults(container);
    updatePaginationSummary(0, 0, 0);
    currentAllList = [];
    return;
  }

  const sortVal = document.getElementById('allSort')?.value || 'serial_desc';
  const arr = [...list];

  if(sortVal === 'name_asc')
    arr.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
  else if(sortVal === 'serial_asc')
    arr.sort((a,b)=> getSerialValue(a) - getSerialValue(b));
  else
    arr.sort((a,b)=> getSerialValue(b) - getSerialValue(a));

  const start = allPage * PAGE_SIZE;
  const pageItems = arr.slice(start, start + PAGE_SIZE);

  pageItems.forEach(car => {
    const card = document.createElement('div');
    card.className = 'gc-card';

    const fullImg = realCarImage(car);
    const realImg = thumbOf(fullImg);   // grid shows the 480px thumbnail
    const fallback = fallbackCarImage(car);
    const cached = realImg && loadedImageCache.has(realImg);
    const initialSrc = realImg ? (cached ? realImg : '') : fallback;
    const initialLoaded = !realImg || cached;
    const dimmed = !realImg && car.isIncoming;

    card.innerHTML = `
      <div class="gc-img-wrap">
        <img class="gc-img car-img${initialLoaded ? ' img-loaded' : ''}" src="${escapeHtml(initialSrc)}" data-fallback="${fallback}" alt="${escapeHtml(car.name)}" decoding="async"${dimmed ? ' style="opacity:0.75"' : ''}>
        ${car.isIncoming ? `<div class="gc-coming-soon-pill">Coming Soon</div>` : ''}
        ${car.isWishlist && !car.isIncoming ? `<div class="gc-coming-soon-pill" style="background:rgba(167,139,250,.85);color:#fff">🔖 Wanted</div>` : ''}
        <div class="gc-overlay"><div class="gc-name">${escapeHtml(car.name)}</div></div>
      </div>
    `;

    if (realImg && !cached) {
      const img = card.querySelector('.gc-img');
      const preload = new Image();
      preload.decoding = 'async';
      preload.onload = () => {
        loadedImageCache.add(realImg);
        img.src = realImg;
        img.classList.add('img-loaded');
      };
      preload.onerror = () => {
        // No thumbnail yet → full photo → placeholder
        const full = new Image();
        full.onload = () => { img.src = fullImg; img.classList.add('img-loaded'); };
        full.onerror = () => { img.src = fallback; img.classList.add('img-loaded'); };
        full.src = fullImg;
      };
      preload.src = realImg;
    }

    card.onclick = () => showDetailsModal(car);
    container.appendChild(card);
  });

  currentAllList = arr;
  updatePaginationSummary(start + 1, start + pageItems.length, arr.length);
}

/********************************************
 * NO RESULTS RENDER
 ********************************************/
function renderNoResults(container){
  container.classList.add("nores-container");

  container.innerHTML = `
    <div class="nores-center">
      <div class="nores-wrapper">
        <img src="images/noresulticon-light.png" class="nores-icon nores-light">
        <img src="images/noresulticon-dark.png" class="nores-icon nores-dark">
        <h2 class="nores-title">No Cars Found</h2>
        <p class="nores-text">Try adjusting your filters or search terms</p>
      </div>
    </div>
  `;
}

/********************************************
 * MOBILE FILTER SHEET
 ********************************************/
function setupRandomCar() {
  document.getElementById('randomCarBtn')?.addEventListener('click', () => {
    if (!internalCars.length) return;
    const car = internalCars[Math.floor(Math.random() * internalCars.length)];
    showDetailsModal(car);
  });
}

function setupMobileFilterSheet() {
  const pill    = document.getElementById('mobileFilterPill');
  const overlay = document.getElementById('filterSheetOverlay');
  if (!pill || !overlay) return;

  const close = () => document.body.classList.remove('mobile-filter-open');

  pill.addEventListener('click', () => document.body.classList.toggle('mobile-filter-open'));
  overlay.addEventListener('click', close);
  document.getElementById('filterSheetClose')?.addEventListener('click', close);
  document.getElementById('filterSheetApply')?.addEventListener('click', close);
  document.getElementById('resetBtnALL')?.addEventListener('click', () => setTimeout(close, 120));
}

function updateFilterBadge() {
  const badge = document.getElementById('filterCountBadge');
  if (!badge) return;
  const count = [
    document.getElementById('filterManufactureALL')?.value,
    document.getElementById('filterBrandALL')?.value,
    document.getElementById('filterSeriesALL')?.value,
    document.getElementById('filterSetALL')?.value,
  ].filter(Boolean).length + (filterVariantsOnly ? 1 : 0);

  badge.textContent = count || '';
  badge.classList.toggle('visible', count > 0);
}

/********************************************
 * APPLY FILTERS
 ********************************************/
function applyFiltersAll(){
  const q   = (document.getElementById('searchBarALL')?.value || '').toLowerCase().trim();
  const m   = (document.getElementById('filterManufactureALL')?.value || '').trim();
  const s   = (document.getElementById('filterSeriesALL')?.value || '').trim();
  const b   = (document.getElementById('filterBrandALL')?.value || '').trim();
  const set = (document.getElementById('filterSetALL')?.value || '').trim();

  const statusFilter = (document.getElementById('filterStatusALL')?.value || '').trim();

  const result = internalCars.filter(car => {
    const nameMatch = !q || (car.name || '').toLowerCase().includes(q) ||
      (car.brand || '').toLowerCase().includes(q) ||
      (car.serial || '').toLowerCase().includes(q);
    const manufactureMatch = !m || (car.Manufacture || car.manufacture || '').trim() === m;
    const seriesMatch = !s || (car.series || car.Series || '').trim() === s;
    const brandMatch = !b || (car.brand || car.Brand || '').trim() === b;
    const setMatch = !set || (car.setName || '').trim() === set;
    const variantMatch = !filterVariantsOnly || hasMultipleVariants(car);
    if (statusFilter === 'owned'    && (car.isIncoming || car.isWishlist)) return false;
    if (statusFilter === 'incoming' && !car.isIncoming) return false;
    if (statusFilter === 'wishlist' && !car.isWishlist) return false;
    return nameMatch && manufactureMatch && seriesMatch && brandMatch && setMatch && variantMatch;
  });

  allPage = 0;
  renderAllCarsList(result);
  updateFilterBadge();
}

/********************************************
 * RESET
 ********************************************/
function resetFiltersAll(){
  ['searchBarALL','filterManufactureALL','filterSeriesALL','filterBrandALL','filterSetALL','filterStatusALL']
    .forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });

  // ✅ ONLY CHANGE — FORCE DEFAULT SORT TO ASC
  const sort = document.getElementById('allSort');
  if (sort) sort.value = 'serial_desc';

  filterVariantsOnly = false;

  const badge = document.querySelector(".quick-filter-badge");
  if (badge) {
    badge.classList.remove("active");
    badge.style.background = "";
    badge.style.color = "";
  }

  allPage = 0;
  currentAllList = [];
  renderAllCars();
  updateFilterBadge();
}

/********************************************
 * PAGINATION SUMMARY
 ********************************************/
function updatePaginationSummary(start, end, total){
  const summary = document.getElementById('paginationSummary');
  if(!summary) return;
  if(total === 0){
    summary.textContent = "No cars found";
    return;
  }
  summary.textContent = `${start}–${end} of ${total}`;
}

/********************************************
 * HELPERS
 ********************************************/
function escapeHtml(s){
  return s ? String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : '';
}

function getSerialValue(car){
  if(!car) return Number.POSITIVE_INFINITY;
  const keys = ['serial','Serial','serialNumber','SerialNumber'];
  for(const k of keys){
    if(car[k]){
      const n = parseInt(String(car[k]).replace(/[^\d]/g,''),10);
      if(!isNaN(n)) return n;
    }
  }
  return Number.POSITIVE_INFINITY;
}
