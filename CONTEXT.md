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
| Page | `content/page/` | Static pages with sections (home, about, join) |
| Team | `content/team/` | Club members/board |
| Testimonial | `content/testimonial/` | Quotes from beneficiaries/partners |
| Settings | `content/settings/` | Global site config, brand colors, nav |

### Planned collections (to be built)
- Blog Posts — `content/blog/`
- Events — `content/events/`
- Gallery Albums — `content/gallery/`
- Sponsors/Partners — `content/sponsors/`
- Resources — `content/resources/`

### Brand theming
All brand colors are configured in `content/settings/global.json → brand.colors` and injected as CSS custom properties by `src/App.tsx:applyBrandTheme()`. No hardcoded colors in components or CSS.

## Routing

Currently a single-page with hash anchors. Planned: React Router with proper routes:

| Route | Content |
|---|---|
| `/` | Home page (sections) |
| `/blog` | Blog list |
| `/blog/:slug` | Blog post |
| `/events` | Events list |
| `/events/:slug` | Event detail |
| `/gallery` | Gallery album grid |
| `/gallery/:album` | Album photos |
| `/join` | Membership page |
| `/resources` | Downloads |

## For agents

When editing:
1. Content schemas live in `tina/collections/`. After changing a schema, rebuild with `pnpm build-local` to regenerate types.
2. Components live in `src/components/`. Props must use generated types from `tina/__generated__/types` (never `Record<string, unknown>`).
3. CSS uses CSS Modules. Colors must use `var(--*)` custom properties — never hardcode hex/rgba.
4. Routing uses `NavigateContext` from `src/navigate.ts` (not React Router yet).
