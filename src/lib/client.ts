// The site's data source.
//
// In development the app talks to the local Tina GraphQL server, so editing
// content in the admin shows up on the page straight away.
//
// In a published build there is no content API to talk to — Tina Cloud's
// public read endpoint refuses every origin, and there is no token to give
// it in CI. So the content is read out of the build-time snapshot instead
// (scripts/snapshot_content.mjs) and served from memory. The site becomes a
// plain static bundle: it can be hosted anywhere, including GitHub Pages.
//
// Both paths return the same shape, so nothing above this file changes.

import { createClient } from "tinacms/dist/client";
import { queries as tinaQueries } from "../../tina/__generated__/types.js";

interface Captured {
  data: unknown;
  query: string;
  variables: Record<string, unknown>;
}

// The snapshot is a separate chunk rather than part of the main bundle: the
// content is several megabytes, and the app can start without it.
const contentFiles = import.meta.glob("../generated/content.json");
const loadContent = contentFiles["../generated/content.json"];

let snapshot: Promise<Record<string, Captured>> | null = null;

function getSnapshot(): Promise<Record<string, Captured>> {
  if (!snapshot) {
    snapshot = loadContent
      ? loadContent().then((module) => (module.default ?? module) as Record<string, Captured>)
      : Promise.resolve({});
  }
  return snapshot;
}

/**
 * The key a response was captured under.
 *
 * A collection is captured twice: once whole, and once per item, because
 * the app asks for both. A single document is captured by its file name.
 */
function keyFor(name: string, variables: Record<string, unknown> = {}): string {
  if (name.endsWith("Connection")) {
    const filter = variables.filter as { slug?: { eq?: string } } | undefined;
    const slug = filter?.slug?.eq;
    if (slug) return `${name}|slug=${slug}`;
    return `${name}|all`;
  }
  return `${name}|relativePath=${variables.relativePath}`;
}

async function lookup(name: string, variables: Record<string, unknown> = {}) {
  const captured = await getSnapshot();
  const hit = captured[keyFor(name, variables)];
  if (!hit) {
    throw new Error(
      `No content snapshot for "${name}" (${JSON.stringify(variables)}). ` +
        "The snapshot is out of date — rebuild the site.",
    );
  }
  return hit;
}

const staticQueries = {
  settings: (variables: Record<string, unknown>) => lookup("settings", variables),
  page: (variables: Record<string, unknown>) => lookup("page", variables),
  eventConnection: (variables: Record<string, unknown>) =>
    lookup("eventConnection", variables),
  event: (variables: Record<string, unknown>) => lookup("event", variables),
  blogConnection: (variables: Record<string, unknown>) =>
    lookup("blogConnection", variables),
  blog: (variables: Record<string, unknown>) => lookup("blog", variables),
  galleryConnection: (variables: Record<string, unknown>) =>
    lookup("galleryConnection", variables),
  gallery: (variables: Record<string, unknown>) => lookup("gallery", variables),
  teamTermConnection: (variables: Record<string, unknown>) =>
    lookup("teamTermConnection", variables),
  teamTerm: (variables: Record<string, unknown>) => lookup("teamTerm", variables),
  resourceConnection: (variables: Record<string, unknown>) =>
    lookup("resourceConnection", variables),
  sponsorConnection: (variables: Record<string, unknown>) =>
    lookup("sponsorConnection", variables),
};

const liveClient = createClient({
  url: "http://localhost:4001/graphql",
  token: "undefined",
  queries: tinaQueries,
});

// VITE_LIVE_CONTENT is set by the dev script only. It cannot be
// import.meta.env.DEV: the Tina CLI runs the build with NODE_ENV=development,
// so DEV is true in a production build too.
const useLiveContent = import.meta.env.VITE_LIVE_CONTENT === "true";

export const client = useLiveContent ? liveClient : { queries: staticQueries };

export default client;
