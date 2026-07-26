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
2. **`content/page/home.mdx`** — Page sections (hero, about, services, team, etc.)
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

### Building

```bash
pnpm build-local    # Build against local content (no Tina Cloud needed)
pnpm build          # Build with Tina Cloud (set .env vars first)
```

## Deploying

Client-side SPA — `pnpm build` produces `dist/index.html` + assets. Requires a rewrite/fallback to `index.html`:

- **Vercel** — `vercel.json` (included) handles it automatically
- **GitHub Pages** — see `.github/workflows/deploy.yml`

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
