#!/usr/bin/env bash
# scripts/optimize-images.sh
#
# Converts uploaded images to optimized WebP using ffmpeg.
# Updates content file references and removes originals.
#
# Usage:
#   ./scripts/optimize-images.sh                  # defaults
#   ./scripts/optimize-images.sh --quality 70     # lower quality = smaller
#   ./scripts/optimize-images.sh --dry-run        # preview only
#   ./scripts/optimize-images.sh --max-width 1600 # cap resolution

set -euo pipefail

QUALITY=80
MAX_WIDTH=1920
MIN_SIZE=51200
UPLOADS_DIR="public/uploads"
CONTENT_DIR="content"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quality) QUALITY="$2"; shift 2 ;;
    --max-width) MAX_WIDTH="$2"; shift 2 ;;
    --min-size) MIN_SIZE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help)
      echo "Optimize images in $UPLOADS_DIR to WebP using ffmpeg."
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo "  --quality NUM       WebP quality 0-100 (default: $QUALITY)"
      echo "  --max-width NUM     Max width in pixels (default: $MAX_WIDTH)"
      echo "  --min-size NUM      Skip files smaller than N bytes (default: $MIN_SIZE)"
      echo "  --dry-run           Show what would be done without doing it"
      exit 0
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "=== Image Optimizer ==="
echo "Quality: $QUALITY | Max width: ${MAX_WIDTH}px | Min size: ${MIN_SIZE}B | Dry run: $DRY_RUN"
echo ""

if ! command -v ffmpeg &>/dev/null; then
  echo "Error: ffmpeg not found."
  echo "  Ubuntu/Debian: sudo apt install ffmpeg"
  echo "  macOS: brew install ffmpeg"
  exit 1
fi

if [ ! -d "$UPLOADS_DIR" ]; then
  echo "Error: $UPLOADS_DIR not found. Run from the repo root."
  exit 1
fi

human() {
  local bytes=$1
  if [ "$bytes" -lt 1024 ]; then echo "${bytes}B"
  elif [ "$bytes" -lt 1048576 ]; then echo "$(echo "scale=1; $bytes/1024" | bc -l)KB"
  else echo "$(echo "scale=1; $bytes/1048576" | bc -l)MB"
  fi
}

TOTAL_ORIG=0
TOTAL_WEBP=0
CONVERTED=0

convert_image() {
  local file=$1
  dir=$(dirname "$file")
  base=$(basename "$file")
  name="${base%.*}"
  ext="${base##*.}"
  output="$dir/$name.webp"

  local orig_size
  orig_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)

  if [ "$orig_size" -lt "$MIN_SIZE" ]; then
    echo "  Skipping small: $base ($(human "$orig_size"))"
    return 0
  fi

  if [ -f "$output" ]; then
    local src_mtime webp_mtime
    src_mtime=$(stat -c%Y "$file" 2>/dev/null || stat -f%m "$file" 2>/dev/null)
    webp_mtime=$(stat -c%Y "$output" 2>/dev/null || stat -f%m "$output" 2>/dev/null)
    if [ "$src_mtime" -le "$webp_mtime" ]; then
      local webp_size
      webp_size=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null)
      if [ "$webp_size" -lt "$orig_size" ]; then
        echo "  Already optimized: $base ($(human "$webp_size") vs $(human "$orig_size"))"
        return 0
      fi
    fi
  fi

  echo "  Converting: $base ($(human "$orig_size"))"
  if [ "$DRY_RUN" = true ]; then
    echo "    -> $name.webp (dry run)"
    return 0
  fi

  if [[ "$ext" =~ ^[Gg][Ii][Ff]$ ]]; then
    ffmpeg -y -i "$file" -c:v libwebp_anim -quality "$QUALITY" \
      -compression_level 6 "$output" 2>/dev/null
  else
    ffmpeg -y -i "$file" -c:v libwebp -quality "$QUALITY" \
      -compression_level 6 \
      -vf "scale='min($MAX_WIDTH,iw)':min'($MAX_WIDTH,ih)':force_original_aspect_ratio=decrease" \
      "$output" 2>/dev/null
  fi

  if [ ! -f "$output" ]; then
    echo "    FAILED: $base"
    return 1
  fi

  local new_size
  new_size=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null)

  if [ "$new_size" -ge "$orig_size" ]; then
    echo "    WebP no smaller ($(human "$new_size") vs $(human "$orig_size")), removing"
    rm "$output"
    return 0
  fi

  TOTAL_ORIG=$((TOTAL_ORIG + orig_size))
  TOTAL_WEBP=$((TOTAL_WEBP + new_size))
  CONVERTED=$((CONVERTED + 1))
  local saved=$((orig_size - new_size))
  echo "    -> $name.webp ($(human "$new_size"), saved $(human "$saved"))"

  update_references "$base" "$name.webp"

  rm "$file"
}

update_references() {
  local old=$1 new=$2

  find "$CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" -o -name "*.json" \) \
    -exec grep -l "/uploads/$old" {} \; 2>/dev/null | while read -r cf; do
    sed -i "s|/uploads/$old|/uploads/$new|g" "$cf"
    echo "    Updated: $cf"
  done

  find "$CONTENT_DIR" -type f \( -name "*.md" -o -name "*.mdx" -o -name "*.json" \) \
    -exec grep -l "uploads/$old" {} \; 2>/dev/null | while read -r cf; do
    sed -i "s|uploads/$old|uploads/$new|g" "$cf"
    echo "    Updated (no-slash): $cf"
  done
}

echo "Scanning $UPLOADS_DIR for non-WebP images..."
echo ""

while IFS= read -r -d '' file; do
  convert_image "$file"
done < <(find "$UPLOADS_DIR" -type f \( \
  -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o \
  -iname "*.gif" -o -iname "*.bmp" -o -iname "*.tiff" -o -iname "*.tif" \
\) -print0)

echo ""
echo "=== Summary ==="
if [ "$CONVERTED" -gt 0 ]; then
  pct=$(echo "scale=1; 100 * ($TOTAL_ORIG - $TOTAL_WEBP) / $TOTAL_ORIG" | bc -l 2>/dev/null || echo "?")
  echo "Files converted: $CONVERTED"
  echo "Before: $(human "$TOTAL_ORIG")"
  echo "After:  $(human "$TOTAL_WEBP")"
  echo "Saved:  $(human $((TOTAL_ORIG - TOTAL_WEBP))) (${pct}%)"
else
  echo "No images needed optimization."
fi
