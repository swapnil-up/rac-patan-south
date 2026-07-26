#!/usr/bin/env bash
set -euo pipefail

echo "=== NGO Website Setup ==="
echo "This will initialize the content/ directory for a new NGO."
echo ""

read -rp "NGO Name: " NGO_NAME
read -rp "Tagline: " TAGLINE
read -rp "Contact Email: " EMAIL

YEAR=$(date +%Y)

# Ensure target directories exist
mkdir -p content/page content/settings content/team content/testimonial

# Copy template content
cp -r tenants/_template/content/page/* content/page/
cp -r tenants/_template/content/settings/* content/settings/
cp -r tenants/_template/content/team/* content/team/
cp -r tenants/_template/content/testimonial/* content/testimonial/

# Update settings with NGO info
TMP=$(mktemp)
if command -v jq &>/dev/null; then
  jq \
    --arg name "$NGO_NAME" \
    --arg tagline "$TAGLINE" \
    --arg email "$EMAIL" \
    --arg year "$YEAR" \
    '.siteName = $name | .tagline = $tagline | .contactEmail = $email | .footerText = "© \($year) \($name). All rights reserved."' \
    content/settings/global.json > "$TMP" && mv "$TMP" content/settings/global.json
  echo "✓ Settings updated for: $NGO_NAME"
else
  echo "⚠ jq not found. Install jq or manually edit content/settings/global.json"
  echo "  siteName: $NGO_NAME"
  echo "  tagline: $TAGLINE"
  echo "  contactEmail: $EMAIL"
fi

echo ""
echo "Done! Next steps:"
echo "  1. Edit content/page/home.mdx with your NGO's sections"
echo "  2. Add team members in content/team/"
echo "  3. Add testimonials in content/testimonial/"
echo "  4. Upload images via TinaCMS admin or put them in public/uploads/"
echo "  5. Run pnpm dev to preview"
