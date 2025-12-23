// js/modal.js
import { APP_CONFIG } from "./config.js";

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

  /*************** BRAND LOGO (FROM CONFIG) ***************/
  const brandLogos = APP_CONFIG.brandLogos || {};
  const brandImg =
    brandLogos[car.brand] || brandLogos.default || "";

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
                  ${imgs
                    .map(
                      (_, i) =>
                        `<span class="dot ${
                          i === 0 ? "active" : ""
                        }" data-index="${i}"></span>`
                    )
                    .join("")}
                </div>
              `
              : ""
          }

          <button id="shareBtn" class="share-btn">
            🔗 Share This Car
          </button>
        </div>

        <div class="right-column">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 class="car-title">${escapeHtml(car.name || "Unnamed Model")}</h2>
            ${brandImg ? `<img src="${brandImg}" class="brand-logo-under">` : ""}
          </div>

          ${
            hasVariants
              ? `
                <div class="variant-selector">
                  ${variants
                    .map(
                      v => `
                    <span class="tag variant-badge ${
                      v === car ? "active" : ""
                    }"
                      data-variant="${escapeAttr(v.variantId)}">
                      ${escapeHtml(getFriendlyVariantLabel(v))}
                    </span>`
                    )
                    .join("")}
                </div>
              `
              : ""
          }

          <div class="desc-block">
            <div class="desc-title">DESCRIPTION</div>
            <p class="desc-text">${escapeHtml(
              car.description || "No description available."
            )}</p>
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
              ${
                ownedQty > 1
                  ? `<span class="tag copies">📦 ${ownedQty} Pieces</span>`
                  : ""
              }
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

  /*************** SHARE ***************/
  const shareBtn = box.querySelector("#shareBtn");
  if (shareBtn) {
    const original = shareBtn.textContent;
    shareBtn.onclick = async () => {
      const url = `${location.origin}?car=${encodeURIComponent(car.name)}`;
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "✔ URL Copied";
      setTimeout(() => (shareBtn.textContent = original), 1400);
    };
  }

  /*************** CAROUSEL ***************/
  const imgEl = box.querySelector("#detailsMainImg");
  const dots = box.querySelectorAll(".dot");

  function showImage(i) {
    if (!imgs[i] || !imgEl) return;
    imgEl.src = imgs[i];
    dots.forEach((d, x) => d.classList.toggle("active", x === i));
    currentIndex = i;
  }

  dots.forEach(dot =>
    dot.addEventListener("click", () =>
      showImage(+dot.dataset.index)
    )
  );

  box.querySelector("#detailsPrevBtn")?.addEventListener("click", () =>
    showImage((currentIndex - 1 + imgs.length) % imgs.length)
  );
  box.querySelector("#detailsNextBtn")?.addEventListener("click", () =>
    showImage((currentIndex + 1) % imgs.length)
  );

  /*************** VARIANT SWITCH ***************/
  box.querySelectorAll(".variant-badge").forEach(badge => {
    badge.onclick = () => {
      const selected = variants.find(
        v => v.variantId === badge.dataset.variant
      );
      if (selected) showDetailsModal(selected);
    };
  });

  /*************** RELATED ***************/
  const rail = box.querySelector("#relatedRail");
  const section = box.querySelector(".related-section");

  if (window.ALL_CARS && rail && section) {
    rail.innerHTML = "";
    const manu = (car.Manufacture || car.manufacture || "").toLowerCase();

    const related = window.ALL_CARS.filter(
      c =>
        (c.Manufacture || c.manufacture || "").toLowerCase() === manu &&
        c !== car
    );

    if (!related.length) section.style.display = "none";
    else
      related.slice(0, 50).forEach(rc => {
        const div = document.createElement("div");
        div.className = "related-item";
        div.innerHTML = `
          <img src="${escapeAttr(rc.images?.[0] || "")}">
          <div class="related-name">${escapeHtml(rc.name)}</div>
        `;
        div.onclick = () => showDetailsModal(rc);
        rail.appendChild(div);
      });
  }

  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}
