// js/theme.js
export function toggleTheme(){
  const btn = document.getElementById('themeToggle');
  btn.classList.add('spin');
  setTimeout(()=>btn.classList.remove('spin'),360);
  document.body.classList.toggle('dark');
  btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

// wire to global so inline fallback or other modules can call
window.toggleTheme = toggleTheme;

// init: attach handler to theme button
export function initTheme(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click', toggleTheme);
}
