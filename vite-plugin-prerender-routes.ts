// Give every route its own index.html.
//
// GitHub Pages serves static files and has no rewrite rules. A deep link
// such as /events/2015-11-28-nation-wide-blood-donation-camp has no file
// behind it, so Pages falls back to 404.html and the browser gets a 404
// status for a page that in fact renders fine. Search engines treat that as
// a soft 404 and stop indexing the archive.
//
// The fallback in vite-plugin-github-pages-fallback.ts keeps those links
// working, but this plugin gives them a status of their own: a directory
// with an index.html in it is served with a 200 (and Pages redirects the
// version without the trailing slash to it). The file is the same shell the
// root uses — the app is a single-page app and renders the route itself.
//
// The route list comes from the content snapshot, so a new event page is
// covered as soon as it is added to the content.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = path.join(ROOT, "src", "generated", "content.json");

/** The routes that are not a collection item. */
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

/** A Vite plugin that writes an index.html for every route. */
export function prerenderRoutes() {
  let outDir = "dist";
  return {
    name: "racps-prerender-routes",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      let shell: string;
      try {
        shell = await fs.readFile(indexPath, "utf8");
      } catch {
        return;
      }

      let snapshot: Snapshot;
      try {
        snapshot = JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf8"));
      } catch {
        this.error(
          "No content snapshot to prerender from — " +
            "run the build through `tinacms build --local` so the content is captured first.",
        );
        return;
      }

      const routes = collectRoutes(snapshot.responses);
      let written = 0;

      for (const route of routes) {
        if (route === "/") continue;
        const dir = path.join(outDir, route.replace(/^\//, ""));
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "index.html"), shell, "utf8");
        written++;
      }

      this.info(`prerendered ${written} routes`);
    },
  };
}
