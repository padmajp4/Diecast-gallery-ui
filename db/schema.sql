-- Diecast Gallery — D1 (SQLite) schema
-- Apply with: npx wrangler d1 execute diecast-db --remote --file db/schema.sql

CREATE TABLE IF NOT EXISTS cars (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  serial           TEXT,                 -- your own catalogue number, e.g. CW-001
  brand            TEXT,                 -- toy brand: Hot Wheels, Matchbox, Tomica…
  series           TEXT,                 -- Mainline, Car Culture…
  manufacture      TEXT,                 -- real-car maker: Ferrari, Nissan… ("Fantasy" for originals)
  year             TEXT,
  vehicle_type     TEXT,
  colour           TEXT,
  scale            TEXT,
  description      TEXT,
  images           TEXT,                 -- JSON array of image URLs
  featured         INTEGER DEFAULT 0,    -- shown in the home "Hall of Fame"
  featured_image   TEXT,
  gifter           TEXT,                 -- who gave it to you (Top Gifters section)
  source           TEXT,                 -- where you got it
  is_treasure_hunt INTEGER DEFAULT 0,
  model            TEXT,                 -- groups variants of the same casting
  variant_id       TEXT,
  variant_label    TEXT,
  ownership        TEXT,                 -- JSON {"quantity": n} — n > 1 shows up in Exchange
  is_incoming      INTEGER DEFAULT 0,    -- ordered, not in hand yet
  is_wishlist      INTEGER DEFAULT 0,
  set_name         TEXT,                 -- themed sets / multipacks
  set_number       TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cars_serial   ON cars(serial);
CREATE INDEX IF NOT EXISTS idx_cars_brand    ON cars(brand);
CREATE INDEX IF NOT EXISTS idx_cars_series   ON cars(series);
CREATE INDEX IF NOT EXISTS idx_cars_model    ON cars(model);
CREATE INDEX IF NOT EXISTS idx_cars_gifter   ON cars(gifter);
CREATE INDEX IF NOT EXISTS idx_cars_featured ON cars(featured);

-- Logos for themed sets (admin → Set Logos)
CREATE TABLE IF NOT EXISTS set_logos (
  set_name   TEXT PRIMARY KEY,
  logo_url   TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wiki / Wikipedia info confirmed in admin → Car Info (only 'confirmed' rows are public)
CREATE TABLE IF NOT EXISTS car_info (
  car_id     INTEGER PRIMARY KEY,
  status     TEXT NOT NULL,              -- 'confirmed' | 'skipped'
  data       TEXT,                       -- JSON {casting, version, realCar}
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
