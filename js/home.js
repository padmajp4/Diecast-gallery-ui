// js/home.js
import { showDetailsModal } from './modal.js';
import { APP_CONFIG } from './config.js';


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
        <p>No items found yet. Add items to your data source 🚗</p>
      </div>
    `;
    return;
  }

  /* ---------------- HALL OF FAME ---------------- */
  const featured = list.filter(c => isFeatured(c));

  if (featured.length >= 3) {
    hofCars = featured.slice(0, 3);
  } else {
    const filler = list
      .filter(c => !isFeatured(c) && !isTH(c))
      .slice(0, 3 - featured.length);
    hofCars = [...featured, ...filler];
  }

  hofIndex = 0;
  const heroCar = hofCars[0];

  /* ---------------- STATS & BASIC SETS ---------------- */
const totalCars = list.reduce((sum, car) => {
  return sum + (car.ownership?.quantity || 1);
}, 0);

  const manufacturers = new Set(
    list.map(c => (c.Manufacture || c.manufacture || '').trim()).filter(Boolean)
  );

  const seriesSet = new Set(
    list.map(c => (c.series || c.Series || '').trim()).filter(Boolean)
  );

  const brandsSet = new Set(
    list.map(c => (c.brand || c.Brand || '').trim()).filter(Boolean)
  );

  const thCars = list.filter(c => isTH(c));
  const thCount = thCars.length;

  /* ---------------- BRAND BREAKDOWN ---------------- */
  const brandCounts = {};
  list.forEach(c => {
    const key = (c.brand || c.Brand || 'Unknown').trim() || 'Unknown';
    brandCounts[key] = (brandCounts[key] || 0) + 1;
  });

  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, APP_CONFIG.topBrandsLimit || 5);

  /* ---------------- RECENT ---------------- */
  const recentCars = list.slice(0, APP_CONFIG.recentCount || 3);

  /* ---------------- BUILD HTML ---------------- */
  home.innerHTML = `
    <div class="home-layout">

      ${APP_CONFIG.showHero ? `
      <section class="home-hero glass-panel hero-fade-container" id="homeHero">
        ${buildHeroInner(heroCar)}
      </section>
      ` : ""}

      ${APP_CONFIG.showStats ? `
      <section class="home-stats-row">
        <div class="home-stat-card glass-panel stat-link">
          <div class="home-stat-label">Total Models</div>
          <div class="home-stat-value">${totalCars}</div>
        </div>
        <div class="home-stat-card glass-panel stat-link">
          <div class="home-stat-label">Brands</div>
          <div class="home-stat-value">${manufacturers.size}</div>
        </div>
        <div class="home-stat-card glass-panel stat-link">
          <div class="home-stat-label">Series</div>
          <div class="home-stat-value">${seriesSet.size}</div>
        </div>
        <div class="home-stat-card glass-panel stat-link">
          <div class="home-stat-label">Treasure Hunts</div>
          <div class="home-stat-value">${thCount}</div>
        </div>
      </section>
      ` : ""}

      ${APP_CONFIG.showTopBrands ? `
      <section class="home-brands glass-panel">
        <div class="home-section-header">
          <h3>Top Brands</h3>
          <span class="home-section-sub">${brandsSet.size} brands in total</span>
        </div>

        <div class="home-brands-list">
          ${topBrands
            .map(([brand, count]) => {
              const logo =
             (APP_CONFIG.BRAND_LOGOS && APP_CONFIG.BRAND_LOGOS[brand]) ||
              APP_CONFIG.BRAND_LOGOS.default;
              return `
                <div class="home-brand-item">
                  <img class="brand-logo" src="${logo}" alt="${escapeHtml(brand)}">
                  <span class="home-brand-count">${count}</span>
                </div>`;
            })
            .join('')}
        </div>
      </section>
      ` : ""}

      ${APP_CONFIG.showTreasureHunts !== false ? `
      <section class="home-treasure glass-panel">
        <div class="home-section-header">
          <h3>Treasure Hunts 🔥</h3>
          <span class="home-section-sub">Special finds from the collection</span>
        </div>

        <div id="treasureHuntSection" class="th-scroll"></div>
      </section>
      ` : ""}

      ${APP_CONFIG.showRecent ? `
      <section class="home-recent glass-panel">
        <div class="home-section-header">
          <h3>Recently Added</h3>
          <span class="home-section-sub">Latest from my collection</span>
        </div>

        <div class="home-recent-grid">
          ${recentCars
            .map(car => {
              const img = getBestImage(car);
              return `
                <div class="card home-recent-card">
                  <div class="home-recent-image-wrap">
                    <img src="${img}" alt="${escapeHtml(car.name || '')}">
                    ${isTH(car) ? `<img src="assets/th.png" class="th-logo">` : ''}
                  </div>
                  <div class="card-title">${escapeHtml(car.name || '')}</div>
                </div>`;
            })
            .join('')}
        </div>
      </section>
      ` : ""}

      ${APP_CONFIG.showTopGifters ? `
      <section class="home-gifters glass-panel">
        <div class="home-section-header">
          <h3>Top Gifters 🎁 </h3>
          <span class="home-section-sub">Based on cars gifted</span>
        </div>
        <div id="gifters-grid" class="gifters-grid"></div>
      </section>
      ` : ""}

    </div>
  `;

  /* ---------------- INIT LOGIC AFTER DOM IS CREATED ---------------- */
  if (APP_CONFIG.showHero) wireHero(heroCar);

  // 🚫 On mobile: NO autoplay to avoid jumping
  if (APP_CONFIG.showHero && APP_CONFIG.heroAutoplay && !isMobile()) {
    startHeroCarousel();
  }

  // Treasure Hunts row
  if (APP_CONFIG.showTreasureHunts !== false) {
    renderTreasureHunts(thCars);
  }

  if (APP_CONFIG.showRecent) {
    wireRecent(recentCars);
  }

  if (APP_CONFIG.showTopGifters) {
    renderTopGifters(list);
  }

  home.querySelectorAll(".stat-link").forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener("click", goToGarage);
  });
}

/********************************************
 * HERO BUILDER
 ********************************************/
function buildHeroInner(car) {
  const heroImg = getBestImage(car);
  const showMobileArrows =
    typeof window !== "undefined" && window.innerWidth <= 800;

  return `
    <div class="home-hero-left">
      <div class="home-hero-label">Hall of Fame</div>
      <h2 class="home-hero-title">${escapeHtml(car.name || 'Untitled')}</h2>

      <div class="home-hero-tags">
        ${renderTag('Brand', car.brand || car.Brand)}
        ${renderTag('Series', car.series || car.Series)}
        ${renderTag('Year', car.year)}
        ${renderTag('Serial', car.serial || car.Serial)}
        ${isTH(car) ? `<span class="tag tag-th">Treasure Hunt ✨</span>` : ''}
      </div>

      <p class="home-hero-desc">
        ${escapeHtml(car.description || 'One of the standout pieces in this collection.')}
      </p>

      <button class="small-btn hero-btn" id="heroViewBtn">View details</button>
    </div>

    <div class="home-hero-right">
      <div class="home-hero-image-wrap">
        <img src="${heroImg}" id="heroImage" class="home-hero-image">
        ${
          showMobileArrows
            ? `
          <div class="hero-mobile-left">◀</div>
          <div class="hero-mobile-right">▶</div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

/********************************************
 * HERO NAV HELPERS (used on mobile)
 ********************************************/
function showHeroAt(index) {
  if (!hofCars || !hofCars.length) return;
  hofIndex = (index + hofCars.length) % hofCars.length;
  const car = hofCars[hofIndex];

  const hero = document.getElementById("homeHero");
  if (!hero) return;

  hero.innerHTML = buildHeroInner(car);
  wireHero(car); // re-wire buttons & mobile controls
}

function heroPrev() {
  showHeroAt(hofIndex - 1);
}

function heroNext() {
  showHeroAt(hofIndex + 1);
}

/********************************************
 * HERO EVENTS
 ********************************************/
function wireHero(car) {
  const btn = document.getElementById('heroViewBtn');
  const img = document.getElementById('heroImage');
  if (btn) btn.onclick = () => showDetailsModal(car);
  if (img) img.onclick = () => showDetailsModal(car);

  // Mobile-only controls: arrows + swipe
  if (isMobile()) {
    setupHeroMobileControls();
  }
}

/********************************************
 * MOBILE HERO CONTROLS (ARROWS + SWIPE)
 ********************************************/
function setupHeroMobileControls() {
  const hero = document.getElementById("homeHero");
  if (!hero) return;

  const leftBtn = hero.querySelector(".hero-mobile-left");
  const rightBtn = hero.querySelector(".hero-mobile-right");

  if (leftBtn) {
    leftBtn.onclick = (e) => {
      e.stopPropagation();
      heroPrev();
    };
  }

  if (rightBtn) {
    rightBtn.onclick = (e) => {
      e.stopPropagation();
      heroNext();
    };
  }

  // Swipe gestures
  let touchStartX = 0;
  let touchEndX = 0;
  const threshold = 40; // px

  hero.ontouchstart = (e) => {
    if (!e.changedTouches || !e.changedTouches.length) return;
    touchStartX = e.changedTouches[0].clientX;
  };

  hero.ontouchend = (e) => {
    if (!e.changedTouches || !e.changedTouches.length) return;
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) > threshold) {
      if (diff < 0) {
        heroNext(); // swipe left → next
      } else {
        heroPrev(); // swipe right → prev
      }
    }
  };
}

/********************************************
 * HERO CAROUSEL (desktop only, with hover pause)
 ********************************************/
function startHeroCarousel() {
  if (hofTimer) clearInterval(hofTimer);
  if (!hofCars || hofCars.length < 2) return;

  // Safety: desktop only
  if (isMobile()) return;

  const hero = document.getElementById("homeHero");
  if (!hero) return;

  if (!hero.dataset.hoverBound) {
    hero.addEventListener("mouseenter", () => {
      if (hofTimer) {
        clearInterval(hofTimer);
        hofTimer = null;
      }
    });

    hero.addEventListener("mouseleave", () => {
      startHeroCarousel();
    });

    hero.dataset.hoverBound = "1";
  }

  hofTimer = setInterval(() => {
    hofIndex = (hofIndex + 1) % hofCars.length;
    const car = hofCars[hofIndex];

    hero.classList.add("hero-fade");
    setTimeout(() => {
      hero.innerHTML = buildHeroInner(car);
      wireHero(car);
      hero.classList.remove("hero-fade");
    }, 300);
  }, APP_CONFIG.heroAutoplayInterval || 5000);
}

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

  container.innerHTML = list
    .map(car => {
      const img = getBestImage(car);
      return `
        <div class="th-item">
          <div class="th-img-wrap">
            <img src="${img}" class="th-img" alt="${escapeHtml(car.name || '')}">
            <img src="assets/th.png" class="th-logo th-logo-small" alt="Treasure Hunt">
          </div>
          <p class="th-name">${escapeHtml(car.name || '')}</p>
        </div>
      `;
    })
    .join('');

  const cards = container.querySelectorAll('.th-item');
  cards.forEach((card, index) => {
    const car = list[index];
    if (!car) return;
    card.addEventListener('click', () => showDetailsModal(car));
  });
}

/********************************************
 * ⭐ TOP GIFTERS
 ********************************************/
function renderTopGifters(cars) {
  const gifterMap = {};

  // Count cars per gifter
  cars.forEach(car => {
    const g = (car.Gifter || "").trim();
    if (g) {
      if (!gifterMap[g]) gifterMap[g] = [];
      gifterMap[g].push(car);
    }
  });

  // Sort
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

  grid.innerHTML = top
    .map((g, i) => {
      const label = g.count === 1 ? "car" : "cars";

      return `
        <div class="gifter-card"
             data-gifter="${g.name}"
             style="
               display:flex;
               flex-direction:column;
               align-items:center;
               justify-content:flex-start;
               gap:10px;
               padding:10px 4px;
               border-radius:14px;
               cursor:pointer;
             ">

          <div 
            class="gifter-header"
            style="
              font-size:1.05rem;
              font-weight:600;
              text-align:center;
              display:flex;
              gap:6px;
              align-items:center;
              justify-content:center;
            ">
            <span>${escapeHtml(g.name)}</span>
            <span style="opacity:.7; font-weight:500; font-size:.95rem;">
              — ${g.count} ${label}
            </span>
          </div>

          <img src="assets/gifters/giftericon-${i + 1}.png"
               class="gifter-icon"
               style="
                 width:130px;
                 height:130px;
                 object-fit:contain;
                 filter: drop-shadow(0 0 4px ${glowColors[i]});
               ">
        </div>
      `;
    })
    .join("");

  // Click → open modal
  grid.querySelectorAll(".gifter-card").forEach(card => {
    const name = card.dataset.gifter;
    card.addEventListener("click", () =>
      openGifterModal(name, gifterMap[name])
    );
  });
}

/********************************************
 * GIFTER MODAL — OPEN
 ********************************************/
window.openGifterModal = function (name, cars) {
  const modal = document.getElementById("gifterModalContent");
  const overlay = document.getElementById("gifterOverlay");

  const rows = cars
    .map(car => `
      <tr>
        <td><img src="${getBestImage(car)}" class="gifter-thumb"></td>
        <td>${escapeHtml(car.name || "")}</td>
        <td>${escapeHtml(car.brand || car.Brand || "")}</td>
        <td>${escapeHtml(car.series || car.Series || "")}</td>
        <td>${escapeHtml(car.year || "")}</td>
        <td>${escapeHtml(car.serial || car.Serial || "")}</td>
      </tr>
    `)
    .join("");

  modal.innerHTML = `
    <div class="gifter-title">Gifts from ${escapeHtml(name)}</div>

    <table class="gifter-table">
      <tr>
        <th>Image</th>
        <th>Name</th>
        <th>Brand</th>
        <th>Series</th>
        <th>Year</th>
        <th>Serial</th>
      </tr>
      ${rows}
    </table>
  `;

  overlay.style.display = "flex";
};

/********************************************
 * GIFTER MODAL — CLOSE
 ********************************************/
window.closeGifterModal = function () {
  document.getElementById("gifterOverlay").style.display = "none";
};

/********************************************
 * HELPERS
 ********************************************/
function getBestImage(car) {
  if (!car) return '';

  if (car.featuredImage) return car.featuredImage;

  if (Array.isArray(car.images) && car.images.length)
    return car.images[0];

  if (typeof car.image === "string")
    return car.image;

  return '';
}

function escapeHtml(s) {
  return s
    ? String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
    : '';
}

function renderTag(label, value) {
  if (!value) return '';
  return `<span class="tag"><strong>${label}:</strong> ${escapeHtml(value)}</span>`;
}

/********************************************
 * ABOUT PAGE BRANDS
 ********************************************/
export function renderAboutBrands() {
  const column = document.getElementById("aboutBrandColumn");
  if (!column) return;

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
    default: "brands/default.png"
  };

  column.innerHTML = "";

  Object.entries(BRAND_LOGOS).forEach(([brand, url]) => {
    const img = new Image();
    img.src = url;
    img.className = "about-brand-logo";
    img.alt = brand + " logo";
    img.onload = () => column.appendChild(img);
  });
};

/********************************************
 * NAVIGATION HELPER
 ********************************************/
function goToGarage() {
  document.getElementById("menu-all")?.click();
}
