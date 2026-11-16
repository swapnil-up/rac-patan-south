// Make the site work on GitHub Pages.
//
// Pages serves static files and has no rewrite rules, so a deep link like
// /rac-patan-south/events/2020-05-03-quarantine-art-festival would be a
// 404 — there is no such file. The usual fix is a 404.html that hands the
// requested path to the app and reloads the root, where a small script
// restores the path before React starts.
//
// Vercel does not need this: vercel.json rewrites everything to index.html.

import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_KEY = "racps-redirect";

/** A Vite plugin that writes the Pages fallback after the bundle is built. */
export function githubPagesFallback() {
  let outDir = "dist";
  let base = "/";
  return {
    name: "racps-github-pages-fallback",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      base = config.base || "/";
    },
    async closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      let html;
      try {
        html = await fs.readFile(indexPath, "utf8");
      } catch {
        return;
      }

      // Restore the path the 404 page handed over, before the app boots.
      const restore = `<script>
(function () {
  var target = sessionStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  if (target) {
    sessionStorage.removeItem(${JSON.stringify(STORAGE_KEY)});
    window.history.replaceState(null, "", target);
  }
})();
</script>`;

      // Hand the requested path to the app and go to the root.
      const handOver = `<script>
(function () {
  sessionStorage.setItem(${JSON.stringify(STORAGE_KEY)}, window.location.href);
  window.location.replace(${JSON.stringify(base)});
})();
</script>`;

      const withRestore = html.includes("</head>")
        ? html.replace("</head>", `${restore}\n</head>`)
        : html;

      await fs.writeFile(indexPath, withRestore, "utf8");

      const notFound = withRestore.includes("</head>")
        ? withRestore.replace("</head>", `${handOver}\n</head>`)
        : withRestore;
      await fs.writeFile(path.join(outDir, "404.html"), notFound, "utf8");

      this.info(`github pages fallback written (base ${base})`);
    },
  };
}
