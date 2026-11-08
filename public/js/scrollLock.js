// js/scrollLock.js — freeze the page behind a popup.
// `overflow: hidden` on <body> isn't enough on iOS Safari (the page still scrolls
// when a popup's own content reaches its end), so pin the body in place instead
// and restore the scroll position afterwards. Each popup locks under its own key,
// so re-opening one (e.g. switching cars in the details popup) can't leak a lock.

const owners = new Set();
let savedY = 0;

export function lockScroll(owner) {
  if (owners.has(owner)) return;
  owners.add(owner);
  if (owners.size > 1) return;
  savedY = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%' });
}

export function unlockScroll(owner) {
  if (!owners.delete(owner) || owners.size) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
  window.scrollTo(0, savedY);
}
