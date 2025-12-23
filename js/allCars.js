// js/allCars.js
import { showDetailsModal } from './modal.js';
import { APP_CONFIG } from './config.js';

/********************************************
 * PLACEHOLDER IMAGE (FROM CONFIG)
 ********************************************/
const PLACEHOLDER_IMG = APP_CONFIG.placeholderImage || "";

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
const PAGE_SIZE = 9;
let currentAllList = [];

/********************************************
 * INIT
 ********************************************/
export function initAll(cars){
  internalCars = cars || [];
  setupControls();
  injectVariantQuickFilter();
  populateFilterOptions();
  resetFiltersAll();
}

export function refreshAll(cars){
  internalCars = cars || [];
  populateFilterOptions();
  resetFiltersAll();
}

/********************************************
 * QUICK FILTER — UNDER FILTER BOX
 ********************************************/
function injectVariantQuickFilter() {
  if (document.querySelector(".garage-quick-filters")) return;

  const filtersPanel = document.querySelector(".filters-panel");
  if (!filtersPanel) return;

  const parent = filtersPanel.parentElement;

  let column = parent.querySelector(".filters-column");
  if (!column) {
    column = document.createElement("div");
    column.className = "filters-column";
    column.style.display = "flex";
    column.style.flexDirection = "column";
    column.style.alignItems = "stretch";

    parent.replaceChild(column, filtersPanel);
    column.appendChild(filtersPanel);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "garage-quick-filters";
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "center";
  wrapper.style.marginTop = "12px";

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

  wrapper.appendChild(badge);
  column.appendChild(wrapper);
}

/********************************************
 * VARIANT CHECK
 ********************************************/
function hasMultipleVariants(car) {
  if (!window.ALL_CARS || !car?.model) return false;
  return window.ALL_CARS.filter(c => c.model === car.model).length > 1;
}

/********************************************
 * CONTROLS
 ********************************************/
function setupControls(){
  const search = document.getElementById('searchBarALL');
  const selM   = document.getElementById('filterManufactureALL');
  const selS   = document.getElementById('filterSeriesALL');
  const selB   = document.getElementById('filterBrandALL');
  const sort   = document.getElementById('allSort');
  const reset  = document.getElementById('resetBtnALL');
  const prev   = document.getElementById('prevPage');
  const next   = document.getElementById('nextPage');

  if(search) search.addEventListener('input', ()=> { allPage = 0; applyFiltersAll(); });
  if(selM)   selM.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
  if(selS)   selS.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
  if(selB)   selB.addEventListener('change', ()=> { allPage = 0; applyFiltersAll(); });
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
  const selM = document.getElementById('filterManufactureALL');
  const selS = document.getElementById('filterSeriesALL');
  const selB = document.getElementById('filterBrandALL');
  if(!selM) return;

  while(selM.options.length > 1) selM.remove(1);
  while(selS.options.length > 1) selS.remove(1);
  while(selB.options.length > 1) selB.remove(1);

  const mvals = [...new Set(internalCars.map(c => (c.Manufacture || c.manufacture || '').trim()).filter(Boolean))].sort();
  const svals = [...new Set(internalCars.map(c => (c.series || c.Series || '').trim()).filter(Boolean))].sort();
  const bvals = [...new Set(internalCars.map(c => (c.brand || c.Brand || '').trim()).filter(Boolean))].sort();

  mvals.forEach(v => selM.insertAdjacentHTML('beforeend', `<option>${v}</option>`));
  svals.forEach(v => selS.insertAdjacentHTML('beforeend', `<option>${v}</option>`));
  bvals.forEach(v => selB.insertAdjacentHTML('beforeend', `<option>${v}</option>`));
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

  /* ✅ NO RESULTS STATE */
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
    card.className = 'card';

    const realImg = Array.isArray(car.images) && car.images.length ? car.images[0] : '';
    const cached = loadedImageCache.has(realImg);
    const initialSrc = cached ? realImg : PLACEHOLDER_IMG;

    card.innerHTML = `
      <img src="${initialSrc}">
      <div class="card-title">${escapeHtml(car.name)}</div>
    `;

    const img = card.querySelector("img");

    if (realImg && !cached) {
      const preload = new Image();
      preload.src = realImg;
      preload.onload = () => {
        loadedImageCache.add(realImg);
        img.src = realImg;
        img.classList.add("img-loaded");
      };
    } else {
      img.classList.add("img-loaded");
    }

    card.onclick = () => showDetailsModal(car);
    container.appendChild(card);
  });

  currentAllList = arr;
  updatePaginationSummary(start + 1, start + pageItems.length, arr.length);
}

/********************************************
 * NO RESULTS RENDER (CSS-DRIVEN)
 ********************************************/
function renderNoResults(container){
  container.classList.add("nores-container");

  container.innerHTML = `
    <div class="nores-center">
      <div class="nores-wrapper">

        <img src="images/noresulticon-light.png"
             class="nores-icon nores-light"
             alt="No results">

        <img src="images/noresulticon-dark.png"
             class="nores-icon nores-dark"
             alt="No results">

        <h2 class="nores-title">No Cars Found</h2>
        <p class="nores-text">
          Try adjusting your filters or search terms
        </p>

      </div>
    </div>
  `;
}

/********************************************
 * APPLY FILTERS
 ********************************************/
function applyFiltersAll(){
  const q = (document.getElementById('searchBarALL')?.value || '').toLowerCase().trim();
  const m = (document.getElementById('filterManufactureALL')?.value || '').trim();
  const s = (document.getElementById('filterSeriesALL')?.value || '').trim();
  const b = (document.getElementById('filterBrandALL')?.value || '').trim();

  const result = internalCars.filter(car => {
    const nameMatch = (car.name || '').toLowerCase().includes(q);
    const manufactureMatch = !m || (car.Manufacture || car.manufacture || '').trim() === m;
    const seriesMatch = !s || (car.series || car.Series || '').trim() === s;
    const brandMatch = !b || (car.brand || car.Brand || '').trim() === b;
    const variantMatch = !filterVariantsOnly || hasMultipleVariants(car);
    return nameMatch && manufactureMatch && seriesMatch && brandMatch && variantMatch;
  });

  allPage = 0;
  renderAllCarsList(result);
}

/********************************************
 * RESET
 ********************************************/
function resetFiltersAll(){
  ['searchBarALL','filterManufactureALL','filterSeriesALL','filterBrandALL']
    .forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });

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
  return s ? s.replace(/&/g,"&amp;").replace(/</g,"&lt;") : '';
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
