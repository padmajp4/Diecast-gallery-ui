/***************************************************
 * INIT MODAL
 ***************************************************/
export function initModal() {
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("modalCloseBtn");

  if (closeBtn) closeBtn.onclick = () => modalClose();

  window.modalClose = function () {
    if (overlay) overlay.style.display = "none";
    document.body.style.overflow = "";
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
  return s ? String(s).replace(/"/g, "&quot;") : "";
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
    "Hot Wheels": "assets/brands/hotwheels.png",
    "Matchbox": "assets/brands/matchbox.png",
    "Majorette": "assets/brands/majorette.png",
    "Tomica": "assets/brands/tomica.png",
    "Maisto": "assets/brands/maisto.png",
    "Greenlight": "assets/brands/greenlight.png",
    "Bburago": "assets/brands/bburago.png",
    "Welly": "assets/brands/welly.png",
    "Kinsmart": "assets/brands/kinsmart.png",
    "CCA": "assets/brands/cca.png",
    default: "assets/brands/default.png"
  };
  const brandImg = brandLogos[car.brand] || brandLogos.default;

  /*************** VARIANTS ***************/
  const variants = getVariants(car);
  const hasVariants = variants.length > 1;

  /*************** OWNERSHIP ***************/
  const ownedQty = Number(car.ownership?.quantity || 1);
  const isTreasure = car.isTreasurehunt === true;

  const tag = (label, value) =>
    value
      ? `<span class="tag"><strong>${label}:</strong> ${escapeHtml(value)}</span>`
      : "";

  /*************** BUILD HTML ***************/
  box.innerHTML = `
    <div class="details-inner">
      <div class="details-premium">
        <div class="left-column">
          <div class="carousel">
            ${
              imgs[0]
                ? `<img src="${escapeAttr(imgs[0])}" id="detailsMainImg">`
                : `<div style="padding:20px;opacity:.6;">No image</div>`
            }
            ${
              hasMultiple
                ? `
                  <div class="nav-btn left" id="detailsPrevBtn">&#10094;</div>
                  <div class="nav-btn right" id="detailsNextBtn">&#10095;</div>
                `
                : ""
            }
          </div>

          ${
            hasMultiple
              ? `
                <div class="dots">
                  ${imgs.map((_, i) =>
                    `<span class="dot ${i === 0 ? "active" : ""}" data-index="${i}"></span>`
                  ).join("")}
                </div>
              `
              : ""
          }

          <button id="shareBtn" style="
              padding:10px 16px;
              border-radius:10px;
              font-weight:600;
              border:1px solid var(--border);
              background:rgba(255,255,255,0.12);
              cursor:pointer;
              width:100%;
              color:var(--text);
              margin-top:16px;
              box-shadow:0 0 10px var(--glow);
              transition:all .25s ease;">
            🔗 Share This Car
          </button>
        </div>

        <div class="right-column">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 class="car-title">${escapeHtml(car.name || "Unnamed Model")}</h2>
            <img src="${brandImg}" class="brand-logo-under" style="height:60px;">
          </div>

          ${
            hasVariants
              ? `
                <div class="variant-selector" style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap;">
                  ${variants.map(v => `
                    <span class="tag variant-badge ${v === car ? "active" : ""}"
                      data-variant="${escapeAttr(v.variantId)}"
                      style="cursor:pointer;${v === car ? "background:var(--accent);color:#fff;" : ""}">
                      ${escapeHtml(getFriendlyVariantLabel(v))}
                    </span>
                  `).join("")}
                </div>
              `
              : ""
          }

          <div class="desc-block">
            <div class="desc-title">DESCRIPTION</div>
            <p class="desc-text">${escapeHtml(car.description || "No description available.")}</p>
          </div>

          <div class="desc-block">
            <div class="tag-wrap">
              ${isTreasure ? `<span class="tag tag-th">Treasure Hunt</span>` : ""}
              ${tag("Brand", car.brand)}
              ${tag("Series", car.series)}
              ${tag("Manufacturer", car.Manufacture || car.manufacture)}
              ${tag("Vehicle", car.VehicleType)}
              ${tag("Scale", car.Scale)}
              ${tag("Colour", car.Colour)}
              ${tag("Year", car.year)}
              ${tag("Serial", car.serial)}
              ${tag("Gifter", car.Gifter)}
              ${ownedQty > 1 ? `<span class="tag copies">📦 ${ownedQty} Pieces</span>` : ""}
            </div>
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
  `;

  const shareBtn = box.querySelector("#shareBtn");
  if (shareBtn) {
    const original = shareBtn.textContent;
    shareBtn.onclick = async () => {
      const url = `${location.origin}?car=${encodeURIComponent(car.name)}`;
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "✔ URL Copied";
      shareBtn.style.background = "var(--accent)";
      shareBtn.style.color = "#fff";
      setTimeout(() => {
        shareBtn.textContent = original;
        shareBtn.style.background = "rgba(255,255,255,0.12)";
        shareBtn.style.color = "var(--text)";
      }, 1400);
    };
  }

  const imgEl = box.querySelector("#detailsMainImg");
  const dots = box.querySelectorAll(".dot");

  /* 📱 Swipe */
  if (window.innerWidth <= 800 && imgEl) {
    let startX = 0;
    imgEl.addEventListener("touchstart", e => (startX = e.touches[0].clientX), { passive: true });
    imgEl.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 40) showImage((currentIndex - 1 + imgs.length) % imgs.length);
      else if (dx < -40) showImage((currentIndex + 1) % imgs.length);
    });
  }

  function showImage(i) {
    if (!imgs[i] || !imgEl) return;
    imgEl.src = imgs[i];
    dots.forEach((d, x) => d.classList.toggle("active", x === i));
    currentIndex = i;
  }

  dots.forEach(dot => (dot.onclick = () => showImage(+dot.dataset.index)));
  box.querySelector("#detailsPrevBtn")?.addEventListener("click", () =>
    showImage((currentIndex - 1 + imgs.length) % imgs.length)
  );
  box.querySelector("#detailsNextBtn")?.addEventListener("click", () =>
    showImage((currentIndex + 1) % imgs.length)
  );

  box.querySelectorAll(".variant-badge").forEach(badge => {
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
        <img src="${escapeAttr(rc.image || rc.images?.[0] || "")}">
        <div class="related-name">${escapeHtml(rc.name)}</div>
      `;
      div.onclick = () => showDetailsModal(rc);
      rail.appendChild(div);
    });
  }

  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

/***************************************************
 * 📱 MOBILE — AUTO CLOSE DETAILS ON MENU TAP
 ***************************************************/
if (window.innerWidth <= 800) {
  document.addEventListener("click", e => {
    const dockTap = e.target.closest(".menu-item, .dock-item");
    if (!dockTap) return;
    const overlay = document.getElementById("overlay");
    if (overlay && overlay.style.display === "flex") {
      modalClose();
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}
