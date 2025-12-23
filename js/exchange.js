// js/exchange.js
import { showDetailsModal } from './modal.js';
import { APP_CONFIG } from './config.js';

/********************************************
 * STATE
 ********************************************/
let exchangeCars = [];

/********************************************
 * INIT EXCHANGE PAGE
 ********************************************/
export function initExchange(cars) {
  if (!Array.isArray(cars)) return;

  // Cars with more than 1 owned copy
  exchangeCars = cars.filter(c =>
    Number(c?.ownership?.quantity || 1) > 1
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
        <p>No exchangeable models available.</p>
      </div>
    `;
    return;
  }

  exchangeCars.forEach(car => {
    const card = document.createElement("div");
    card.className = "card";

    const img =
      Array.isArray(car.images) && car.images.length
        ? car.images[0]
        : APP_CONFIG.placeholderImage || "";

    const qty = Number(car?.ownership?.quantity || 1);

    card.innerHTML = `
      <div class="exchange-badge">📦 ${qty} Copies</div>
      <img src="${img}" alt="${escapeHtml(car.name)}">
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
