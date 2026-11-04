// js/exchange.js
import { showDetailsModal } from './modal.js?v=12';
import { carThumbAttrs } from './carImage.js?v=3';

let exchangeCars = [];

/********************************************
 * INIT EXCHANGE PAGE
 ********************************************/
export function initExchange(cars) {
  if (!Array.isArray(cars)) return;

  // Cars with more than 1 owned copy
  exchangeCars = cars.filter(c =>
    Number(c.ownership?.quantity || 1) > 1
  );

  renderExchange();
}

/********************************************
 * RENDER
 ********************************************/
function renderExchange() {
  const container = document.getElementById("exchangeGrid");
  if (!container) return;

  container.innerHTML = "";

  if (!exchangeCars.length) {
    container.innerHTML = `
      <div class="home-empty">
        <p>No exchangeable models at the moment.</p>
      </div>
    `;
    return;
  }

  exchangeCars.forEach(car => {
    const card = document.createElement("div");
    card.className = "card";


    const qty = car.ownership?.quantity || 1;

    card.innerHTML = `
      <div class="exchange-badge">📦 ${qty} Pieces</div>
      <img class="car-img" ${carThumbAttrs(car)} alt="${escapeHtml(car.name)}" loading="lazy" decoding="async">
      <div class="card-title">${escapeHtml(car.name)}</div>
    `;

    card.onclick = () => showDetailsModal(car);
    container.appendChild(card);
  });
}

/********************************************
 * HELPERS
 ********************************************/
function escapeHtml(s) {
  return s
    ? String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    : "";
}

