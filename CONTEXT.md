# RAC Patan South

Rotaract Club of Patan South website. Built from the [cms-demo](https://github.com/swapnil-up/cms-demo) template — a TinaCMS + React SPA.

## Setup

```bash
pnpm install
pnpm run dev
```

Opens at `http://localhost:5173`. TinaCMS admin at `http://localhost:5173/admin/index.html`.

## Origin

This project was cloned from `cms-demo` and initialized for RAC Patan South:

- Removed `.git` history and created fresh
- Ran `scripts/setup-new-ngo.sh` (sets site name, tagline, contact email in `content/settings/global.json`)
- Deleted demo content (`content/team/*.md`, `content/testimonial/*.md` from Samriddhi Nepal)
- Deleted `tenants/` directory (not needed — this is not a template)
- Default brand colors are generic; update via TinaCMS admin

## Architecture

### Tech stack
- **TinaCMS** — headless CMS with Git-backed content
- **React 19** — SPA
- **Vite** — bundler
- **CSS Modules** — scoped styling

### Content types (collections)
Content lives in `content/` as markdown files. TinaCMS auto-generates types and queries from `tina/collections/`.

| Collection | Path | Description |
|---|---|---|
| Page | `content/page/` | Static pages with sections (hero, about, services, team, testimonials, contact, CTA) |
| Team | `content/team/` | Current club members/board profiles |
| Team Terms | `content/team-terms/` | Presidents and boards by Rota year |
| Testimonial | `content/testimonial/` | Quotes from beneficiaries/partners |
| Settings | `content/settings/` | Global site config, brand colors, nav |

| Blog | `content/blog/` | Blog posts |
| Event | `content/events/` | Events |
| Gallery | `content/gallery/` | Photo albums |
| Sponsor | `content/sponsors/` | Sponsors/partners |
| Resource | `content/resources/` | Downloads and documents |

### Brand theming
All brand colors are in `content/settings/global.json → brand.colors` and injected as CSS custom properties. Every component uses `var(--*)` — no hardcoded brand colors in components. Structural tokens (`--white`, `--card-bg`, `--shadow-*`, `--radius-*`, `--font-*`) have defaults in `:root` in `styles.css`.

Color fields: `primary`, `primaryDark`, `primaryLight`, `accent`, `accentLight`, `accentHover`, `gold`, `goldLight`, `goldHover`, `green`, `greenLight`, `footerBg`, `heroBgStart`, `bodyBg`

### How the content reaches the browser
The content does not come from an API at runtime. Tina Cloud's public read
endpoint refuses every origin this site is served from, and no read token is
available in CI, so a site that fetched from it showed an empty shell.

Instead the content is read out of the local Tina GraphQL server while the
build runs and written into `src/generated/content.json`:

| File | What it does |
|---|---|
| `scripts/snapshot_content.mjs` | Captures 705 GraphQL responses into `src/generated/content.json` (gitignored, rebuilt every time) |
| `vite-plugin-content-snapshot.ts` | Runs the capture at the start of the build |
| `src/lib/client.ts` | Serves the snapshot; the dev server talks to the live local GraphQL instead |
| `vite-plugin-prerender-routes.ts` | Writes an `index.html` for each of the 351 routes, so Pages answers with a 200 |
| `vite-plugin-github-pages-fallback.ts` | Writes `dist/404.html`, which hands a path the app cannot serve to the app and reloads the root |

`import.meta.env.DEV` cannot be used to tell dev from a production build:
the Tina CLI runs the build with `NODE_ENV=development`. The switch is
`VITE_LIVE_CONTENT`, set by the `dev` script only.

Media paths in the content (`/uploads/...`) are rebased under
`VITE_BASE_PATH` when the snapshot is written — Vite rewrites the asset URLs
in the source but not the ones inside the content.

### Routing
React Router with `BrowserRouter`. Routes resolve to page slugs in TinaCMS (`/services` → loads `content/page/services.mdx`). Hash links (`/#contact`) scroll to section anchors within a page.

| Route | Content |
|---|---|---|
| `/` | Home page |
| `/join` | Join page |
| `/blog` | Blog list |
| `/blog/:slug` | Blog post |
| `/events` | Events list |
| `/events/:slug` | Event detail |
| `/gallery` | Gallery grid |
| `/gallery/:album` | Album detail |
| `/team` | Current and past presidents and boards |
| `/resources` | Resources |
| `/*` | 404 page |

On GitHub Pages the site lives under `/rac-patan-south/`. The router is
given that as its basename, so the paths above stay the same in the code.

## Deployment
Published on GitHub Pages: <https://swapnil-up.github.io/rac-patan-south/>.
`.github/workflows/deploy.yml` builds on a push to `main` and deploys `dist/`.

## For agents

When editing:

1. **Content schemas** live in `tina/collections/`. After changing a schema, rebuild with `pnpm build` to regenerate types.
2. **Components** live in `src/components/`. Props must use generated types from `tina/__generated__/types` — never `Record<string, unknown>` or inline anonymous types.
3. **CSS** uses CSS Modules. Colors must use `var(--*)` custom properties — never hardcode hex/rgba values.
4. **Routing** uses React Router (`Link`).
5. **Build** with `pnpm build` — it regenerates the Tina types, captures the content, and writes the static bundle.
6. **Never import from `tina/__generated__/client`** — import from `src/lib/client.ts` instead, so the site keeps serving the snapshot.
