export const APP_CONFIG = {
  // -------------------------
  // DATA
  // dataUrl: the Worker API (D1). If it can't be reached (plain static
  // hosting, or a local static server), the site falls back to sampleDataUrl.
  // Set sampleDataUrl to "" once your own data is live.
  // -------------------------
  dataUrl: "/api/cars",
  sampleDataUrl: "data/sample-cars.json",

  // -------------------------
  // HOME PAGE SECTION TOGGLES
  // -------------------------
  showHero: true,
  showStats: true,
  showTopBrands: true,
  showRecent: true,
  showTopGifters: true,
  showTreasureHunts: true,
  showVariants: true,    // "Collected in multiples" (cars you own in several versions)
  // -------------------------
  // CAROUSEL SETTINGS
  // -------------------------
  heroAutoplay: true,
  heroAutoplayInterval: 5000, // ms
  heroPauseOnHover: true,

  // -------------------------
  // GIFTER SETTINGS
  // -------------------------
  maxGifters: 3,        // limit gifter count
  showGifterGlow: true, // gold/silver/bronze glow
  gifterIconSize: 100,  // px

  // -------------------------
  // HOME PAGE CUSTOMIZATION
  // -------------------------
  recentCount: 3,       // show top 3 recents
  topBrandsLimit: 7,    // show top 5 brands
  featuredLimit: 5,     // max cars in hero carousel

  // -------------------------
  // SERIES TRACKER
  // Total known cars per series. If a series is not listed here,
  // the tracker just shows count owned with no progress bar.
  // -------------------------
  showSeriesTracker: true,
  seriesLimits: {
    // "Series Name": totalCarsInSeries
    // Example: "Hot Wheels Mainline 2024": 250
  },

  // -------------------------
  // EXPERIMENTAL / FUTURE
  // -------------------------
  enableLazyLoadImages: false,
  enableHeroDescription: true,
  debugMode: false,


  placeholderImage: "images/default_placeholder.webp",

  // -------------------------
  // CAR COLOUR MAP
  // Single colour → hex string. Two colours → [hex1, hex2] (renders as gradient).
  // Keys are lowercase. Unknown colours fall back to a neutral pill.
  // -------------------------
  CAR_COLOURS: {
    "black":          "#1c1c1c",
    "black-graphics": "#1c1c1c",
    "blue":           "#2563eb",
    "blue black":     ["#2563eb", "#1c1c1c"],
    "blue green":     ["#2563eb", "#16a34a"],
    "blue-green":     ["#2563eb", "#16a34a"],
    "bluegreen":      ["#2563eb", "#16a34a"],
    "dark red":       "#8b0000",
    "desert yellow":  "#d4a017",
    "gold":           "#d4af37",
    "green":          "#16a34a",
    "grey":           "#6b7280",
    "grey red":       ["#6b7280", "#dc2626"],
    "orange":         "#ea580c",
    "pantone 021":    "#fe5000",
    "pink":           "#ec4899",
    "red":            "#dc2626",
    "red,black":      ["#dc2626", "#1c1c1c"],
    "red-graphics":   "#dc2626",
    "silver":         "#b0b8c1",
    "stealth black":  "#1c1c1c",
    "violet":         "#7c3aed",
    "white":          "#f0f0f0",
    "yellow":         "#eab308",
  },
};
