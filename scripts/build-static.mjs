#!/usr/bin/env node
/**
 * Build a static SPA for cPanel deployment.
 *
 * The main app uses TanStack Start (SSR / Cloudflare Workers target) inside the
 * Lovable editor. cPanel shared hosting can't run a Worker, so this script
 * produces a plain client-side SPA bundle from the same `src/routes/*` code.
 *
 * Output: `dist-static/`  →  upload contents to cPanel `public_html/`.
 *
 * Run with:  node scripts/build-static.mjs
 */
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const outDir = resolve(root, "dist-static");

// 1) Write a temporary SPA entry HTML that boots the router on the client only.
const entryHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>Abancool Technology</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main-static.tsx"></script>
  </body>
</html>
`;
writeFileSync(resolve(root, "index.html"), entryHtml);

// 2) Ensure a client-only entry exists.
const mainStaticPath = resolve(root, "src/main-static.tsx");
if (!existsSync(mainStaticPath)) {
  writeFileSync(
    mainStaticPath,
    `import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
`
  );
}

// 3) Build with a minimal Vite config (no SSR, no Cloudflare plugin).
await build({
  root,
  configFile: false,
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

// 4) Copy /public assets that Vite may not have picked up.
const publicDir = resolve(root, "public");
if (existsSync(publicDir)) {
  const walk = (src, dest) => {
    mkdirSync(dest, { recursive: true });
    for (const name of readdirSync(src)) {
      const s = join(src, name);
      const d = join(dest, name);
      if (statSync(s).isDirectory()) walk(s, d);
      else copyFileSync(s, d);
    }
  };
  walk(publicDir, outDir);
}

// 5) Write SPA fallback rules so cPanel/Apache serves index.html for deep links.
writeFileSync(
  join(outDir, ".htaccess"),
  `# SPA fallback for TanStack Router
Options -MultiViews
RewriteEngine On

# Force HTTPS (optional — comment out if you don't have an SSL cert yet)
# RewriteCond %{HTTPS} off
# RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Don't rewrite real files / directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Everything else → index.html
RewriteRule ^ index.html [L]

# Long-cache hashed assets
<IfModule mod_headers.c>
  <FilesMatch "\\.(js|css|woff2?|png|jpg|jpeg|gif|svg|webp|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
`
);

// 6) Clean up the temporary root index.html so it doesn't collide with the
//    TanStack Start dev server / Lovable preview.
try { rmSync(resolve(root, "index.html")); } catch {}

console.log("\n✅ Static build complete → dist-static/");
console.log("   Upload the CONTENTS of dist-static/ into your cPanel public_html/.");
