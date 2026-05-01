# Deploying Abancool to cPanel (static)

This site is rendered as a single-page React app and deployed as plain static
files on cPanel shared hosting. All authenticated/billing flows redirect the
visitor to your WHMCS portal at `https://client.abancool.com`, so no Node.js
process is required on the server.

## 1. Build locally

Requires Node.js **20+** and `bun` (or `npm`):

```bash
bun install            # or: npm install
node scripts/build-static.mjs
```

This produces a `dist-static/` folder containing:

- `index.html`
- hashed JS/CSS bundles under `assets/`
- `favicon.png`
- `.htaccess` (SPA fallback + caching headers)

## 2. Upload to cPanel

1. Log into cPanel → **File Manager** → open `public_html/`.
2. (Optional) back up or empty the existing contents of `public_html/`.
3. Upload **the contents of `dist-static/`** (not the folder itself) into
   `public_html/`. The `index.html` and `.htaccess` files must sit directly
   inside `public_html/`.
4. Make sure `.htaccess` is visible (enable "Show Hidden Files" in File
   Manager settings) and that `mod_rewrite` is enabled (it is by default on
   most cPanel hosts).

## 3. Verify

Visit:

- `https://abancool.com/` — homepage loads
- `https://abancool.com/hosting` — direct deep link works (this is what the
  `.htaccess` SPA fallback enables)
- Click **Sign in** / **Get Started** / **Order Now** — should go to
  `https://client.abancool.com/...`

## Subsequent updates

Re-run `node scripts/build-static.mjs` and re-upload the contents of
`dist-static/`. Browsers cache hashed asset files for a year, but
`index.html` is set to `no-cache`, so users always pick up the new bundle on
next page load.

## Notes

- Do **not** upload `node_modules/`, `src/`, or any `.env` files to cPanel.
  The static build is fully self-contained.
- The Lovable editor preview keeps using the TanStack Start / SSR setup —
  this static build script is purely for cPanel hosting and does not affect
  the preview.
- If you later move to Node.js hosting, switch to cPanel's
  *Setup Node.js App* and run `bun run build` instead — let me know and I'll
  add a Passenger entry file.
