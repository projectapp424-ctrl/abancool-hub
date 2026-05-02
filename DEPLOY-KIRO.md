# Kiro: Prepare a cPanel Deploy Package

Instructions for the **Kiro** agent (or any automation runner) to produce a
ready-to-upload deploy package for the Abancool site on cPanel shared hosting.

The site is a **static SPA**. There is no Node process on the server. All
auth/billing flows redirect to the WHMCS portal at `https://client.abancool.com`.

---

## Inputs

- Repository root containing `scripts/build-static.mjs`, `package.json`,
  `src/`, `public/`.
- Node.js **20+** available on PATH.
- `bun` (preferred) or `npm` available on PATH.

## Outputs

A single artifact:

```
release/abancool-cpanel-<UTC-TIMESTAMP>.zip
```

The zip's **root** must contain (no wrapper folder):

```
index.html
.htaccess
favicon.png
assets/...        # hashed JS/CSS bundles
```

This is exactly what gets uploaded into `public_html/` on cPanel.

---

## Steps

Run from the repo root. Fail the job on any non-zero exit code.

### 1. Install dependencies (clean)

```bash
bun install --frozen-lockfile   # or: npm ci
```

### 2. Build the static bundle

```bash
node scripts/build-static.mjs
```

Expected: a `dist-static/` folder is created/overwritten containing
`index.html`, `.htaccess`, `favicon.png`, and `assets/`.

### 3. Sanity-check the build output

Fail the job if any of these checks fail:

```bash
test -f dist-static/index.html        || exit 1
test -f dist-static/.htaccess         || exit 1
test -f dist-static/favicon.png       || exit 1
test -d dist-static/assets            || exit 1
# index.html must reference a hashed JS bundle
grep -q 'assets/index-.*\.js' dist-static/index.html || exit 1
# .htaccess must contain SPA fallback
grep -q 'RewriteRule \^ index.html'   dist-static/.htaccess || exit 1
```

### 4. Package the release zip

The zip must include hidden files (`.htaccess`) and must NOT wrap the contents
in a `dist-static/` folder.

```bash
mkdir -p release
TS=$(date -u +%Y%m%d-%H%M%S)
ZIP="release/abancool-cpanel-${TS}.zip"

# -r recursive, zip from inside dist-static so paths are relative to root
( cd dist-static && zip -r "../${ZIP}" . -x "*.DS_Store" )

# Verify .htaccess is inside the zip
unzip -l "${ZIP}" | grep -q '\.htaccess' || { echo "missing .htaccess"; exit 1; }
unzip -l "${ZIP}" | grep -q '^.*index\.html$' || { echo "missing index.html"; exit 1; }

echo "OK -> ${ZIP}"
```

If `zip` is unavailable, use:

```bash
( cd dist-static && tar -czf "../release/abancool-cpanel-${TS}.tar.gz" . )
```

### 5. (Optional) Emit a build manifest

Useful for tracking what's in each release.

```bash
{
  echo "build_time_utc: $(date -u +%FT%TZ)"
  echo "git_commit:     $(git rev-parse --short HEAD 2>/dev/null || echo n/a)"
  echo "node_version:   $(node -v)"
  echo "files:"
  ( cd dist-static && find . -type f | sort | sed 's/^/  - /' )
} > "release/abancool-cpanel-${TS}.manifest.txt"
```

---

## Deploy (manual, by a human in cPanel)

1. cPanel → **File Manager** → open `public_html/`.
2. (Recommended) back up or empty the existing contents.
3. Upload the zip from step 4. Right-click → **Extract** into `public_html/`.
4. Confirm `index.html` and `.htaccess` sit **directly** in `public_html/`
   (not inside a subfolder). Enable "Show Hidden Files" to verify `.htaccess`.
5. Visit `https://abancool.com/` and `https://abancool.com/hosting` to verify
   the SPA fallback works.

---

## Do NOT do any of the following

- Do **not** upload `node_modules/`, `src/`, `.env`, `supabase/`, `scripts/`,
  or any other repo files. Only the contents of `dist-static/`.
- Do **not** run `bun run build` / `npm run build` for cPanel — that targets
  Cloudflare Workers and produces output cPanel cannot serve. Always use
  `node scripts/build-static.mjs`.
- Do **not** wrap the zip contents in a `dist-static/` folder. Files must be
  at the zip root so cPanel's Extract drops them straight into `public_html/`.
- Do **not** modify `wrangler.jsonc`, `vite.config.ts`, `src/router.tsx`, or
  `src/routes/__root.tsx` to make the build work — the static script handles
  this via aliases. If the build breaks, fix `scripts/build-static.mjs`.

---

## Failure playbook

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing "#tanstack-router-entry" specifier` | Stub in `build-static.mjs` is missing an export the code needs | Add the missing export to the stub block in `scripts/build-static.mjs` |
| `404` on `/hosting` after deploy but `/` works | `.htaccess` not uploaded or `mod_rewrite` disabled | Re-upload with hidden files; ask host to enable `mod_rewrite` |
| Stale page after redeploy | Browser cached old `index.html` | Hard-refresh; `.htaccess` already sets `Cache-Control: no-cache` for HTML |
| Click "Sign in" goes to wrong place | WHMCS base URL changed | Update `WHMCS_BASE` in `src/lib/whmcs-public.ts` and rebuild |

---

## One-shot command (copy/paste for Kiro)

```bash
set -euo pipefail
bun install --frozen-lockfile
node scripts/build-static.mjs
test -f dist-static/index.html && test -f dist-static/.htaccess
mkdir -p release
TS=$(date -u +%Y%m%d-%H%M%S)
( cd dist-static && zip -r "../release/abancool-cpanel-${TS}.zip" . )
echo "Release: release/abancool-cpanel-${TS}.zip"
```
