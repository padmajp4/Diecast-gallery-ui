// js/carImage.js — single source of truth for car image src + fallbacks
import { APP_CONFIG } from './config.js';

export const PLACEHOLDER_IMG = APP_CONFIG.placeholderImage || 'images/default_placeholder.webp';
export const INCOMING_IMG    = 'images/upcoming-placeholder-800.webp';

/* First real image for a car, or '' */
export function realCarImage(car) {
  if (!car) return '';
  if (Array.isArray(car.images) && car.images.length && car.images[0]) return car.images[0];
  if (car.featuredImage) return car.featuredImage;
  if (typeof car.image === 'string' && car.image) return car.image;
  return '';
}

/* Fallback image for a car that has no (working) photo */
export function fallbackCarImage(car) {
  return car?.isIncoming ? INCOMING_IMG : PLACEHOLDER_IMG;
}

/* Always returns something renderable */
export function carImageSrc(car) {
  return realCarImage(car) || fallbackCarImage(car);
}

/* 480px thumbnail stored next to each car photo (images/cars/thumbs/<name>) */
export function thumbOf(url) {
  if (!url || !url.includes('/images/cars/') || url.includes('/images/cars/thumbs/')) return url;
  return url.replace('/images/cars/', '/images/cars/thumbs/');
}

/*
 * Attributes for a small car image: thumbnail first, then the full photo,
 * then the placeholder. `src` is optional when the caller preloads.
 */
export function carThumbAttrs(car, { src = true, url } = {}) {
  const real = url || realCarImage(car);
  const fallback = fallbackCarImage(car);
  const thumb = real ? thumbOf(real) : fallback;
  const e = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return [
    src ? `src="${e(thumb)}"` : '',
    real && thumb !== real ? `data-full="${e(real)}"` : '',
    `data-fallback="${e(fallback)}"`,
  ].filter(Boolean).join(' ');
}

/*
 * Declarative image behaviour (no inline onload/onerror, so the CSP can forbid them):
 *   data-loaded-class="x"   → add class x once the image loads
 *   data-on-error="hide" | "hide-parent" | "swap" (+ data-swap-src, data-swap-class)
 *   class="car-img"         → on error try data-full (thumb → full photo), then
 *                             data-fallback / the placeholder (once)
 * Capture phase because 'load' / 'error' don't bubble.
 */
export function installCarImageFallback() {
  document.addEventListener('load', e => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.dataset.loadedClass) img.classList.add(img.dataset.loadedClass);
  }, true);

  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;

    const action = img.dataset.onError;
    if (action === 'hide') { img.style.display = 'none'; return; }
    if (action === 'hide-parent') { if (img.parentElement) img.parentElement.style.display = 'none'; return; }
    if (action === 'swap' && img.dataset.swapSrc) {
      delete img.dataset.onError;
      if (img.dataset.swapClass) img.className = img.dataset.swapClass;
      img.src = img.dataset.swapSrc;
      return;
    }

    if (!img.classList.contains('car-img')) return;
    // Thumbnail missing → try the full photo before the placeholder
    if (img.dataset.full && !img.dataset.triedFull) {
      img.dataset.triedFull = '1';
      img.src = img.dataset.full;
      return;
    }
    if (img.dataset.fellBack) return;
    img.dataset.fellBack = '1';
    img.src = img.dataset.fallback || PLACEHOLDER_IMG;
  }, true);
}
