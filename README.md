A [TinaCMS](https://tina.io/) + React SPA template for NGO websites. Use it as a **template repo**: clone per NGO, swap the content, and deploy.

## How It Works

The repo is split into **template code** and **NGO content**:

| Layer | Directory | What goes here |
|---|---|---|
| **Template** | `src/`, `tina/`, `public/` | React components, CMS config, layout — shared across all NGOs. Update once, pull into all NGO repos. |
| **Content** | `content/` | Every NGO's unique data: pages, team bios, testimonials, settings, brand colors. This is all you change per NGO. |

All brand theming (colors, logo, favicon) lives in `content/settings/global.json` — no code changes needed for a different look.

## Quick Start for a New NGO

```bash
# Clone this repo
git clone <repo-url> my-ngo-website
cd my-ngo-website

# Install
pnpm install

# Initialize content (or just edit content/ directly)
bash scripts/setup-new-ngo.sh

# Start developing
pnpm dev
```

### What to Change Per NGO

1. **`content/settings/global.json`** — NGO name, tagline, contact info, nav links, brand colors
2. **`content/page/*.mdx`** — One page per route (home, join, blog, events, gallery, resources, testimonials, `/*` fallback to 404). Each page has its own sections.
3. **`content/team/*.md`** — Add/remove team member profiles
4. **`content/testimonial/*.md`** — Add/remove testimonials
5. **`public/uploads/`** — Upload images, then reference them in content via `/uploads/filename.jpg`

That's it. The template code in `src/` and `tina/` stays untouched.

### Brand Colors

Edit `content/settings/global.json` → `brand.colors` to set your NGO's palette. Available via the TinaCMS admin under Site Settings → Brand & Theme. Colors are injected as CSS custom properties, so every component picks them up automatically.

## Local Development

```bash
pnpm install
pnpm dev
```

- App: [http://localhost:5173](http://localhost:5173)
- Tina Admin: [http://localhost:5173/admin/index.html](http://localhost:5173/admin/index.html)

### Routes

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
| `/resources` | Resources |
| `/*` | 404 page (falls back from any unknown route) |

Hash links (`/#contact`) scroll to a section anchor within the current page after the page loads.

### Building

```bash
pnpm build          # Build the site
pnpm preview        # Serve the build on http://localhost:4173
```

The build produces a plain static bundle — `dist/` can be hosted anywhere.

The content is read out of the local Tina GraphQL server while the build runs
and written into `src/generated/content.json`, which the site then serves.
That file is regenerated on every build and is not committed. The dev server
does the same thing against the live local GraphQL, so an edit in the admin
shows up on the page straight away.

The published site therefore makes no request to Tina Cloud. Tina Cloud's
public read endpoint refuses every origin this site has been served from
(`access-control-allow-origin: not-allowed`), and no read token is available
in CI — so the content has to travel with the build.

## Deploying

The site is published on GitHub Pages:
**<https://swapnil-up.github.io/rac-patan-south/>**

`.github/workflows/deploy.yml` builds it on every push to `main` and
deploys the `dist/` folder. Two details make it work there:

- **`VITE_BASE_PATH`** — Pages serves the site under `/rac-patan-south/`,
  not `/`. The build puts the assets and the media paths under that prefix.
- **`vite-plugin-github-pages-fallback.ts`** — Pages has no rewrite rules,
  so a deep link has no file behind it. The fallback hands the requested
  path to the app and reloads the root, where the path is restored before
  React starts. `vite-plugin-prerender-routes.ts` gives every route an
  `index.html` of its own, so the links the site is known by answer with a
  200 rather than the fallback's 404.

Vercel is also set up (`vercel.json` handles the rewrite), but GitHub Pages
is where the site is live.

## Pulling Template Updates

When the core template gets new features or fixes:

```bash
git remote add upstream <original-template-url>
git fetch upstream
git merge upstream/main
# Resolve any conflicts (should be minimal if you only changed content/)
```

## Learn More

- [Tina Docs](https://tina.io/docs)
- [TinaCMS on GitHub](https://github.com/tinacms/tinacms)
