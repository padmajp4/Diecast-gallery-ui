// js/app.js

import { initTheme } from './theme.js';
import { initModal, showDetailsModal } from './modal.js';
import { renderHome, renderAboutBrands } from './home.js';
import { initAll, refreshAll } from './allCars.js';
import { initExchange } from './exchange.js';
import { APP_CONFIG } from './config.js';

/* ============================================
   ROUTES (URL ↔ VIEW)
============================================ */
const ROUTES = {
  "/": "home",
  "/garage": "all",
  "/exchange": "exchange",
  "/history": "about",
  "/about": "aboutme"
};

const VIEW_TO_PATH = Object.fromEntries(
  Object.entries(ROUTES).map(([path, view]) => [view, path])
);

let cars = [];

/* ============================================
   LOAD CARS DATA (FROM CONFIG)
============================================ */
async function fetchCars() {
  const url = APP_CONFIG.DATA_SOURCE_URL;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);

    let rawCars = await response.json();

    /* FORMAT "url1, url2" → ["url1","url2"] */
    cars = rawCars.map(car => {
      if (typeof car.images === "string") {
        car.images = car.images
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);
      }
      return car;
    });

    // Sort by serial (desc)
    cars.sort((a, b) => {
      const sa = getSerialValue(a);
      const sb = getSerialValue(b);

      const saNum = typeof sa === "number" && isFinite(sa);
      const sbNum = typeof sb === "number" && isFinite(sb);

      if (saNum && sbNum) return sb - sa;
      if (saNum && !sbNum) return -1;
      if (!saNum && sbNum) return 1;

      return String(sb).localeCompare(String(sa));
    });

  } catch (err) {
    console.error("Error loading cars data:", err);
  }
}

/* ============================================
   SERIAL PARSER
============================================ */
function getSerialValue(car) {
  if (!car) return Number.POSITIVE_INFINITY;

  const keys = ["serial", "Serial", "serialNumber", "SerialNumber"];

  for (const k of keys) {
    if (car[k]) {
      const raw = String(car[k]).trim();
      const n = parseInt(raw.replace(/[^\d\-]/g, ""), 10);
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
  document.querySelectorAll(".menu-item").forEach(it =>
    it.classList.toggle("active", it.dataset.view === view)
  );

  document.querySelectorAll(".view").forEach(s =>
    s.style.display = "none"
  );

  const el = document.getElementById(`view-${view}`);
  if (el) el.style.display = "block";

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (view === "about") renderAboutBrands();

  if (push) {
    const path = VIEW_TO_PATH[view] || "/";
    history.pushState({ view }, "", path);
  }
}

/* ============================================
   SIDEBAR NAVIGATION
============================================ */
function setupNavigation() {
  document.getElementById("menu-home")
    ?.addEventListener("click", () => showView("home"));

  document.getElementById("menu-all")
    ?.addEventListener("click", () => showView("all"));

  document.getElementById("menu-exchange")
    ?.addEventListener("click", () => showView("exchange"));

  document.getElementById("menu-about")
    ?.addEventListener("click", () => showView("about"));

  document.getElementById("menu-aboutme")
    ?.addEventListener("click", () => showView("aboutme"));
}

/* ============================================
   LOAD VIEW FROM URL (REFRESH / SHARE)
============================================ */
function loadFromURL() {
  const path = window.location.pathname;
  const view = ROUTES[path] || "home";
  showView(view, false);
}

window.addEventListener("popstate", e => {
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

  // Make cars globally accessible
  window.ALL_CARS = cars;

  renderHome(cars);
  initAll(cars);
  initExchange(cars);

  window.appRefresh = async () => {
    await fetchCars();
    window.ALL_CARS = cars;
    renderHome(cars);
    refreshAll(cars);
    initExchange(cars);
  };

  loadFromURL();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ============================================
     AUTO OPEN CAR FROM SHARE LINK (?car=)
  ============================================ */
  const params = new URLSearchParams(location.search);
  const carNameParam = params.get("car");

  if (carNameParam) {
    const decoded = decodeURIComponent(carNameParam).trim().toLowerCase();
    const found = cars.find(
      c => (c.name || "").trim().toLowerCase() === decoded
    );

    if (found) {
      showView("all", false);
      setTimeout(() => showDetailsModal(found), 300);
    }
  }
}

// Allow modal to be opened globally
window.showDetails = car => showDetailsModal(car);

boot();
