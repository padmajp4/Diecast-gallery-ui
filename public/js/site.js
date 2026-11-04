// js/site.js — page-level scripts (kept out of index.html so the
// Content-Security-Policy can forbid inline scripts).
//
// Add analytics or a cookie banner here if you need one, and allow its
// domain in public/_headers → Content-Security-Policy (script-src / connect-src).

/* Optional: block the right-click menu (makes casual image saving a little harder) */
// document.addEventListener("contextmenu", e => e.preventDefault());

console.log(
  "%cDiecast Gallery%c — open source: https://github.com/padmajp4/Diecast-gallery-ui",
  "color:#ff2d2d;font-weight:700;font-size:14px",
  "color:inherit"
);
