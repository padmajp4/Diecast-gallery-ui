import { APP_CONFIG } from './config.js';
import { carThumbAttrs, fallbackCarImage, thumbOf } from './carImage.js?v=3';
import { lockScroll, unlockScroll } from './scrollLock.js?v=1';

/***************************************************
 * COLOUR PILL HELPER
 ***************************************************/
function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function colourPillTag(colourStr) {
  if (!colourStr) return "";
  const map = APP_CONFIG.CAR_COLOURS || {};
  const key = colourStr.trim().toLowerCase();
  const entry = map[key];

  let bg, textCol;

  if (Array.isArray(entry)) {
    bg = `linear-gradient(135deg, ${entry[0]} 0%, ${entry[1]} 100%)`;
    const avgLum = (hexLuminance(entry[0]) + hexLuminance(entry[1])) / 2;
    textCol = avgLum > 0.35 ? "#1a1a1a" : "#ffffff";
  } else if (typeof entry === "string") {
    bg = entry;
    textCol = hexLuminance(entry) > 0.35 ? "#1a1a1a" : "#ffffff";
  } else {
    // Unknown colour — neutral pill, no background override
    return `<span class="tag"><strong>Colour:</strong> ${escapeHtml(colourStr)}</span>`;
  }

  return `<span class="tag colour-pill" style="background:${bg};color:${textCol};">${escapeHtml(colourStr)}</span>`;
}

/***************************************************
 * LIGHTBOX
 ***************************************************/
let lightboxEl = null;

function openLightbox(src) {
  if (!src) return;
  if (!lightboxEl) {
    lightboxEl = document.createElement("div");
    lightboxEl.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.93);" +
      "display:flex;align-items:center;justify-content:center;cursor:zoom-out";
    const img = document.createElement("img");
    img.style.cssText = "max-width:95vw;max-height:95vh;border-radius:6px;object-fit:contain;cursor:zoom-out";
    img.id = "lightboxImg";
    lightboxEl.appendChild(img);
    lightboxEl.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });
    document.body.appendChild(lightboxEl);
  }
  lightboxEl.querySelector("#lightboxImg").src = src;
  lightboxEl.style.display = "flex";
}

function closeLightbox() {
  if (lightboxEl) lightboxEl.style.display = "none";
}

// expose globally so inline onclick in innerHTML templates can reach it
window._lightbox = openLightbox;

/***************************************************
 * INIT MODAL
 ***************************************************/
export function initModal() {
  const overlay = document.getElementById("overlay");

  window.modalClose = function () {
    if (overlay) overlay.style.display = "none";
    unlockScroll("details");
  };
}

/***************************************************
 * HELPERS
 ***************************************************/
function getVariants(car) {
  if (!window.ALL_CARS || !car.model) return [];
  return window.ALL_CARS.filter(c => c.model === car.model);
}

function getFriendlyVariantLabel(car) {
  return [car.Colour, car.year].filter(Boolean).join(" · ");
}

function escapeHtml(s) {
  return s
    ? String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    : "";
}

function escapeAttr(s) {
  return s ? String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;") : "";
}

/***************************************************
 * SHOW DETAILS MODAL
 ***************************************************/
export function showDetailsModal(car) {
  if (!car) return;

  const overlay = document.getElementById("overlay");
  const box = document.getElementById("details");
  if (!overlay || !box) return;

  /*************** IMAGES ***************/
  let imgs = [];
  if (Array.isArray(car.images)) imgs = car.images;
  else if (typeof car.images === "string")
    imgs = car.images.split(",").map(s => s.trim()).filter(Boolean);
  else if (car.image) imgs = [car.image];

  const hasMultiple = imgs.length > 1;
  let currentIndex = 0;

  /*************** BRAND LOGO ***************/
  const brandLogos = {
    "Hot Wheels": "brands/hotwheels.png",
    "Matchbox": "brands/matchbox.png",
    "Majorette": "brands/majorette.png",
    "Tomica": "brands/tomica.png",
    "Maisto": "brands/maisto.png",
    "Greenlight": "brands/greenlight.png",
    "Burago": "brands/burago.png",
    "Welly": "brands/welly.png",
    "Kinsmart": "brands/kinsmart.png",
    "CCA": "brands/cca.png",
    "MiniGT": "brands/mini-gt.png" ,
    default: "brands/default.png"
  };
  const brandImg = brandLogos[car.brand] || brandLogos.default;

  /*************** VARIANTS ***************/
  const variants = getVariants(car);
  const hasVariants = variants.length > 1;

  /*************** OWNERSHIP ***************/
  const ownedQty = Number(car.ownership?.quantity || 1);
  const isTreasure = car.isTreasurehunt === true;

  const specItem = (label, value) =>
    value
      ? `<div class="dp-spec"><span class="dp-spec-label">${label}</span><span class="dp-spec-value">${escapeHtml(value)}</span></div>`
      : "";

  const addedOnSpec = car.addedOn
    ? (() => {
        const d = new Date(car.addedOn);
        const fmt = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `<div class="dp-spec"><span class="dp-spec-label">Added</span><span class="dp-spec-value">${fmt}</span></div>`;
      })()
    : "";

  const colourSpec = car.Colour
    ? `<div class="dp-spec"><span class="dp-spec-label">Colour</span>${colourPillTag(car.Colour)}</div>`
    : "";

  /*************** BUILD HTML ***************/
  box.innerHTML = `
  <div class="details-box">
    <div class="modal-back-bar" data-close>
      <span class="modal-back-arrow">&#8592;</span> Garage
    </div>
    <div class="close-btn" data-close>✕</div>

    <div class="details-inner">
      <div class="dp-layout">

        <!-- IMAGE COLUMN -->
        <div class="dp-image-col">
          <div class="dp-carousel">
            ${imgs[0]
              ? `<img src="${escapeAttr(thumbOf(imgs[0]))}" id="detailsMainImg" class="car-img${thumbOf(imgs[0]) !== imgs[0] ? " dp-preview" : ""}" data-fallback="${fallbackCarImage(car)}" decoding="async" data-zoom style="cursor:zoom-in">`
              : `<img src="${fallbackCarImage(car)}" id="detailsMainImg" class="car-img${car.isIncoming ? ' dp-incoming-img' : ''}">`}
            <img src="${brandImg}" class="dp-brand-watermark" alt="${escapeAttr(car.brand || "")}">
            ${car.isIncoming ? `<div class="dp-coming-soon-badge">Coming Soon</div>` : ""}
            ${isTreasure ? `<div class="dp-th-badge">🔥 Treasure Hunt</div>` : ""}
            ${hasMultiple ? `
              <div class="nav-btn left" id="detailsPrevBtn">&#10094;</div>
              <div class="nav-btn right" id="detailsNextBtn">&#10095;</div>
              <div class="dp-img-counter" id="dpImgCounter">1 / ${imgs.length}</div>
            ` : ""}
          </div>
          ${hasMultiple ? `
            <div class="dp-thumbs">
              ${imgs.map((src, i) => `
                <button type="button" class="dp-thumb ${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Photo ${i + 1} of ${imgs.length}">
                  <img class="car-img" src="${escapeAttr(thumbOf(src))}" data-full="${escapeAttr(src)}" data-fallback="${fallbackCarImage(car)}" data-loaded-class="is-loaded" alt="" decoding="async">
                </button>`).join("")}
            </div>
          ` : ""}
        </div>

        <!-- INFO COLUMN -->
        <div class="dp-info-col">

          ${hasVariants ? `
            <div class="dp-variants">
              ${variants.map(v => `
                <span class="dp-variant-pill ${v === car ? "active" : ""}"
                  data-variant="${escapeAttr(v.variantId)}">
                  ${escapeHtml(getFriendlyVariantLabel(v))}
                </span>
              `).join("")}
            </div>
          ` : ""}

          <div class="dp-title-row">
            <h2 class="dp-title">${escapeHtml(car.name || "Unnamed Model")}</h2>
            ${car.isIncoming ? `<span class="dp-incoming-pill">Coming Soon</span>` : ""}
            ${ownedQty > 1 ? `<span class="dp-copies-badge">×${ownedQty}</span>` : ""}
          </div>

          <div class="dp-rule"></div>

          <div class="dp-specs-grid">
            ${specItem("Brand", car.brand)}
            ${specItem("Series", car.series)}
            ${car.setName ? specItem("Set", car.setName + (car.setNumber ? ` (${car.setNumber})` : '')) : ''}
            ${specItem("Manufacturer", car.Manufacture || car.manufacture)}
            ${specItem("Vehicle", car.VehicleType)}
            ${specItem("Scale", car.Scale)}
            ${specItem("Year", car.year)}
            ${colourSpec}
            ${specItem("Serial", car.serial)}
            ${specItem("Gifter", car.Gifter)}
            ${specItem("Source", car.source)}
            ${addedOnSpec}
          </div>

          ${(car.description)
            ? `<div class="dp-rule"></div>
               <div class="dp-desc">
                 <span class="dp-desc-label">About</span>
                 <p class="dp-desc-text" id="dpDescText">${escapeHtml(car.description)}</p>
                 <button class="dp-read-more" id="dpReadMore">Read more</button>
               </div>`
            : ""}

          <div id="dpWikiInfo"></div>

          <div class="dp-rule"></div>

          <div class="dp-actions">
            <button id="shareBtn" class="dp-share-btn">🔗 Share This Car</button>
          </div>

        </div>
      </div>

      <div class="related-section">
        <div class="related-title">
          More ${escapeHtml(car.Manufacture || car.manufacture || "")} Cars
        </div>
        <div id="relatedRail" class="related-rail"></div>
      </div>
    </div>
  </div>
  `;

  loadWikiInfo(car, box);

  box.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", () => window.modalClose()));
  box.querySelector("#detailsMainImg[data-zoom]")?.addEventListener("click", () => openLightbox(imgs[currentIndex] || imgs[0]));

  /* Share button */
  const shareBtn = box.querySelector("#shareBtn");
  if (shareBtn) {
    const original = shareBtn.textContent;
    shareBtn.onclick = async () => {
      const url = `${location.origin}?car=${encodeURIComponent(car.name)}`;
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "✔ Link Copied!";
      shareBtn.classList.add("dp-share-btn--copied");
      setTimeout(() => {
        shareBtn.textContent = original;
        shareBtn.classList.remove("dp-share-btn--copied");
      }, 1400);
    };
  }

  /* Description expand */
  const dpDescText = box.querySelector("#dpDescText");
  const dpReadMore = box.querySelector("#dpReadMore");
  if (dpDescText && dpReadMore) {
    // Defer check until after paint so scrollHeight is accurate
    requestAnimationFrame(() => {
      if (dpDescText.scrollHeight <= dpDescText.clientHeight + 2) {
        dpReadMore.style.display = "none";
      }
    });
    dpReadMore.addEventListener("click", () => {
      const expanded = dpDescText.classList.toggle("expanded");
      dpReadMore.textContent = expanded ? "Show less" : "Read more";
    });
  }


  const imgEl = box.querySelector("#detailsMainImg");
  const dots = box.querySelectorAll(".dp-thumb");
  const counter = box.querySelector("#dpImgCounter");

  /* 📱 Swipe */
  if (imgEl) {
    let startX = 0;
    imgEl.addEventListener("touchstart", e => (startX = e.touches[0].clientX), { passive: true });
    imgEl.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 40) showImage((currentIndex - 1 + imgs.length) % imgs.length);
      else if (dx < -40) showImage((currentIndex + 1) % imgs.length);
    });
  }

  /* Show the small (usually cached) thumbnail right away, blurred, and swap in
     the full photo once it's fully downloaded + decoded — no top-down paint. */
  let loadToken = 0;
  function loadMainImage(full) {
    if (!imgEl || !full) return;
    const token = ++loadToken;
    const thumb = thumbOf(full);
    delete imgEl.dataset.fellBack;
    if (thumb !== full) {
      imgEl.src = thumb;
      imgEl.classList.add("dp-preview");
    }
    const pre = new Image();
    pre.src = full;
    pre.decode()
      .then(() => { if (token === loadToken) { imgEl.src = full; imgEl.classList.remove("dp-preview"); } })
      .catch(() => { if (token === loadToken) { imgEl.src = full; imgEl.classList.remove("dp-preview"); } }); // car-img fallback handles a real 404
  }

  function showImage(i) {
    if (!imgs[i] || !imgEl) return;
    loadMainImage(imgs[i]);
    dots.forEach((d, x) => d.classList.toggle("active", x === i));
    dots[i]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    if (counter) counter.textContent = `${i + 1} / ${imgs.length}`;
    currentIndex = i;
  }
  if (imgs[0]) loadMainImage(imgs[0]);

  dots.forEach(dot => (dot.onclick = () => showImage(+dot.dataset.index)));
  box.querySelector("#detailsPrevBtn")?.addEventListener("click", () =>
    showImage((currentIndex - 1 + imgs.length) % imgs.length)
  );
  box.querySelector("#detailsNextBtn")?.addEventListener("click", () =>
    showImage((currentIndex + 1) % imgs.length)
  );

  box.querySelectorAll(".dp-variant-pill").forEach(badge => {
    badge.onclick = () => {
      const selected = variants.find(v => v.variantId === badge.dataset.variant);
      if (selected) showDetailsModal(selected);
    };
  });

  const rail = box.querySelector("#relatedRail");
  const section = box.querySelector(".related-section");

  if (window.ALL_CARS && rail && section) {
    rail.innerHTML = "";
    const manu = (car.Manufacture || car.manufacture || "").toLowerCase();
    const related = window.ALL_CARS.filter(c =>
      (c.Manufacture || c.manufacture || "").toLowerCase() === manu && c !== car
    );
    if (!related.length) section.style.display = "none";
    else related.slice(0, 50).forEach(rc => {
      const div = document.createElement("div");
      div.className = "related-item";
      div.innerHTML = `
        <img class="car-img" ${carThumbAttrs(rc)} loading="lazy" decoding="async">
        <div class="related-name">${escapeHtml(rc.name)}</div>
      `;
      div.onclick = () => showDetailsModal(rc);
      rail.appendChild(div);
    });
  }

  overlay.style.display = "flex";
  lockScroll("details");
}

/* =========================================================
   MOBILE SAFE NAV CLOSE — single source of truth
========================================================= */
(function(){
  if (window.innerWidth > 800) return;

  document.body.addEventListener("click", e => {
    const nav = e.target.closest(".menu-item, .dock-item");
    if (!nav) return;

    const overlay = document.getElementById("overlay");
    if (!overlay || overlay.style.display !== "flex") return;

    modalClose();                 // close modal first
    e.stopPropagation();          // then allow navigation
    setTimeout(() => nav.click(), 0);
  }, true);
})();


/***************************************************
 * WIKI INFO (confirmed in admin → Car Info)
 ***************************************************/
const wikiInfoCache = new Map();

async function loadWikiInfo(car, box) {
  const slot = box.querySelector("#dpWikiInfo");
  if (!slot || car.id == null || window.DIECAST_DEMO) return;

  let info = wikiInfoCache.get(car.id);
  if (info === undefined) {
    try {
      const res = await fetch(`/api/car-info/${car.id}`);
      info = res.ok ? await res.json() : null;
    } catch { info = null; }
    wikiInfoCache.set(car.id, info);
  }
  // Modal may have moved on to another car while we were fetching
  if (!info || !slot.isConnected) return;
  slot.innerHTML = renderWikiInfo(info);
}

function renderWikiInfo({ casting, version, realCar }) {
  const parts = [];
  // Older saved links encoded "/" in titles like "R/T" — wikis expect it as-is
  const safeUrl = u => (/^https:\/\//.test(u || "") ? u.replace(/%2F/gi, "/") : "#");

  if (casting) {
    const fields = Object.entries(casting.fields || {}).slice(0, 6);
    const versionLine = version
      ? [version.year, version.series, version.color, version.wheel && `${version.wheel} wheels`, version.toy && `Toy # ${version.toy}`]
          .filter(Boolean).map(escapeHtml).join(" · ")
      : "";
    parts.push(`
      <div class="dp-wiki">
        <span class="dp-desc-label">Casting</span>
        ${fields.length ? `<div class="dp-specs-grid dp-wiki-grid">
          ${fields.map(([k, v]) => `<div class="dp-spec"><span class="dp-spec-label">${escapeHtml(k)}</span><span class="dp-spec-value">${escapeHtml(v)}</span></div>`).join("")}
        </div>` : ""}
        ${versionLine ? `<div class="dp-wiki-version"><span class="dp-spec-label">This version</span><span>${versionLine}</span></div>` : ""}
        <a class="dp-wiki-src" href="${escapeAttr(safeUrl(casting.url))}" target="_blank" rel="noopener">${escapeHtml(casting.title)} · ${escapeHtml(casting.source || "Wiki")} ↗</a>
      </div>`);
  }

  if (realCar?.summary) {
    parts.push(`
      <div class="dp-wiki">
        <span class="dp-desc-label">The real car</span>
        <p class="dp-desc-text dp-wiki-summary">${escapeHtml(realCar.summary)}</p>
        <a class="dp-wiki-src" href="${escapeAttr(safeUrl(realCar.url))}" target="_blank" rel="noopener">${escapeHtml(realCar.title)} · Wikipedia ↗</a>
      </div>`);
  }

  return parts.map(p => `<div class="dp-rule"></div>${p}`).join("");
}
