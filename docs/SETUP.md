# Setup guide

This takes you from a fresh clone to your own collection online, with the admin panel, in about 20 minutes. Everything runs on free plans.

**You'll end up with:**

```
https://diecast.example.com           ← your gallery (a Cloudflare Worker)
https://diecast.example.com/admin     ← admin panel
https://my-diecast.pages.dev          ← the static files behind it (Cloudflare Pages)
github.com/you/diecast-images         ← where your car photos are stored
```

**You need:**

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free).
- A [GitHub account](https://github.com/signup).
- [Node.js](https://nodejs.org) 18 or newer. `npx` comes with it.
- *Optional:* a domain on Cloudflare. Without one you get a free `*.workers.dev` address; see [step 6](#6-configure-the-worker).

---

## 1. Get the code and try the demo

```bash
git clone https://github.com/padmajp4/Diecast-gallery-ui.git my-diecast
cd my-diecast
npm install                 # installs wrangler + the CSS minifier (dev tools only)
npm run demo                # → http://localhost:8788
```

You should see the gallery with 20 sample cars. With no API around, it falls back to `public/data/sample-cars.json`. Stop it with `Ctrl+C`.

## 2. Log in to Cloudflare

```bash
npx wrangler login
```

A browser window opens. Approve access, then come back to the terminal.

## 3. Create the database

```bash
npx wrangler d1 create diecast-db
```

The output includes a block like this:

```toml
[[d1_databases]]
binding = "DB"
database_name = "diecast-db"
database_id = "1a2b3c4d-…"
```

Copy **only the `database_id` value** into `worker/wrangler.toml`. Keep `binding = "diecast_db"` as it is, because the code uses that name.

Then create the tables:

```bash
npm run db:schema
```

Optional: load the 20 sample cars so the site isn't empty while you set things up.

```bash
npm run db:seed
```

You can delete them later from the admin panel, or with `npx wrangler d1 execute diecast-db --remote --config worker/wrangler.toml --command "DELETE FROM cars"`.

## 4. Create a GitHub repo for photos

Uploaded photos are saved to a GitHub repo you own, then served through Cloudflare's cache.

1. Create a **public** repo, e.g. `you/diecast-images`, and tick **Add a README** so it has a `main` branch.
2. Create a token for it: **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:
   - **Repository access:** *Only select repositories* → `you/diecast-images`
   - **Permissions:** *Contents* → **Read and write**
   - **Expiration:** your choice. When it expires, uploads stop working until you set a new one ([see below](#updating-the-github-token)).
3. Copy the token (`github_pat_…`). You'll need it in step 7.

## 5. Deploy the static site to Pages

```bash
npx wrangler pages project create my-diecast --production-branch main
npm run deploy:site
```

Note the URL it prints, e.g. `https://my-diecast.pages.dev`. That's your `ORIGIN_URL`.

> If you choose a project name other than `my-diecast`, update the `deploy:site` script in `package.json` to match.

Opening the `pages.dev` URL directly shows demo mode, because the API lives in the Worker. That's expected.

## 6. Configure the Worker

Open `worker/wrangler.toml` and fill in the lines marked `←`:

```toml
[vars]
SITE_URL         = "https://diecast.example.com"   # your public address
ORIGIN_URL       = "https://my-diecast.pages.dev"  # from step 5
GITHUB_REPO      = "you/diecast-images"            # from step 4
SITE_TITLE       = "Sam's Diecast Collection"

routes = [
  { pattern = "diecast.example.com", custom_domain = true }
]
```

- **With your own domain:** the domain must be added to your Cloudflare account. Cloudflare creates the DNS record and certificate for `diecast.example.com` automatically on deploy.
- **Without a domain:** delete the whole `routes = [...]` block. After step 7 the Worker is reachable at `https://diecast-gallery.<your-subdomain>.workers.dev`; put that address in `SITE_URL` and deploy again.

## 7. Add the secrets and deploy the Worker

```bash
npx wrangler secret put ADMIN_SECRET --config worker/wrangler.toml   # choose your admin password
npx wrangler secret put GITHUB_TOKEN --config worker/wrangler.toml   # paste the token from step 4
npm run deploy:worker
```

Open your `SITE_URL`. You should see your gallery: the sample cars if you seeded them, or an empty collection.

## 8. Add your first car

1. Go to `https://<your site>/admin` and sign in with `ADMIN_SECRET`.
2. **Add Car** → fill in the details, drop in some photos → **Save**.
   - Photos are resized and converted to WebP in your browser, and a 480px thumbnail is made, before anything uploads.
3. Back on the site the car appears within a few seconds. The admin clears the API cache on every save.

Then, when you're ready:

- **Car Info** tab → match cars to the Hot Wheels / Matchbox wiki and Wikipedia. Only cars you confirm show this information.
- **Set Logos** tab → logos for your themed sets.
- **Bulk Import** tab → add many cars at once from a CSV (download the template there).

## 9. Make it yours

- Edit the `<head>` and the **About** page in `public/index.html` (both are marked with comments).
- Swap `public/images/logo.webp`, the favicons and `public/og-image.webp` (the social-share image, 1200×630).
- In `public/js/config.js`, set `sampleDataUrl: ""` so a hiccup in the API never shows the sample cars, and change any home-page sections you like.
- Update `robots.txt` with your domain.

Redeploy the site after any change in `public/`:

```bash
npm run build:css     # only if you changed styles.css
npm run deploy:site
```

---

## Day-to-day

| Task | Command / place |
|---|---|
| Add / edit cars | `/admin` |
| Deploy front-end changes | `npm run deploy:site` |
| Deploy Worker changes | `npm run deploy:worker` |
| Everything | `npm run deploy` |
| Look at the data | `npx wrangler d1 execute diecast-db --remote --config worker/wrangler.toml --command "SELECT name, brand FROM cars LIMIT 20"` |
| Back up the database | `npx wrangler d1 export diecast-db --remote --config worker/wrangler.toml --output backup.sql` |
| Worker logs | `npx wrangler tail --config worker/wrangler.toml` |

### Updating the GitHub token

Tokens expire. When photo uploads start failing, create a new token (step 4) and run:

```bash
npx wrangler secret put GITHUB_TOKEN --config worker/wrangler.toml
```

It takes effect immediately, with no redeploy needed. Alternatively: Cloudflare dashboard → **Workers & Pages** → your Worker → **Settings → Variables and Secrets**.

### Photos from before thumbnails existed

Grids use `images/cars/thumbs/<name>` and fall back to the full photo when a thumbnail is missing. To create the missing ones in bulk:

```bash
git clone https://github.com/you/diecast-images && cd diecast-images
bash ../my-diecast/scripts/make-thumbnails.sh
git add images/cars/thumbs && git commit -m "Add thumbnails" && git push
```

## Developing locally (full mode)

Run the static site and the Worker side by side, with a local copy of D1:

```bash
# one-time: local database with the sample data
npm run db:schema:local && npm run db:seed:local

# local secrets (this file is git-ignored)
printf 'ADMIN_SECRET=dev-password\nGITHUB_TOKEN=\n' > worker/.dev.vars

npm run demo     # terminal 1 — static site on :8788
npm run dev      # terminal 2 — Worker on :8787, forwarding to :8788
```

Open <http://localhost:8787> for the site and <http://localhost:8787/admin> for the admin (password `dev-password`). Photo uploads need a real `GITHUB_TOKEN`.

## Troubleshooting

**The site shows the 20 sample cars instead of mine.**
The page couldn't reach `/api/cars`, so it fell back to the demo data. Check you're opening `SITE_URL` (the Worker), not the `pages.dev` address. Then check `npx wrangler tail --config worker/wrangler.toml` for errors. Once you're live, set `sampleDataUrl: ""` in `config.js`.

**Admin says "Incorrect password" but it's right.**
After 10 failed attempts your IP is locked out for 15 minutes ("Too many failed attempts"). Otherwise, re-set the secret: `npx wrangler secret put ADMIN_SECRET --config worker/wrangler.toml`.

**"Image upload failed".**
Usually the `GITHUB_TOKEN`: it has expired, it isn't scoped to `GITHUB_REPO`, or it lacks *Contents: Read and write*. Also check that `GITHUB_REPO` and `GITHUB_BRANCH` are right and that the repo has at least one commit.

**Photos upload but don't show.**
The photo repo must be **public**, because the proxy reads `raw.githubusercontent.com`.

**A new car doesn't appear.**
The car list is edge-cached for 5 minutes. Saves from the admin clear it, but changes made directly in D1 wait for the cache to expire.

**I added a script / analytics and it's blocked.**
The site sends a strict Content-Security-Policy. Add the tool's domains to `script-src` and `connect-src` in `public/_headers`, and put its code in `public/js/site.js` rather than inline in the HTML.

**Car Info can't load the wiki.**
It calls the wikis directly from your browser, so ad blockers or privacy extensions can block it. Try a private window.
