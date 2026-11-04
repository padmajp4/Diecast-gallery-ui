// js/app.js

import { initTheme } from './theme.js';
import { initModal, showDetailsModal } from './modal.js?v=12';
import { renderHome, renderAboutBrands } from './home.js?v=10';
import { initAll, refreshAll } from './allCars.js?v=10';
import { initExchange } from './exchange.js?v=7';
import { renderBrandsHub, renderBrandPage } from './brands.js?v=15';
import { renderSetsHub, renderSetPage, bustSetLogosCache } from './sets.js?v=7';
import { carThumbAttrs, installCarImageFallback } from './carImage.js?v=3';
import { APP_CONFIG } from './config.js';

installCarImageFallback();

/* ============================================
   ROUTES (URL ↔ VIEW)
============================================ */
const ROUTES = {
  "/": "home",
  "/garage": "all",
  "/brands": "brands",
  "/sets": "sets",
  "/exchange": "exchange",
  "/history": "about",
  "/about": "aboutme"
};

const VIEW_TO_PATH = Object.fromEntries(
  Object.entries(ROUTES).map(([path, view]) => [view, path])
);

let cars = [];

/* ============================================
   LOAD FROM D1 via /api/cars
============================================ */
/* The Worker API when it's deployed; otherwise (static hosting / local demo)
   the bundled sample data, so the site still renders. */
async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function fetchCars() {
  try {
    let rawCars;
    try {
      rawCars = await loadJson(APP_CONFIG.dataUrl || "/api/cars");
    } catch (err) {
      if (!APP_CONFIG.sampleDataUrl) throw err;
      console.info("API not available — showing sample data from", APP_CONFIG.sampleDataUrl);
      rawCars = await loadJson(APP_CONFIG.sampleDataUrl);
      window.DIECAST_DEMO = true;   // sets / car-info skip their API calls
    }

    /* images already parsed as array by the Worker, but normalise just in case */
    cars = rawCars.map(car => {
      if (typeof car.images === "string") {
        car.images = car.images
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);
      }
      if (!Array.isArray(car.images)) car.images = [];
      return car;
    });

    // Sort by serial — numeric CW-NNN first (desc), then alpha strings, then no-serial last
    cars.sort((a, b) => {
      const sa = getSerialValue(a);
      const sb = getSerialValue(b);
      const saInf = sa === Number.POSITIVE_INFINITY;
      const sbInf = sb === Number.POSITIVE_INFINITY;
      if (saInf && sbInf) return 0;
      if (saInf) return 1;
      if (sbInf) return -1;
      const saNum = typeof sa === 'number' && isFinite(sa);
      const sbNum = typeof sb === 'number' && isFinite(sb);
      if (saNum && sbNum) return sb - sa;
      if (saNum && !sbNum) return -1;
      if (!saNum && sbNum) return 1;
      return String(sb).localeCompare(String(sa));
    });

  } catch (err) {
    console.error("Error loading cars.json:", err);
  }
}

/* ============================================
   SERIAL PARSER
============================================ */
function getSerialValue(car) {
  if (!car) return Number.POSITIVE_INFINITY;

  const keys = ['serial','Serial','serialNumber','SerialNumber'];

  for (const k of keys) {
    if (car[k]) {
      const raw = String(car[k]).trim();
      const n = parseInt(raw.replace(/[^\d\-]/g, ''), 10);
      if (!isNaN(n)) return n;
      return raw;
    }
  }

  return Number.POSITIVE_INFINITY;
}

/* ============================================
   VIEW SWITCHING (WITH URL)
============================================ */
function showView(view, push = true) {
  document.querySelectorAll('.menu-item').forEach(it =>
    it.classList.toggle('active', it.dataset.view === view)
  );

  document.querySelectorAll('.view').forEach(s =>
    s.style.display = 'none'
  );

  const el = document.getElementById(`view-${view}`);
  if (el) el.style.display = 'block';

  // Close mobile filter sheet when navigating away from garage
  document.body.classList.remove('mobile-filter-open');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'about') renderAboutBrands();
  if (view === 'brands') renderBrandsHub(cars);
  if (view === 'sets') renderSetsHub(cars); // async, fire-and-forget is fine

  if (push) {
    const path = VIEW_TO_PATH[view] || "/";
    history.pushState({ view }, "", path);
  }
}

/* ============================================
   SIDEBAR NAVIGATION
============================================ */
function setupNavigation() {
  document.getElementById('menu-home')
    .addEventListener('click', () => showView('home'));

  document.getElementById('menu-all')
    .addEventListener('click', () => showView('all'));

  document.getElementById('menu-brands')
    .addEventListener('click', () => showView('brands'));

  document.getElementById('menu-sets')
    .addEventListener('click', () => showView('sets'));

  document.getElementById('menu-exchange')
    ?.addEventListener('click', () => showView('exchange'));

  document.getElementById('menu-about')
    .addEventListener('click', () => showView('about'));

  document.getElementById('menu-aboutme')
    .addEventListener('click', () => showView('aboutme'));
}

/* ============================================
   LOAD VIEW FROM URL (ON REFRESH / SHARE)
============================================ */
function loadFromURL() {
  const path = window.location.pathname;
  const brandMatch = path.match(/^\/brands\/(.+)$/);
  if (brandMatch) {
    showView('brands', false);
    renderBrandPage(cars, decodeURIComponent(brandMatch[1]));
    return;
  }
  const setMatch = path.match(/^\/sets\/(.+)$/);
  if (setMatch) {
    showView('sets', false);
    renderSetPage(cars, decodeURIComponent(setMatch[1]));
    return;
  }
  const view = ROUTES[path] || "home";
  showView(view, false);
}

window.addEventListener("popstate", e => {
  const brandMatch = location.pathname.match(/^\/brands\/(.+)$/);
  if (brandMatch) {
    showView('brands', false);
    renderBrandPage(cars, decodeURIComponent(brandMatch[1]));
    return;
  }
  const setMatch = location.pathname.match(/^\/sets\/(.+)$/);
  if (setMatch) {
    showView('sets', false);
    renderSetPage(cars, decodeURIComponent(setMatch[1]));
    return;
  }
  const view = e.state?.view || ROUTES[location.pathname] || "home";
  showView(view, false);
});

/* ============================================
   MAIN BOOTSTRAP
============================================ */
async function boot() {
  initTheme();
  initModal();
  setupNavigation();

  await fetchCars();

  // ⭐ MAKE ALL CARS GLOBAL
  window.ALL_CARS = cars;

  renderHome(cars);

  /* 🔥 Lighthouse paint fix — makes FCP/LCP valid */
requestAnimationFrame(() => {
  document.body.classList.remove("loading");
  document.getElementById("app-skeleton")?.remove();
  document.getElementById("sidebar-skeleton")?.remove();
});

  initAll(cars);
  initExchange(cars);

  window.appRefresh = async () => {
    await fetchCars();
    window.ALL_CARS = cars;
    renderHome(cars);
    refreshAll(cars);
    initExchange(cars);
    renderBrandsHub(cars);
    bustSetLogosCache();
    renderSetsHub(cars);
  };

  loadFromURL();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ============================================
     AUTO OPEN CAR PAGE FROM SHARE LINK
  ============================================ */
  const params = new URLSearchParams(location.search);
  const carNameParam = params.get("car");

  if (carNameParam) {
    const decoded = decodeURIComponent(carNameParam).trim().toLowerCase();
    const found = cars.find(c =>
      (c.name || "").trim().toLowerCase() === decoded
    );

    if (found) {
      showView('all', false);
      setTimeout(() => showDetailsModal(found), 300);
    }
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Allow modal to be opened globally
window.showDetails = (car) => showDetailsModal(car);

/* ── ⌘K Global Search ── */
(function initCmdK() {
  const overlay = document.getElementById('cmdkOverlay');
  const input   = document.getElementById('cmdkInput');
  const results = document.getElementById('cmdkResults');
  if (!overlay) return;

  function open() {
    overlay.style.display = 'flex';
    input.value = '';
    results.innerHTML = '';
    input.focus();
  }
  function close() { overlay.style.display = 'none'; }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
    if (e.key === 'Escape') close();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }

    const hits = (window.ALL_CARS || []).filter(c =>
      (c.name   || '').toLowerCase().includes(q) ||
      (c.brand  || '').toLowerCase().includes(q) ||
      (c.serial || '').toLowerCase().includes(q) ||
      (c.setName|| '').toLowerCase().includes(q) ||
      (c.series || '').toLowerCase().includes(q) ||
      (c.Manufacture || '').toLowerCase().includes(q)
    ).slice(0, 12);

    if (!hits.length) {
      results.innerHTML = `<div style="padding:20px;text-align:center;color:#666;font-size:.88rem">No results</div>`;
      return;
    }

    results.innerHTML = hits.map(car => {
      const sub = [car.brand, car.series, car.serial].filter(Boolean).join(' · ');
      return `<div class="cmdk-row" data-car-id="${car.id}">
        <img ${carThumbAttrs(car)} class="cmdk-thumb car-img" loading="lazy" decoding="async">
        <div class="cmdk-info">
          <div class="cmdk-name">${escapeHtml(car.name)}</div>
          <div class="cmdk-sub">${escapeHtml(sub)}</div>
        </div>
        ${car.isIncoming ? `<span class="cmdk-badge">Incoming</span>` : ''}
      </div>`;
    }).join('');

    results.querySelectorAll('.cmdk-row').forEach(row => {
      row.addEventListener('click', () => {
        const car = (window.ALL_CARS || []).find(c => String(c.id) === String(row.dataset.carId));
        if (!car) return;
        close();
        showDetailsModal(car);
      });
    });
  });
})();

boot();

/********************************************
 * MOBILE DOCK SYNC
 ********************************************/
function syncDockIcons() {
  document.querySelectorAll(".mobile-dock img").forEach(img => {
    img.src = document.body.classList.contains("dark")
      ? img.dataset.dark
      : img.dataset.light;
  });
}
syncDockIcons();

window.addEventListener("themeChanged", syncDockIcons);

document.querySelectorAll(".dock-item").forEach(d => {
  d.addEventListener("click", () => {
    document.querySelectorAll(".dock-item").forEach(x=>x.classList.remove("active"));
    d.classList.add("active");

    const menu = document.getElementById(d.dataset.menu);
    if (menu) menu.click();
  });
});

const fab = document.getElementById("mobileThemeFab");
if (fab) fab.onclick = () => document.getElementById("themeToggle")?.click();
