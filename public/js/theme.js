// js/theme.js

/***************************************************
 * FORCE ICON THEME SYNC (BOOTSTRAP SAFE)
 ***************************************************/
window.__syncIcons = function () {
  const dark = document.body.classList.contains("dark");
  document.querySelectorAll("img[data-light][data-dark]").forEach(img => {
    img.src = dark ? img.dataset.dark : img.dataset.light;
  });
};

/***************************************************
 * THEME TOGGLE
 ***************************************************/
export function toggleTheme(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;

  btn.classList.add('spin');
  setTimeout(()=>btn.classList.remove('spin'),360);

  document.body.classList.toggle('dark');
  btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';

  // 🔔 HARD refresh icons + notify UI
  window.__syncIcons();
  window.dispatchEvent(new Event("themeChanged"));
}

// wire to global so inline fallback or other modules can call
window.toggleTheme = toggleTheme;

/***************************************************
 * INIT
 ***************************************************/
export function initTheme(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click', toggleTheme);

  // initial sync (page load safety)
  window.__syncIcons();
}

/********************************************
 * SMOOTH THEME MORPH (NO BLINK VERSION)
 ********************************************/
function morphTheme() {
  const sidebar = document.querySelector(".sidebar");
  const dock = document.querySelector(".mobile-dock");

  if (sidebar) sidebar.style.visibility = "hidden";
  if (dock) dock.style.visibility = "hidden";

  requestAnimationFrame(() => {
    document.body.classList.add("theme-morph");

    window.__syncIcons();   // preload icons before reveal

    setTimeout(() => {
      if (sidebar) sidebar.style.visibility = "";
      if (dock) dock.style.visibility = "";
      document.body.classList.remove("theme-morph");
    }, 220);
  });
}


/***************************************************
 * DESKTOP SIDEBAR ICON THEME SYNC
 ***************************************************/
function syncSidebarIcons() {
  window.__syncIcons(); // unified pipeline
}
window.addEventListener("themeChanged", syncSidebarIcons);

/***************************************************
 * SAFETY: FULL LOAD RESYNC
 ***************************************************/
window.addEventListener("load", () => window.__syncIcons());

document.addEventListener("DOMContentLoaded", () => window.__syncIcons());