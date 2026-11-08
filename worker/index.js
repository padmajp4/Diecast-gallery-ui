/**
 * Diecast Gallery — Cloudflare Worker
 *
 * Sits in front of the Cloudflare Pages site and adds:
 *   /api/*        public JSON API backed by D1
 *   /admin/api/*  authenticated admin API (cars, images → GitHub, set logos, car info)
 *   /img/*        long-cache proxy for images stored in a GitHub repo
 *   /sitemap.xml  generated from D1
 *   ?car=<name>   share links with per-car Open Graph tags
 * Everything else is passed through to Pages.
 *
 * Configuration lives in wrangler.toml [vars] (see README → Configuration).
 * Secrets: ADMIN_SECRET (admin password), GITHUB_TOKEN (image uploads).
 */

let ORIGIN_URL, SITE_URL, GITHUB_REPO, GITHUB_BRANCH, GITHUB_RAW_PREFIX;
let DEFAULT_OG_IMAGE, DEFAULT_TITLE, DEFAULT_DESC;

/* Same path + query on the Pages origin (works whatever hostname the Worker is reached on) */
function toOrigin(request) {
  const u = new URL(request.url);
  return ORIGIN_URL + u.pathname + u.search;
}

function configure(env) {
  const trim = u => String(u || "").replace(/\/+$/, "");
  ORIGIN_URL        = trim(env.ORIGIN_URL);               // e.g. https://my-diecast.pages.dev
  SITE_URL          = trim(env.SITE_URL);                 // e.g. https://diecast.example.com
  GITHUB_REPO       = env.GITHUB_REPO || "";              // e.g. you/diecast-images
  GITHUB_BRANCH     = env.GITHUB_BRANCH || "main";
  GITHUB_RAW_PREFIX = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/`;
  DEFAULT_TITLE     = env.SITE_TITLE || "My Diecast Collection";
  DEFAULT_DESC      = env.SITE_DESCRIPTION || "Explore my diecast collection with detailed car pages, galleries, and more.";
  DEFAULT_OG_IMAGE  = `${SITE_URL}/og-image.webp`;
}

const SECURITY_HEADERS = [
  "content-security-policy", "x-frame-options", "x-content-type-options",
  "referrer-policy", "strict-transport-security", "permissions-policy",
];

// Cache keys
const CACHE_KEY_CARS   = "https://diecast-internal/api/cars";
const CACHE_KEY_HTML   = "https://diecast-internal/index.html";
const CACHE_TTL_CARS   = 300;  // 5 min
const CACHE_TTL_HTML   = 600;  // 10 min

const IMAGE_EXT_RE = /\.(webp|jpe?g|png|gif|avif)$/i;
const IMAGE_TYPES  = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", avif: "image/avif" };


const CAR_COLS = [
  "name","serial","brand","series","manufacture","year","vehicle_type",
  "colour","scale","description","images","featured","featured_image",
  "gifter","source","is_treasure_hunt","model","variant_id","variant_label","ownership",
  "is_incoming","set_name","set_number","is_wishlist",
];

export default {
  async fetch(request, env, ctx) {
    configure(env);
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(path) });
    }

    // Public API
    if (path === "/api/cars" && method === "GET")
      return handleApiCars(request, env, ctx);

    const carIdMatch = path.match(/^\/api\/cars\/(\d+)$/);
    if (carIdMatch && method === "GET")
      return handleApiCar(env, parseInt(carIdMatch[1]));

    if (path === "/api/set-logos" && method === "GET")
      return handleGetSetLogos(env);

    if (path === "/sitemap.xml" && method === "GET")
      return handleSitemap(env, ctx);

    const infoMatch = path.match(/^\/api\/car-info\/(\d+)$/);
    if (infoMatch && method === "GET")
      return handleGetCarInfo(env, parseInt(infoMatch[1]));

    // Image proxy — serves GitHub raw images with long browser + edge cache
    if (path.startsWith("/img/") && method === "GET")
      return handleImageProxy(request, ctx, path);

    // Admin API (auth required)
    if (path.startsWith("/admin/api/")) {
      const auth = await checkAuth(request, env);
      if (auth === "locked")
        return adminJson({ error: "Too many failed attempts. Try again later." }, 429);
      if (!auth)
        return adminJson({ error: "Unauthorized" }, 401);
      return handleAdminApi(request, env, ctx, path, method);
    }

    // OG injection
    const carParam = url.searchParams.get("car");
    if (carParam)
      return handleOgInjection(request, env, ctx, carParam);

    // Pass through to Pages. App routes are rewritten to index.html by _redirects;
    // unknown paths get Pages' 404.html with a real 404 status (no soft 404s).
    return fetch(new Request(toOrigin(request), request));
  },
};

/* ══════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════ */
async function handleApiCars(request, env, ctx) {
  const url       = new URL(request.url);
  const bustCache = url.searchParams.has("_");   // ?_=timestamp bypasses cache
  const cache     = caches.default;
  const cacheKey  = new Request(CACHE_KEY_CARS);

  if (!bustCache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  try {
    const result = await env.diecast_db
      .prepare("SELECT * FROM cars ORDER BY id DESC")
      .all();
    const body = JSON.stringify(result.results.map(deserialise));
    const resp = new Response(body, {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*",
        "cache-control": `public, max-age=${CACHE_TTL_CARS}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  } catch (err) {
    console.error("handleApiCars:", err);
    return pubJson({ error: "Internal server error" }, 500);
  }
}

async function handleApiCar(env, id) {
  try {
    const row = await env.diecast_db
      .prepare("SELECT * FROM cars WHERE id = ?")
      .bind(id).first();
    if (!row) return pubJson({ error: "Not found" }, 404);
    return pubJson(deserialise(row));
  } catch (err) {
    console.error("handleApiCar:", err);
    return pubJson({ error: "Internal server error" }, 500);
  }
}

/* ══════════════════════════════════════════════════════════════
   ADMIN API
══════════════════════════════════════════════════════════════ */
async function handleAdminApi(request, env, ctx, path, method) {
  try {
    if (path === "/admin/api/ping")
      return adminJson({ ok: true });

    if (path === "/admin/api/next-serial" && method === "GET")
      return handleNextSerial(env);

    if (path === "/admin/api/upload" && method === "POST")
      return handleUpload(request, env);

    if (path === "/admin/api/cars" && method === "POST") {
      const res = await handleCreateCar(request, env);
      await bustCarsCache();
      return res;
    }

    const m = path.match(/^\/admin\/api\/cars\/(\d+)$/);
    if (m) {
      const id = parseInt(m[1]);
      if (method === "PUT") {
        const res = await handleUpdateCar(request, env, id);
        await bustCarsCache();
        return res;
      }
      if (method === "DELETE") {
        const res = await handleDeleteCar(env, id);
        await bustCarsCache();
        return res;
      }
    }

    if (path === "/admin/api/set-logos" && method === "POST")
      return handleSaveSetLogo(request, env);

    const logoMatch = path.match(/^\/admin\/api\/set-logos\/(.+)$/);
    if (logoMatch && method === "DELETE")
      return handleDeleteSetLogo(env, decodeURIComponent(logoMatch[1]));

    if (path === "/admin/api/car-info" && method === "GET")
      return handleListCarInfo(env);

    const infoMatch = path.match(/^\/admin\/api\/car-info\/(\d+)$/);
    if (infoMatch && method === "PUT")
      return handleSaveCarInfo(request, env, parseInt(infoMatch[1]));
    if (infoMatch && method === "DELETE")
      return handleDeleteCarInfo(env, parseInt(infoMatch[1]));

    return adminJson({ error: "Not found" }, 404);
  } catch (err) {
    console.error("handleAdminApi:", err);
    return adminJson({ error: "Internal server error" }, 500);
  }
}

async function bustCarsCache() {
  const cache = caches.default;
  await Promise.all([
    cache.delete(new Request(CACHE_KEY_CARS)),
    cache.delete(new Request(CACHE_KEY_SITEMAP)),
  ]);
}

/* ── Next serial ── */
async function handleNextSerial(env) {
  const row = await env.diecast_db
    .prepare("SELECT serial FROM cars WHERE serial LIKE 'CW-%' ORDER BY CAST(SUBSTR(serial,4) AS INTEGER) DESC LIMIT 1")
    .first();
  let next = 1;
  if (row?.serial) {
    const m = row.serial.match(/CW-(\d+)/);
    if (m) next = parseInt(m[1]) + 1;
  }
  return adminJson({ serial: `CW-${String(next).padStart(3, "0")}` });
}

/* ── Upload image → GitHub ── */
// Optional `thumbBase64` is stored at images/cars/thumbs/<same name> for grids/lists.
async function handleUpload(request, env) {
  const { filename, base64, thumbBase64 } = await request.json();
  if (!filename || !base64) return adminJson({ error: "filename and base64 required" }, 400);
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^[._]+/, "");
  if (!IMAGE_EXT_RE.test(safeName)) return adminJson({ error: "Only image files can be uploaded" }, 400);

  const filePath = `images/cars/${safeName}`;
  if (!(await putGitHubFile(filePath, base64, env))) return adminJson({ error: "Image upload failed" }, 502);
  if (thumbBase64 && !(await putGitHubFile(`images/cars/thumbs/${safeName}`, thumbBase64, env)))
    console.error("Thumbnail upload failed:", safeName); // full image is fine; site falls back to it

  return adminJson({ url: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}` });
}

async function putGitHubFile(filePath, base64, env) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  const checkRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "diecast-admin" },
  });

  const name = filePath.split("/").pop();
  const body = { message: `Add car image: ${name}`, content: base64, branch: GITHUB_BRANCH };
  if (checkRes.ok) {
    const existing = await checkRes.json();
    body.sha = existing.sha ?? existing.content?.sha;
    body.message = `Update car image: ${name}`;
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "diecast-admin",
    },
    body: JSON.stringify(body),
  });
  if (!putRes.ok) console.error("GitHub upload:", filePath, await putRes.text());
  return putRes.ok;
}

/* ── Create car ── */
async function handleCreateCar(request, env) {
  const data = await request.json();
  const imgs = tryParseJson(data.images, []).map(unproxyImgUrl);
  data.images = JSON.stringify(imgs);
  if (data.featured_image) data.featured_image = unproxyImgUrl(data.featured_image);
  const result = await env.diecast_db
    .prepare(`INSERT INTO cars (${CAR_COLS.join(",")}) VALUES (${CAR_COLS.map(()=>"?").join(",")})`)
    .bind(...CAR_COLS.map(c => data[c] ?? null))
    .run();
  return adminJson({ id: result.meta.last_row_id }, 201);
}

/* ── Update car ── */
async function handleUpdateCar(request, env, id) {
  const data = await request.json();

  // Convert /img/ proxy URLs back to raw GitHub URLs before D1 storage
  const newImgs = tryParseJson(data.images, []).map(unproxyImgUrl);
  data.images = JSON.stringify(newImgs);
  if (data.featured_image) data.featured_image = unproxyImgUrl(data.featured_image);

  // Find image URLs removed in this update and delete them from GitHub
  const row = await env.diecast_db.prepare("SELECT images FROM cars WHERE id=?").bind(id).first();
  if (row) {
    const oldUrls = tryParseJson(row.images, []);
    const removed = oldUrls.filter(u => !newImgs.includes(u));
    await deleteUnreferencedImages(removed, env, id);
  }

  await env.diecast_db
    .prepare(`UPDATE cars SET ${CAR_COLS.map(c=>`${c}=?`).join(",")}, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(...CAR_COLS.map(c => data[c] ?? null), id)
    .run();
  return adminJson({ ok: true });
}

/* ── Delete car ── */
async function handleDeleteCar(env, id) {
  const row = await env.diecast_db.prepare("SELECT images FROM cars WHERE id=?").bind(id).first();
  await env.diecast_db.prepare("DELETE FROM cars WHERE id=?").bind(id).run();
  await env.diecast_db.prepare("DELETE FROM car_info WHERE car_id=?").bind(id).run();
  if (row) await deleteUnreferencedImages(tryParseJson(row.images, []), env, id);
  return adminJson({ ok: true });
}

/* Duplicated cars share image files — only delete a file from GitHub when no
   other car (images / featured image) or set logo still points at it. */
async function deleteUnreferencedImages(urls, env, carId) {
  await Promise.allSettled([...new Set(urls)].map(async url => {
    const inUse = await env.diecast_db.prepare(
      "SELECT 1 FROM cars WHERE id != ? AND (instr(images, ?) > 0 OR featured_image = ?) " +
      "UNION ALL SELECT 1 FROM set_logos WHERE logo_url = ? LIMIT 1"
    ).bind(carId, JSON.stringify(url), url, url).first();
    if (inUse) return;
    await deleteGitHubFile(url, env);
    if (url.includes("/images/cars/") && !url.includes("/images/cars/thumbs/"))
      await deleteGitHubFile(url.replace("/images/cars/", "/images/cars/thumbs/"), env);
  }));
}

/* ── GitHub file delete ── */
async function deleteGitHubFile(rawUrl, env) {
  // Extract repo path from raw.githubusercontent.com URL
  // e.g. https://raw.githubusercontent.com/owner/repo/branch/path/file.webp
  const match = rawUrl.match(/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)/);
  if (!match) return;
  const filePath = match[1];
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

  // Need the file's SHA to delete it
  const getRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "diecast-admin" },
  });
  if (!getRes.ok) return; // file already gone or not found

  const { sha } = await getRes.json();
  await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "diecast-admin",
    },
    body: JSON.stringify({ message: `Remove unused car image: ${filePath}`, sha, branch: GITHUB_BRANCH }),
  });
}

/* ══════════════════════════════════════════════════════════════
   OG INJECTION
══════════════════════════════════════════════════════════════ */
async function handleOgInjection(request, env, ctx, carParam) {
  // Safe decode
  let decoded;
  try { decoded = decodeURIComponent(carParam).trim(); }
  catch { return fetch(new Request(toOrigin(request), request)); }

  // Check per-car OG cache
  const cache    = caches.default;
  const ogKey    = new Request(`https://diecast-internal/og/${encodeURIComponent(decoded)}`);
  const cachedOg = await cache.match(ogKey);
  if (cachedOg) return cachedOg;

  // Fetch index.html (with its own cache)
  const htmlKey    = new Request(CACHE_KEY_HTML);
  let   cachedHtml = await cache.match(htmlKey);
  let   html;
  // Keep the page's security headers (CSP etc. from _headers) on the rewritten HTML
  const secHeaders = {};

  if (cachedHtml) {
    html = await cachedHtml.text();
    for (const h of SECURITY_HEADERS) { const v = cachedHtml.headers.get(h); if (v) secHeaders[h] = v; }
  } else {
    const pageRes = await fetch(`${ORIGIN_URL}/index.html`);
    html = await pageRes.text();
    for (const h of SECURITY_HEADERS) { const v = pageRes.headers.get(h); if (v) secHeaders[h] = v; }
    ctx.waitUntil(cache.put(htmlKey, new Response(html, {
      headers: { ...secHeaders, "content-type": "text/html;charset=UTF-8", "cache-control": `public, max-age=${CACHE_TTL_HTML}` },
    })));
  }

  // Look up car in D1
  const carRow = await env.diecast_db
    .prepare("SELECT name, brand, series, colour, images FROM cars WHERE LOWER(name)=LOWER(?)")
    .bind(decoded).first().catch(err => { console.error("OG D1 lookup:", err); return null; });

  let ogTitle = DEFAULT_TITLE;
  let ogDesc  = DEFAULT_DESC;
  let ogImage = DEFAULT_OG_IMAGE;

  if (carRow) {
    const brand  = carRow.brand  ? `${carRow.brand} · ` : "";
    const series = carRow.series ? ` · ${carRow.series}` : "";
    const colour = carRow.colour ? ` · ${carRow.colour}` : "";
    ogTitle = `${carRow.name} — ${DEFAULT_TITLE}`;
    ogDesc  = `${brand}${carRow.name}${series}${colour}. View this car in the collection.`;
    const imgs = tryParseJson(carRow.images, []);
    if (imgs[0]) ogImage = imgs[0];
  }

  const finalHtml = html
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*/, `$1${escapeAttr(ogTitle)}`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*/, `$1${escapeAttr(ogDesc)}`)
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*/, `$1${escapeAttr(ogImage)}`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*/, `$1${escapeAttr(request.url)}`);

  const resp = new Response(finalHtml, {
    headers: {
      ...secHeaders,
      "content-type": "text/html;charset=UTF-8",
      "cache-control": `public, max-age=${CACHE_TTL_CARS}`,
    },
  });
  ctx.waitUntil(cache.put(ogKey, resp.clone()));
  return resp;
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const AUTH_MAX_FAILS   = 10;
const AUTH_LOCKOUT_TTL = 900; // 15 min

async function checkAuth(request, env) {
  if (!env.ADMIN_SECRET) return false;
  const ip    = request.headers.get("cf-connecting-ip") || "unknown";
  const cache = caches.default;
  const key   = new Request(`https://diecast-internal/auth-fails/${encodeURIComponent(ip)}`);
  const fails = parseInt(await (await cache.match(key))?.text() || "0", 10);
  if (fails >= AUTH_MAX_FAILS) return "locked";

  if (safeEqual(request.headers.get("Authorization") || "", `Bearer ${env.ADMIN_SECRET}`)) return true;

  await cache.put(key, new Response(String(fails + 1), {
    headers: { "cache-control": `max-age=${AUTH_LOCKOUT_TTL}` },
  }));
  return false;
}

function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function corsHeaders(path) {
  const isAdmin = path.startsWith("/admin/api/");
  return {
    "access-control-allow-origin": isAdmin ? SITE_URL : "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-max-age": "86400",
  };
}

function pubJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "access-control-allow-origin": "*",
      "cache-control": status === 200 ? `public, max-age=${CACHE_TTL_CARS}` : "no-store",
    },
  });
}

function adminJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "access-control-allow-origin": SITE_URL,
      "cache-control": "no-store",
    },
  });
}

/* ── URL helpers ──────────────────────────────────────────── */
function proxyImgUrl(url) {
  if (!url || !url.startsWith(GITHUB_RAW_PREFIX)) return url;
  return '/img/' + url.slice(GITHUB_RAW_PREFIX.length);
}

function unproxyImgUrl(url) {
  if (!url || !url.startsWith('/img/')) return url;
  return GITHUB_RAW_PREFIX + url.slice(5);
}

/* ── Image proxy ─────────────────────────────────────────── */
async function handleImageProxy(request, ctx, path) {
  const imgPath = path.slice(5); // strip "/img/"
  if (!imgPath.startsWith('images/') || imgPath.includes('..') || !IMAGE_EXT_RE.test(imgPath))
    return new Response('Not Found', { status: 404 });

  const githubUrl = GITHUB_RAW_PREFIX + imgPath;
  const cache = caches.default;
  const cacheKey = new Request(githubUrl);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let res;
  try { res = await fetch(githubUrl); } catch {
    return new Response('Bad Gateway', { status: 502 });
  }
  if (!res.ok) return new Response('Not Found', { status: res.status });

  const resp = new Response(res.body, {
    status: 200,
    headers: {
      'content-type': IMAGE_TYPES[imgPath.match(IMAGE_EXT_RE)[1].toLowerCase()],
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'access-control-allow-origin': '*',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}

function deserialise(row) {
  return {
    id: row.id, name: row.name, serial: row.serial, brand: row.brand,
    series: row.series, Manufacture: row.manufacture, year: row.year,
    VehicleType: row.vehicle_type, Colour: row.colour, Scale: row.scale,
    description: row.description, images: tryParseJson(row.images, []).map(proxyImgUrl),
    featured: row.featured === 1, featuredImage: proxyImgUrl(row.featured_image),
    Gifter: row.gifter, source: row.source ?? null, isTreasurehunt: row.is_treasure_hunt === 1,
    model: row.model, variantId: row.variant_id, variantLabel: row.variant_label,
    ownership: tryParseJson(row.ownership, null),
    addedOn: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    isIncoming: row.is_incoming === 1,
    setName: row.set_name ?? null, setNumber: row.set_number ?? null,
    isWishlist: row.is_wishlist === 1,
  };
}

function tryParseJson(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

/* ── Set logos ──────────────────────────────────────────── */
async function handleGetSetLogos(env) {
  const { results } = await env.diecast_db.prepare(
    "SELECT set_name, logo_url FROM set_logos ORDER BY set_name"
  ).all();
  const map = {};
  for (const row of results) map[row.set_name] = proxyImgUrl(row.logo_url);
  return pubJson(map);
}

async function handleSaveSetLogo(request, env) {
  const { set_name, logo_url } = await request.json();
  if (!set_name || !logo_url) return adminJson({ error: "set_name and logo_url required" }, 400);
  await env.diecast_db.prepare(
    "INSERT INTO set_logos (set_name, logo_url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(set_name) DO UPDATE SET logo_url=excluded.logo_url, updated_at=CURRENT_TIMESTAMP"
  ).bind(set_name, logo_url).run();
  return adminJson({ ok: true });
}

async function handleDeleteSetLogo(env, setName) {
  await env.diecast_db.prepare("DELETE FROM set_logos WHERE set_name = ?").bind(setName).run();
  return adminJson({ ok: true });
}

/* ── Sitemap (built from D1 so new cars/brands/sets appear automatically) ── */
const CACHE_KEY_SITEMAP = "https://diecast-internal/sitemap.xml";
const SITEMAP_HIDDEN_MAKES = new Set(["fantasy"]);

async function handleSitemap(env, ctx) {
  const cache = caches.default;
  const key   = new Request(CACHE_KEY_SITEMAP);
  const hit   = await cache.match(key);
  if (hit) return hit;

  const { results } = await env.diecast_db
    .prepare("SELECT name, manufacture, set_name, updated_at FROM cars WHERE is_wishlist = 0")
    .all();

  const urls = new Map(); // loc → lastmod
  const add = (loc, lastmod = "") => { if (!urls.has(loc)) urls.set(loc, lastmod); };
  for (const p of ["/", "/garage", "/brands", "/sets", "/exchange", "/history", "/about"]) add(SITE_URL + p);
  for (const r of results) {
    const day = (r.updated_at || "").slice(0, 10);
    const make = (r.manufacture || "").trim();
    if (make && !SITEMAP_HIDDEN_MAKES.has(make.toLowerCase())) add(`${SITE_URL}/brands/${encodeURIComponent(make)}`);
    if (r.set_name) add(`${SITE_URL}/sets/${encodeURIComponent(r.set_name.trim())}`);
    if (r.name) add(`${SITE_URL}/?car=${encodeURIComponent(r.name.trim())}`, day);
  }

  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...urls].map(([loc, mod]) =>
      `  <url><loc>${escapeAttr(loc)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}</url>`).join("\n") +
    "\n</urlset>\n";

  const resp = new Response(body, {
    headers: { "content-type": "application/xml;charset=UTF-8", "cache-control": "public, max-age=3600" },
  });
  ctx.waitUntil(cache.put(key, resp.clone()));
  return resp;
}

/* ── Car info (wiki enrichment) ─────────────────────────────
   One row per car. `data` is JSON built by the admin Car Info tab:
   { casting: {...}, version: {...}, realCar: {...} }
   Only status='confirmed' rows are public. */
const CAR_INFO_STATUSES = new Set(["confirmed", "skipped"]);

async function handleGetCarInfo(env, id) {
  const row = await env.diecast_db
    .prepare("SELECT data FROM car_info WHERE car_id=? AND status='confirmed'")
    .bind(id).first();
  return pubJson(row ? tryParseJson(row.data, null) : null);
}

async function handleListCarInfo(env) {
  const { results } = await env.diecast_db
    .prepare("SELECT car_id, status, data, updated_at FROM car_info").all();
  return adminJson(results.map(r => ({ ...r, data: tryParseJson(r.data, null) })));
}

async function handleSaveCarInfo(request, env, id) {
  const { status, data } = await request.json();
  if (!CAR_INFO_STATUSES.has(status)) return adminJson({ error: "Invalid status" }, 400);
  const json = JSON.stringify(data ?? null);
  if (json.length > 64_000) return adminJson({ error: "Data too large" }, 400);
  await env.diecast_db.prepare(
    "INSERT INTO car_info (car_id, status, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) " +
    "ON CONFLICT(car_id) DO UPDATE SET status=excluded.status, data=excluded.data, updated_at=CURRENT_TIMESTAMP"
  ).bind(id, status, json).run();
  return adminJson({ ok: true });
}

async function handleDeleteCarInfo(env, id) {
  await env.diecast_db.prepare("DELETE FROM car_info WHERE car_id=?").bind(id).run();
  return adminJson({ ok: true });
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
