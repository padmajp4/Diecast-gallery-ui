import { showDetailsModal } from './modal.js?v=12';
import { APP_CONFIG } from './config.js';
import { carImageSrc, carThumbAttrs } from './carImage.js?v=3';


/********************************************
 * BRAND LOGOS
 ********************************************/
const BRAND_LOGOS = {
  "Hot Wheels": "brands/hotwheels.png",
  "Matchbox": "brands/matchbox.png",
  "Majorette": "brands/majorette.png",
  "Tomica": "brands/tomica.png",
  "Maisto": "brands/maisto.png",
  "Greenlight": "brands/greenlight.png",
  "Jada": "brands/jada.png",
  "Welly": "brands/welly.png",
  "Kinsmart": "brands/kinsmart.png",
  "CCA": "brands/cca.png",
  "Burago": "brands/burago.png",
  "MiniGT": "brands/mini-gt.png" ,
  "default": "brands/default.png"
};

let hofCars = [];
let hofIndex = 0;
let hofTimer = null;

/********************************************
 * VIEWPORT HELPER
 ********************************************/
function isMobile() {
  return typeof window !== "undefined" && window.innerWidth <= 800;
}

/********************************************
 * FEATURED CHECK
 ********************************************/
function isFeatured(car) {
  return (
    car.featured === true ||
    car.Featured === true ||
    car.isFeatured === true ||
    car.featured === "true" ||
    car.Featured === "true" ||
    car.isFeatured === "true"
  );
}

/********************************************
 * TREASURE HUNT CHECK
 ********************************************/
function isTH(car) {
  return (
    car.isTreasurehunt === true ||
    car.isTreasurehunt === "true" ||
    car.isTreasurehunt === 1
  );
}

/********************************************
 * MAIN HOME RENDERER
 ********************************************/
export function renderHome(cars) {
  const home = document.getElementById('view-home');
  if (!home) return;

  const list = Array.isArray(cars) ? cars : [];

  if (!list.length) {
    home.innerHTML = `
      <div class="home-empty">
        <p>No items found yet. Add from Admin 🚗</p>
      </div>
    `;
    return;
  }

  const incomingCars = list.filter(c => c.isIncoming);
  const wishlistCars = list.filter(c => c.isWishlist && !c.isIncoming);
  const owned = list.filter(c => !c.isIncoming && !c.isWishlist);
  const featured = owned.filter(c => isFeatured(c));
  const featuredLimit = APP_CONFIG.featuredLimit || 3;
  hofCars = featured.length >= featuredLimit ? featured.slice(0, featuredLimit) :
    [...featured, ...owned.filter(c => !isFeatured(c) && !isTH(c)).slice(0, featuredLimit - featured.length)];

  hofIndex = 0;
  const heroCar = hofCars[0];

  const totalCars = owned.reduce((s, c) => s + (c.ownership?.quantity || 1), 0);
  const manufacturers = new Set(owned.map(c => (c.Manufacture || c.manufacture || '').trim()).filter(Boolean));
  const seriesSet = new Set(owned.map(c => (c.series || c.Series || '').trim()).filter(Boolean));
  const brandsSet = new Set(owned.map(c => (c.brand || c.Brand || '').trim()).filter(Boolean));
  const thCars = owned.filter(c => isTH(c));
  const thCount = thCars.length;

  const brandCounts = {};
  owned.forEach(c => {
    const key = (c.brand || c.Brand || 'Unknown').trim() || 'Unknown';
    brandCounts[key] = (brandCounts[key] || 0) + 1;
  });

  const topBrands = Object.entries(brandCounts).sort((a,b)=>b[1]-a[1]).slice(0, APP_CONFIG.topBrandsLimit || 5);
  const recentCars = [...owned]
  .sort((a, b) => {
    const aNum = parseInt((a.serial || a.Serial || "").replace(/\D/g, ""), 10) || 0;
    const bNum = parseInt((b.serial || b.Serial || "").replace(/\D/g, ""), 10) || 0;
    return bNum - aNum;
  })
  .slice(0, APP_CONFIG.recentCount || 3);


  home.innerHTML = `
    <div class="home-layout">

      ${APP_CONFIG.showHero ? `
      <section class="home-hero glass-panel hero-fade-container" id="homeHero">
        ${buildHeroShell()}
      </section>
      ` : ""}

      ${APP_CONFIG.showStats ? `
      <section class="home-stats-row">
        <div class="home-stat-card glass-panel stat-link"><div class="home-stat-label">Total Models</div><div class="home-stat-value">${totalCars}</div></div>
        <div class="home-stat-card glass-panel stat-link"><div class="home-stat-label">Brands</div><div class="home-stat-value">${manufacturers.size}</div></div>
        <div class="home-stat-card glass-panel stat-link"><div class="home-stat-label">Series</div><div class="home-stat-value">${seriesSet.size}</div></div>
        <div class="home-stat-card glass-panel stat-link"><div class="home-stat-label">Treasure Hunts</div><div class="home-stat-value">${thCount}</div></div>
      </section>` : ""}

      ${APP_CONFIG.showTopBrands ? `
      <section class="home-brands glass-panel">
        <div class="home-section-header"><h3>Top Brands</h3><span class="home-section-sub">${brandsSet.size} brands in total</span></div>
        <div class="home-brands-list">${topBrands.map(([b,c])=>`<div class="home-brand-item" data-brand="${escapeHtml(b)}" title="View all ${escapeHtml(b)} cars"><img class="brand-logo" src="${BRAND_LOGOS[b]||BRAND_LOGOS.default}" loading="lazy" decoding="async"><span class="home-brand-count">${c}</span></div>`).join('')}</div>
      </section>` : ""}

      ${APP_CONFIG.showTreasureHunts !== false ? `<section class="home-treasure glass-panel"><div class="home-section-header"><h3>Treasure Hunts 🔥</h3><span class="home-section-sub">Special finds from the collection</span></div><div id="treasureHuntSection" class="th-scroll"></div></section>` : ""}
      ${APP_CONFIG.showRecent ? `<section class="home-recent glass-panel"><div class="home-section-header"><h3>Recently Added</h3><span class="home-section-sub">Latest from my collection</span></div><div class="home-recent-grid">${recentCars.map(car=>`<div class="card home-recent-card"><div class="home-recent-image-wrap"><img class="car-img" ${thumbAttrs(car)} loading="lazy" decoding="async">${isTH(car)?`<img src="images/th.png" class="th-logo" loading="lazy" decoding="async">`:''}</div><div class="card-title">${escapeHtml(car.name||'')}</div></div>`).join('')}</div></section>`:""}
      ${APP_CONFIG.showTopGifters ? `<section class="home-gifters glass-panel"><div class="home-section-header"><h3>Top Gifters 🎁 </h3><span class="home-section-sub">Based on cars gifted</span></div><div id="gifters-grid" class="gifters-grid"></div></section>` : ""}
      ${APP_CONFIG.showSeriesTracker ? `<section class="home-series glass-panel"><div class="home-section-header"><h3>Series Collection</h3><span class="home-section-sub">${seriesSet.size} series tracked</span></div><div id="seriesTrackerGrid" class="series-tracker-grid"></div></section>` : ""}

      ${buildOnThisDay(owned)}

      ${wishlistCars.length > 0 ? `
      <section class="home-upcoming glass-panel">
        <div class="home-section-header">
          <h3>Wishlist 🔖 <span class="upcoming-badge" style="background:rgba(167,139,250,.15);color:#a78bfa;border-color:rgba(167,139,250,.3)">${wishlistCars.length}</span></h3>
          <span class="home-section-sub">Cars I'm hunting for</span>
        </div>
        <div class="upcoming-grid">
          ${wishlistCars.map(car => `
            <div class="upcoming-card" data-car-id="${car.id}" style="cursor:pointer">
              <div class="upcoming-img-wrap">
                <img class="car-img" ${thumbAttrs(car)}
                     loading="lazy" decoding="async" alt="${escapeHtml(car.name || '')}">
                <div class="upcoming-overlay">
                  <span class="upcoming-pill" style="background:rgba(167,139,250,.85);color:#fff">🔖 Wanted</span>
                </div>
              </div>
              <div class="upcoming-info">
                <div class="upcoming-name">${escapeHtml(car.name || 'Unnamed')}</div>
                ${car.brand ? `<div class="upcoming-meta">${escapeHtml(car.brand)}${car.Manufacture ? ' · ' + escapeHtml(car.Manufacture) : ''}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </section>` : ''}

      ${incomingCars.length > 0 ? `
      <section class="home-upcoming glass-panel">
        <div class="home-section-header">
          <h3>Incoming Collection <span class="upcoming-badge">${incomingCars.length}</span></h3>
          <span class="home-section-sub">On the way — not in hand yet</span>
        </div>
        <div class="upcoming-grid">
          ${incomingCars.map(car => `
            <div class="upcoming-card">
              <div class="upcoming-img-wrap">
                <img class="car-img" ${thumbAttrs(car)}
                     loading="lazy" decoding="async" alt="${escapeHtml(car.name || '')}">
                <div class="upcoming-overlay">
                  <span class="upcoming-pill">📦 Coming Soon</span>
                </div>
              </div>
              <div class="upcoming-info">
                <div class="upcoming-name">${escapeHtml(car.name || 'Unnamed')}</div>
                ${car.brand ? `<div class="upcoming-meta">${escapeHtml(car.brand)}${car.Manufacture ? ' · ' + escapeHtml(car.Manufacture) : ''}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </section>` : ""}

    </div>`;

  if (APP_CONFIG.showHero && heroCar) updateHero(heroCar);
  if (APP_CONFIG.showHero && heroCar && APP_CONFIG.heroAutoplay && !isMobile()) startHeroCarousel();
  if (APP_CONFIG.showTreasureHunts !== false) renderTreasureHunts(thCars);
  if (APP_CONFIG.showRecent) wireRecent(recentCars);
  if (APP_CONFIG.showTopGifters) renderTopGifters(owned);
  if (APP_CONFIG.showSeriesTracker) renderSeriesTracker(owned);

  home.querySelectorAll('.upcoming-card[data-car-id]').forEach(card => {
    card.addEventListener('click', () => {
      const car = list.find(c => String(c.id) === String(card.dataset.carId));
      if (car) showDetailsModal(car);
    });
  });

  home.querySelectorAll('.otd-card[data-car-id]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const car = list.find(c => String(c.id) === String(card.dataset.carId));
      if (car) showDetailsModal(car);
    });
  });

  home.querySelectorAll(".stat-link").forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener("click", goToGarage);
  });

  home.querySelectorAll(".home-brand-item[data-brand]").forEach(item => {
    item.style.cursor = "pointer";
    item.addEventListener("click", () => {
      goToGarage();
      const brand = item.dataset.brand;
      const select = document.getElementById("filterBrandALL");
      if (select) {
        select.value = brand;
        select.dispatchEvent(new Event("change"));
      }
    });
  });
}

/********************************************
 * HERO STATIC DOM
 ********************************************/
function buildHeroShell() {
  const showMobileArrows = typeof window !== "undefined" && window.innerWidth <= 800;
  return `
    <div class="home-hero-left">
      <div class="home-hero-label">Hall of Fame</div>
      <h2 class="home-hero-title" id="heroTitle"></h2>
      <div class="home-hero-tags" id="heroTags"></div>
      <p class="home-hero-desc" id="heroDesc"></p>
      <button class="small-btn hero-btn" id="heroViewBtn">View details</button>
    </div>

    <div class="home-hero-right">
      <div class="home-hero-image-wrap">
        <img id="heroImage" class="home-hero-image car-img" fetchpriority="high" decoding="async">
        ${showMobileArrows ? `<div class="hero-mobile-left">◀</div><div class="hero-mobile-right">▶</div>` : ""}
      </div>
      <div class="hero-dots" id="heroDots"></div>
    </div>`;
}

/********************************************
 * HERO DOTS
 ********************************************/
function renderHeroDots() {
  const dots = document.getElementById("heroDots");
  if (!dots || hofCars.length < 2) return;

  dots.innerHTML = hofCars.map((_, i) =>
    `<span class="hero-dot ${i === hofIndex ? "active" : ""}" data-i="${i}"></span>`
  ).join("");

  dots.querySelectorAll(".hero-dot").forEach(dot => {
    dot.onclick = () => showHeroAt(parseInt(dot.dataset.i));
  });
}

function updateHero(car) {
  document.getElementById("heroTitle").textContent = car.name || "Untitled";
  document.getElementById("heroDesc").textContent = car.description || "One of the standout pieces in this collection.";
  document.getElementById("heroTags").innerHTML = `
    ${renderTag('Brand', car.brand || car.Brand)}
    ${renderTag('Series', car.series || car.Series)}
    ${renderTag('Year', car.year)}
    ${renderTag('Serial', car.serial || car.Serial)}
    ${isTH(car) ? `<span class="tag tag-th">Treasure Hunt ✨</span>` : ''}`;

  const img = document.getElementById("heroImage");
  const src = getBestImage(car);
  if (img.dataset.src !== src) { img.dataset.src = src; delete img.dataset.fellBack; img.src = src; }

  renderHeroDots();
  wireHero(car);
}

function showHeroAt(index) {
  hofIndex = (index + hofCars.length) % hofCars.length;
  updateHero(hofCars[hofIndex]);
}

function heroPrev(){ showHeroAt(hofIndex - 1); }
function heroNext(){ showHeroAt(hofIndex + 1); }

/********************************************
 * HERO EVENTS
 ********************************************/
function wireHero(car) {
  const btn = document.getElementById('heroViewBtn');
  const img = document.getElementById('heroImage');
  if (btn) btn.onclick = () => showDetailsModal(car);
  if (img) img.onclick = () => showDetailsModal(car);
  if (isMobile()) setupHeroMobileControls();
}

/********************************************
 * MOBILE HERO CONTROLS
 ********************************************/
function setupHeroMobileControls() {
  const hero = document.getElementById("homeHero");
  if (!hero) return;
  hero.querySelector(".hero-mobile-left")?.addEventListener("click", heroPrev);
  hero.querySelector(".hero-mobile-right")?.addEventListener("click", heroNext);
}

/********************************************
 * HERO CAROUSEL
 ********************************************/
function startHeroCarousel() {
  if (hofTimer) clearInterval(hofTimer);
  if (!hofCars || hofCars.length < 2 || isMobile()) return;
  const hero = document.getElementById("homeHero");
  if (!hero) return;

  hofTimer = setInterval(() => showHeroAt(hofIndex + 1), APP_CONFIG.heroAutoplayInterval || 5000);

  if (APP_CONFIG.heroPauseOnHover) {
    hero.addEventListener("mouseenter", () => clearInterval(hofTimer), { passive: true });
    hero.addEventListener("mouseleave", () => {
      clearInterval(hofTimer);
      hofTimer = setInterval(() => showHeroAt(hofIndex + 1), APP_CONFIG.heroAutoplayInterval || 5000);
    }, { passive: true });
  }
}

/* Everything else below this line is unchanged */

/********************************************
 * RECENT CLICK EVENTS
 ********************************************/
function wireRecent(arr) {
  const home = document.getElementById('view-home');
  if (!home) return;

  home.querySelectorAll('.home-recent-card').forEach((card, i) => {
    const car = arr[i];
    if (!car) return;
    card.addEventListener('click', () => showDetailsModal(car));
  });
}

/********************************************
 * TREASURE HUNTS RENDERER
 ********************************************/
function renderTreasureHunts(list) {
  const container = document.getElementById('treasureHuntSection');
  if (!container) return;

  if (!list || !list.length) {
    container.innerHTML = `
      <p class="empty-note">No Treasure Hunts added yet.</p>
    `;
    return;
  }

  const renderItem = (car) => `
    <div class="th-item">
      <div class="th-img-wrap">
        <img ${thumbAttrs(car)} class="th-img car-img" alt="${escapeHtml(car.name || '')}" loading="lazy" decoding="async">
        <img src="images/th.png" class="th-logo th-logo-small" alt="Treasure Hunt" loading="lazy" decoding="async">
      </div>
      <p class="th-name">${escapeHtml(car.name || '')}</p>
    </div>`;

  const itemsHtml = list.map(renderItem).join('');
  const isDesktop = window.innerWidth > 800;
  container.innerHTML = `<div class="th-scroll-inner">${itemsHtml}${isDesktop ? itemsHtml : ''}</div>`;

  container.querySelectorAll('.th-item').forEach((card, i) => {
    const car = list[i % list.length];
    if (!car) return;
    card.addEventListener('click', () => showDetailsModal(car));
  });
}

/********************************************
 * ⭐ TOP GIFTERS
 ********************************************/
function renderTopGifters(cars) {
  const gifterMap = {};
  cars.forEach(car => {
    const g = (car.Gifter || "").trim();
    if (g) {
      if (!gifterMap[g]) gifterMap[g] = [];
      gifterMap[g].push(car);
    }
  });

  const top = Object.entries(gifterMap)
    .map(([name, arr]) => ({ name, count: arr.length, cars: arr }))
    .sort((a, b) => b.count - a.count)
    .slice(0, APP_CONFIG.maxGifters || 3);

  const glowColors = [
    "rgba(255,215,0,0.75)",
    "rgba(192,192,192,0.75)",
    "rgba(205,127,50,0.75)"
  ];

  const grid = document.getElementById("gifters-grid");
  if (!grid) return;

  grid.innerHTML = top.map((g, i) => {
    const label = g.count === 1 ? "car" : "cars";
    return `
      <div class="gifter-card" data-gifter="${g.name}" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px;border-radius:14px;cursor:pointer;">
        <div class="gifter-header" style="font-weight:600;text-align:center;">
          <span>${escapeHtml(g.name)}</span>
          <span style="opacity:.7;"> — ${g.count} ${label}</span>
        </div>
        <img src="gifters/giftericon-${i + 1}.webp" class="gifter-icon" loading="lazy">
      </div>`;
  }).join("");

  grid.querySelectorAll(".gifter-card").forEach(card => {
    const name = card.dataset.gifter;
    card.addEventListener("click", () => openGifterModal(name, gifterMap[name]));
  });
}

/********************************************
 * GIFTER MODAL — OPEN
 ********************************************/
window.openGifterModal = function (name, cars) {
  const modal = document.getElementById("gifterModalContent");
  const overlay = document.getElementById("gifterOverlay");

  modal.innerHTML = `
    <div class="gifter-title">Gifts from ${escapeHtml(name)}</div>
    <table class="gifter-table">
      <tr><th>Image</th><th>Name</th><th>Brand</th><th>Series</th><th>Year</th><th>Serial</th></tr>
      ${cars.map(car => `
        <tr>
          <td><img ${thumbAttrs(car)} class="gifter-thumb car-img" loading="lazy" decoding="async"></td>
          <td>${escapeHtml(car.name || "")}</td>
          <td>${escapeHtml(car.brand || car.Brand || "")}</td>
          <td>${escapeHtml(car.series || car.Series || "")}</td>
          <td>${escapeHtml(car.year || "")}</td>
          <td>${escapeHtml(car.serial || car.Serial || "")}</td>
        </tr>`).join("")}
    </table>`;
  overlay.style.display = "flex";

  document.body.classList.add("gifter-lock");
};

window.closeGifterModal = function () {
  document.getElementById("gifterOverlay").style.display = "none";
  document.body.classList.remove("gifter-lock");

};
document.querySelector(".gifter-box-close")?.addEventListener("click", window.closeGifterModal);

/********************************************
 * SERIES TRACKER
 ********************************************/
function renderSeriesTracker(list) {
  const container = document.getElementById('seriesTrackerGrid');
  if (!container) return;

  const limits = APP_CONFIG.seriesLimits || {};

  // Group cars by series
  const map = {};
  list.forEach(c => {
    const s = (c.series || c.Series || '').trim();
    if (!s) return;
    map[s] = (map[s] || 0) + 1;
  });

  // Sort: series with known totals first, then by count desc
  const entries = Object.entries(map).sort((a, b) => {
    const aHas = limits[a[0]] != null;
    const bHas = limits[b[0]] != null;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return b[1] - a[1];
  });

  container.innerHTML = entries.map(([series, owned]) => {
    const total = limits[series];
    const hasTotal = total != null && total > 0;
    const pct = hasTotal ? Math.min(100, Math.round((owned / total) * 100)) : null;

    return `
      <div class="series-card glass-panel">
        <div class="series-name">${escapeHtml(series)}</div>
        <div class="series-count">${owned}${hasTotal ? ` <span class="series-total">/ ${total}</span>` : ' <span class="series-total">cars</span>'}</div>
        ${hasTotal ? `
          <div class="series-bar-wrap">
            <div class="series-bar" style="width:${pct}%"></div>
          </div>
          <div class="series-pct">${pct}%</div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/********************************************
 * HELPERS
 ********************************************/
function getBestImage(car) {
  if (!car) return '';
  return car.featuredImage || carImageSrc(car);
}

/* Small images (cards, rails, tables) use the 480px thumbnail */
function thumbAttrs(car) {
  return carThumbAttrs(car, { url: car.featuredImage || undefined });
}

function escapeHtml(s) {
  return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
}

function renderTag(label, value) {
  if (!value) return '';
  return `<span class="tag"><strong>${label}:</strong> ${escapeHtml(value)}</span>`;
}

export function renderAboutBrands() {
  const column = document.getElementById("aboutBrandColumn");
  if (!column) return;
  column.innerHTML = "";
  Object.entries(BRAND_LOGOS).forEach(([brand, url]) => {
    const img = new Image();
    img.src = url;
    img.className = "about-brand-logo";
    img.alt = brand + " logo";
    img.onload = () => column.appendChild(img);
  });
}

function goToGarage() {
  document.getElementById("menu-all")?.click();
}

/* ── On This Day ── */
function buildOnThisDay(cars) {
  const now = new Date();
  const md = `${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const matches = cars.filter(c => {
    if (!c.addedOn) return false;
    const d = new Date(c.addedOn);
    if (isNaN(d)) return false;
    if (d.getFullYear() === now.getFullYear()) return false; // same year doesn't count
    const cmr = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return cmr === md;
  });

  if (!matches.length) return '';

  const cards = matches.map(car => `
    <div class="otd-card" data-car-id="${car.id}">
      <div class="otd-img-wrap">
        <img class="car-img" ${thumbAttrs(car)}
             loading="lazy" decoding="async" alt="${escapeHtml(car.name || '')}">
      </div>
      <div class="otd-info">
        <div class="otd-name">${escapeHtml(car.name || '')}</div>
        <div class="otd-year">${new Date(car.addedOn).getFullYear()}</div>
      </div>
    </div>`).join('');

  return `
    <section class="home-otd glass-panel">
      <div class="home-section-header">
        <h3>On This Day 📅</h3>
        <span class="home-section-sub">Added on this date in past years</span>
      </div>
      <div class="otd-grid">${cards}</div>
    </section>`;
}