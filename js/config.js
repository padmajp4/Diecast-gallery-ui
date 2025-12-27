// js/config.js

export const APP_CONFIG = {
  // -------------------------
  // DATA SOURCE
  // -------------------------
  // Can be a local file (cars.json) or a remote URL
  DATA_SOURCE_URL: "js/cars.json",

  // -------------------------
  // HOME PAGE SECTION TOGGLES
  // -------------------------
  showHero: true,
  showStats: true,
  showTopBrands: true,
  showRecent: true,
  showTopGifters: true,
  showTreasureHunts: true,

  // -------------------------
  // CAROUSEL SETTINGS
  // -------------------------
  heroAutoplay: true,
  heroAutoplayInterval: 5000, // ms
  heroPauseOnHover: true,

  // -------------------------
  // GIFTER SETTINGS
  // -------------------------
  maxGifters: 3,          // limit gifter count ( You can add more but, add an gifter icon as well)
  showGifterGlow: true,  // gold/silver/bronze glow
  gifterIconSize: 100,   // px

  // -------------------------
  // HOME PAGE CUSTOMIZATION
  // -------------------------
  recentCount: 3,        // show top N recent items
  topBrandsLimit: 5,     // show top N brands

  // -------------------------
  // EXPERIMENTAL / FUTURE
  // -------------------------
  enableLazyLoadImages: false,
  enableHeroDescription: true,
  debugMode: false,

 BRAND_LOGOS: {
    "Hot Wheels": "assets/brands/hotwheels.png",
    "Matchbox": "assets/brands/matchbox.png",
    "Majorette": "assets/brands/majorette.png",
    "Tomica": "assets/brands/tomica.png",
    "Maisto": "assets/brands/maisto.png",
    "Greenlight": "assets/brands/greenlight.png",
    "Jada": "assets/brands/jada.png",
    "Welly": "assets/brands/welly.png",
    "Kinsmart": "assets/brands/kinsmart.png",
    "CCA": "assets/brands/cca.png",
    default: "assets/brands/default.png"
  }
,

  // -------------------------
  // FALLBACKS / UI
  // -------------------------
  placeholderImage: "images/default_placeholder.webp"
};
