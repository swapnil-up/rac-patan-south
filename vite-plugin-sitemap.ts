// Write robots.txt and sitemap.xml.
//
// The site is an archive: a few hundred event and blog pages that people
// search for by name and by year. A sitemap is how a search engine finds
// them all — it has no way to discover them by following links from the
// home page.
//
// The URL list comes from the content snapshot, so a page is listed as soon
// as it exists in the content.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = path.join(ROOT, "src", "generated", "content.json");

/** The pages that are not a collection item. */
const STATIC_ROUTES = [
  "/blog",
  "/events",
  "/gallery",
  "/team",
  "/join",
  "/resources",
];

/** A collection, the section it is listed under, and the query it came from. */
const COLLECTIONS = [
  { section: "events", key: "eventConnection|all" },
  { section: "blog", key: "blogConnection|all" },
  { section: "gallery", key: "galleryConnection|all" },
];

interface SnapshotEntry {
  data?: {
    [connection: string]: {
      edges?: Array<{ node?: { slug?: string; _sys?: { filename?: string } } }>;
    };
  };
}

interface Snapshot {
  responses: Record<string, SnapshotEntry>;
}

/** Every route the site can show, as a path without a trailing slash. */
function collectRoutes(snapshot: Record<string, SnapshotEntry>): string[] {
  const routes = new Set<string>(["/"]);
  for (const route of STATIC_ROUTES) routes.add(route);

  for (const { section, key } of COLLECTIONS) {
    const connection = key.split("|")[0];
    const edges = snapshot[key]?.data?.[connection]?.edges ?? [];
    for (const edge of edges) {
      const node = edge.node;
      const id = node?.slug || node?._sys?.filename;
      if (!id) continue;
      routes.add(`/${section}/${id}`);
    }
  }

  return [...routes].sort();
}

/** A Vite plugin that writes robots.txt and sitemap.xml. */
export function sitemap() {
  let outDir = "dist";
  let base = "/";
  return {
    name: "racps-sitemap",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      base = config.base || "/";
    },
    async closeBundle() {
      // The address the site is published at. Pages serves the repo under
      // its own name, so the origin and the base path are separate.
      const origin = (
        process.env.SITE_ORIGIN || "https://swapnil-up.github.io"
      ).replace(/\/+$/, "");

      let snapshot: Snapshot;
      try {
        snapshot = JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf8"));
      } catch {
        this.error(
          "No content snapshot to build a sitemap from — " +
            "run the build through `tinacms build --local` so the content is captured first.",
        );
        return;
      }

      const routes = collectRoutes(snapshot.responses);
      const urls = routes
        .map((route) => {
          const location = route === "/" ? base : `${base}${route.slice(1)}/`;
          return `  <url>\n    <loc>${origin}${location}</loc>\n  </url>`;
        })
        .join("\n");

      await fs.writeFile(
        path.join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `${urls}\n</urlset>\n`,
        "utf8",
      );

      await fs.writeFile(
        path.join(outDir, "robots.txt"),
        `User-agent: *\nAllow: /\n\nSitemap: ${origin}${base}sitemap.xml\n`,
        "utf8",
      );

      this.info(`sitemap: ${routes.length} urls`);
    },
  };
}
