// Capture the site's content at build time.
//
// The published site has to work without a content API: Tina Cloud's public
// read endpoint rejects every origin we have tried, and a token is not
// available in CI. So the content is read out of the local Tina GraphQL
// server that `tinacms build --local` starts, and written into
// src/generated/content.json. The app then serves that file.
//
// Running this outside a build (the dev server) is harmless — the snapshot
// is only read at runtime, and in dev the app talks to the live local
// GraphQL server instead.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as documents from "../tina/__generated__/types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_FILE = path.join(ROOT, "src", "generated", "content.json");
const GRAPHQL_URL = process.env.TINA_GRAPHQL_URL || "http://localhost:4001/graphql";

// The path the site is published under. On GitHub Pages that is
// /rac-patan-south/, not /.
const BASE = process.env.VITE_BASE_PATH || "/";

/**
 * Move root-relative media paths under the site's base path.
 *
 * The content stores media as "/uploads/photos/x.jpg". Vite rewrites the
 * asset URLs it finds in the source, but these live in the content, so
 * nothing rewrites them for us: on GitHub Pages an image would be looked
 * for at /uploads/... instead of /rac-patan-south/uploads/..., and miss.
 *
 * Only a path that starts a string is rewritten — "/uploads/..." — so an
 * absolute URL that happens to contain "/uploads/" is left alone.
 */
function rebase(value) {
  if (typeof value === "string") {
    if (BASE === "/") return value;
    return value.replace(
      /(^|[^\w.\-/])\/uploads\//g,
      (_match, before) => `${before}${BASE}uploads/`,
    );
  }
  if (Array.isArray(value)) return value.map(rebase);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = rebase(item);
    return out;
  }
  return value;
}

async function query(document, variables) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: document, variables }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL ${response.status} for ${document.slice(0, 60).trim()}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  return json.data;
}

/** A captured response, shaped the way the Tina client returns one. */
function captured(document, variables, data) {
  return { data, query: document, variables };
}

async function listFiles(dir, extension) {
  try {
    const names = await fs.readdir(path.join(CONTENT_DIR, dir));
    return names.filter((n) => n.endsWith(extension)).sort();
  } catch {
    return [];
  }
}

async function main() {
  const snapshot = {};

  // --- settings: one document ---
  const settingsVariables = { relativePath: "global.json" };
  snapshot["settings|relativePath=global.json"] = captured(
    documents.SettingsDocument,
    settingsVariables,
    await query(documents.SettingsDocument, settingsVariables),
  );

  // --- pages: one document per page file ---
  const pageFiles = await listFiles("page", ".mdx");
  for (const file of pageFiles) {
    const variables = { relativePath: file };
    snapshot[`page|relativePath=${file}`] = captured(
      documents.PageDocument,
      variables,
      await query(documents.PageDocument, variables),
    );
  }

  // --- collections: the whole list, plus one document per item ---
  //
  // The app asks for a collection in bulk, and then for a single item by
  // slug when someone opens one. Both shapes are captured.
  const collections = [
    {
      name: "event",
      connection: documents.EventConnectionDocument,
      variables: { sort: "date", first: 500 },
      item: documents.EventDocument,
    },
    {
      name: "blog",
      connection: documents.BlogConnectionDocument,
      variables: { sort: "date", first: 200 },
      item: documents.BlogDocument,
    },
    {
      name: "gallery",
      connection: documents.GalleryConnectionDocument,
      variables: { sort: "date" },
      item: documents.GalleryDocument,
    },
    {
      name: "teamTerm",
      connection: documents.TeamTermConnectionDocument,
      variables: { sort: "year" },
      item: null,
    },
    {
      name: "resource",
      connection: documents.ResourceConnectionDocument,
      variables: {},
      item: null,
    },
    {
      name: "sponsor",
      connection: documents.SponsorConnectionDocument,
      variables: {},
      item: null,
    },
  ];

  for (const collection of collections) {
    const data = await query(collection.connection, collection.variables);
    snapshot[`${collection.name}Connection|all`] = captured(
      collection.connection,
      collection.variables,
      data,
    );

    if (!collection.item) continue;

    const edges = data?.[`${collection.name}Connection`]?.edges ?? [];
    for (const edge of edges) {
      const node = edge?.node;
      if (!node) continue;

      // Events and blog posts are opened by slug.
      if (node.slug) {
        const variables = { filter: { slug: { eq: node.slug } } };
        snapshot[`${collection.name}Connection|slug=${node.slug}`] = captured(
          collection.connection,
          variables,
          await query(collection.connection, variables),
        );
      }

      // Gallery albums are opened by their file name.
      const relativePath = node._sys?.relativePath;
      if (relativePath) {
        const variables = { relativePath };
        snapshot[`${collection.name}|relativePath=${relativePath}`] = captured(
          collection.item,
          variables,
          await query(collection.item, variables),
        );
      }
    }
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(
    OUT_FILE,
    JSON.stringify({
      // The text of the queries that can come back empty. A document that is
      // not in the snapshot — a route that does not exist — still has to be
      // answered with a well-formed response, the way the Tina client does.
      queries: {
        page: documents.PageDocument,
        event: documents.EventDocument,
        blog: documents.BlogDocument,
        gallery: documents.GalleryDocument,
        eventConnection: documents.EventConnectionDocument,
        blogConnection: documents.BlogConnectionDocument,
      },
      responses: rebase(snapshot),
    }),
    "utf8",
  );

  const bytes = (await fs.stat(OUT_FILE)).size;
  console.log(
    `content snapshot: ${Object.keys(snapshot).length} queries, ${(bytes / 1024).toFixed(0)} kB -> ${path.relative(ROOT, OUT_FILE)}`,
  );
}

await main();
