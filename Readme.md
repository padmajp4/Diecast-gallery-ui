# Diecast Archive

A **frontend-only diecast collection dashboard** designed to catalogue, browse, and present a personal diecast car collection with clarity and minimal operational overhead.

This project intentionally avoids backend dependencies, favoring a **static, automation-friendly architecture** that is easy to deploy, maintain, and extend.

**Live Demo:** https://www.diecast.padmajp.com/

---

## Overview

Diecast Archive is built as a lightweight digital archive rather than a traditional web application.  
It focuses on discoverability, visual presentation, and long-term maintainability using only static assets and vanilla JavaScript.

The project is well suited for:
- Personal diecast collectors
- Static hosting environments
- Automation-driven data pipelines (Sheets → JSON → Deploy)
- Portfolio or showcase use cases

---

## Key Features

- **Garage View**  
  Full collection browsing with pagination, sorting, and multi-criteria filtering.

- **Dashboard Home**  
  Collection statistics, Hall of Fame highlights, Treasure Hunts, recent additions, and brand distribution.

- **Variant-Aware Models**  
  Supports multiple variants of the same casting with in-modal switching.

- **Exchange Identification**  
  Automatically identifies models with multiple owned copies.

- **Image Carousel**  
  Multi-image viewer with navigation controls and indicators.

- **Deep Linking**  
  Shareable URLs that open a specific model directly.

- **Theme Support**  
  Native light and dark mode switching.

- **Zero Backend**  
  Runs entirely on static hosting with a JSON data source.

---

## Technical Architecture

- **Frontend:** HTML, CSS, Vanilla JavaScript (ES Modules)  
- **Data Source:** Static JSON (local or remote)  
- **State Management:** In-memory, session-scoped  
- **Hosting:** Any static hosting provider

### High-Level Flow

```
cars.json / remote JSON
        ↓
     app.js
        ↓
  home.js | allCars.js | exchange.js
        ↓
     modal.js
```

---

## Project Structure

```
/
├── index.html
├── styles.css
├── cars.json              # Collection data
├── js/
│   ├── app.js             # Bootstrap, routing, data loading
│   ├── config.js          # Feature flags and settings
│   ├── home.js            # Home dashboard
│   ├── allCars.js         # Garage view and filters
│   ├── exchange.js        # Exchange logic
│   ├── modal.js           # Details modal
│   └── theme.js           # Theme handling
├── images/
├── brands/
├── assets/
└── gifters/
```

---

## Data Model

Each model is represented as a single JSON object.

### Minimal Example

```json
{
  "name": "Audi Quattro",
  "serial": "CW-004",
  "brand": "Hot Wheels",
  "series": "Mainline",
  "Manufacture": "Audi",
  "year": 1987,
  "VehicleType": "Car",
  "Colour": "White",
  "Scale": "1/64",
  "images": [
    "https://example.com/audi.webp"
  ],
  "featured": false,
  "isTreasurehunt": false,
  "ownership": {
    "quantity": 1
  }
}
```

### Supported Optional Fields

- `featuredImage` — Used in the home hero section  
- `Gifter` — Enables gifter-based grouping  
- `model` — Groups related variants  
- `ownership.quantity` — Enables exchange detection  

---

## Configuration

All runtime behavior is controlled via `js/config.js`.

```js
export const APP_CONFIG = {
  DATA_SOURCE_URL: "cars.json",

  showHero: true,
  showStats: true,
  showTopBrands: true,
  showRecent: true,
  showTopGifters: true,
  showTreasureHunts: true,

  recentCount: 3,
  topBrandsLimit: 5,

  placeholderImage: "images/default_placeholder.webp"
};
```

No build steps or environment variables are required.

---

## Deep Linking

Individual models can be shared using query parameters:

```
https://example.com/?car=BMW%20M1
```

On load, the application resolves the model and opens the corresponding modal automatically.

---

## Deployment

Diecast Archive can be deployed to any static hosting provider:

- GitHub Pages
- Firebase Hosting
- Netlify
- Vercel (static export)
- Any CDN-backed static server

No server-side configuration is required.

---

## Design Principles

- Favor clarity and maintainability over abstraction
- Keep logic explicit and debuggable
- Avoid unnecessary dependencies
- Treat the project as a long-lived digital archive

---

## Roadmap (Optional)

- Image CDN integration (Cloudinary / Firebase)
- Automated Google Sheets → JSON ingestion
- Per-model Open Graph image generation
- Offline support via Service Workers
- Collection analytics and insights

---

## License

MIT License.

---

## Author Notes

This project was built as a personal initiative to explore frontend architecture, UI design, and automation-friendly workflows, while keeping long-term maintenance cost close to zero.
