#!/usr/bin/env python3
"""Scrape the old RAC Patan South Blogspot site into _sources/blogspot/.

Pulls posts and static pages from Blogger's public JSON feeds, saves raw
JSON/HTML, downloads or decodes images, and converts bodies to Markdown.

Usage:
    python3 scripts/scrape_blogspot.py [--no-wayback]
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup, Comment

BLOG = "https://racpatansouth.blogspot.com"
OUT = Path("_sources/blogspot")
TIMEOUT = 25
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

session = requests.Session()
session.headers["User-Agent"] = UA


def slugify(value: str, max_len: int = 80) -> str:
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    value = re.sub(r"[\s_-]+", "-", value)
    return value[:max_len].strip("-") or "untitled"


def entry_url(entry: dict, fallback: str = "") -> str:
    for link in entry.get("link", []):
        if link.get("rel") == "alternate":
            return link.get("href", fallback)
    return fallback


def fetch_json(url: str) -> dict:
    res = session.get(url, timeout=TIMEOUT)
    res.raise_for_status()
    return res.json()


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_data_uri(src: str) -> tuple[bytes, str] | None:
    match = re.match(r"data:([^;,]+);base64,(.*)", src, re.DOTALL)
    if not match:
        return None
    mime, payload = match.group(1), match.group(2)
    ext = mimetypes.guess_extension(mime) or ".bin"
    if ext == ".jpe":
        ext = ".jpg"
    try:
        return base64.b64decode(re.sub(r"\s+", "", payload)), ext
    except Exception:
        return None


def safe_suffix(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tif", ".tiff"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    return ".jpg"


def download_image(url: str, dest: Path) -> tuple[bool, str]:
    if dest.exists() and dest.stat().st_size > 0:
        return True, "cached"
    try:
        res = session.get(url, timeout=TIMEOUT, allow_redirects=True)
        if res.status_code != 200 or not res.content:
            return False, f"http {res.status_code}"
        content_type = res.headers.get("content-type", "")
        if "image" not in content_type and not res.content[:4] in (b"\xff\xd8\xff\xe0", b"\x89PNG", b"GIF8"):
            return False, f"not an image ({content_type or 'unknown'})"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(res.content)
        return True, "downloaded"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"


def wayback_image(url: str, dest: Path) -> tuple[bool, str]:
    try:
        res = session.get(
            "https://archive.org/wayback/available",
            params={"url": url},
            timeout=TIMEOUT,
        )
        if res.status_code != 200:
            return False, f"wayback api http {res.status_code}"
        closest = (res.json().get("archived_snapshots") or {}).get("closest")
        if not closest or not closest.get("available"):
            return False, "no snapshot"
        raw_url = f"https://web.archive.org/web/{closest['timestamp']}id_/{url}"
        return download_image(raw_url, dest)
    except Exception as exc:
        return False, f"wayback {type(exc).__name__}: {exc}"


def process_images(soup: BeautifulSoup, slug: str, base_url: str, use_wayback: bool) -> list[dict]:
    image_dir = OUT / "images" / slug
    image_dir.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    seen: dict[str, str] = {}

    for index, img in enumerate(soup.find_all("img"), start=1):
        src = img.get("src", "").strip()
        if not src:
            continue

        if src.startswith("data:"):
            parsed = parse_data_uri(src)
            if not parsed:
                records.append({"src": "data:", "status": "undecodable", "local": None})
                continue
            payload, ext = parsed
            name = f"inline-{index:02d}{ext}"
            dest = image_dir / name
            dest.write_bytes(payload)
            img["src"] = f"../../images/{slug}/{name}"
            records.append({"src": "data:", "status": "decoded", "local": str(dest)})
            continue

        absolute = requests.compat.urljoin(base_url, src)
        if absolute in seen:
            img["src"] = seen[absolute]
            continue

        suffix = safe_suffix(absolute)
        stem = slugify(Path(urlparse(absolute).path).stem) or f"image-{index:02d}"
        name = f"{index:02d}-{stem}{suffix}"
        dest = image_dir / name

        ok, detail = download_image(absolute, dest)
        source = "live"
        if not ok and use_wayback:
            ok, detail = wayback_image(absolute, dest)
            source = "wayback"

        if ok:
            relative = f"../../images/{slug}/{name}"
            img["src"] = relative
            seen[absolute] = relative
            records.append({"src": absolute, "status": "downloaded", "via": source, "local": str(dest)})
        else:
            records.append({"src": absolute, "status": "failed", "detail": detail, "local": None})

    for index, anchor in enumerate(soup.find_all("a", href=True), start=1):
        href = anchor["href"].strip()
        if not href.startswith("data:"):
            continue
        inner = anchor.find("img")
        if inner and inner.get("src", "").startswith("../../images/"):
            anchor["href"] = inner["src"]
            continue
        parsed = parse_data_uri(href)
        if not parsed:
            continue
        payload, ext = parsed
        name = f"inline-link-{index:02d}{ext}"
        dest = image_dir / name
        dest.write_bytes(payload)
        relative = f"../../images/{slug}/{name}"
        anchor["href"] = relative
        records.append({"src": "data:", "status": "decoded", "local": str(dest)})

    return records


def html_to_markdown(html: str) -> str:
    pandoc = shutil.which("pandoc")
    if pandoc:
        try:
            res = subprocess.run(
                [pandoc, "-f", "html", "-t", "gfm", "--wrap=none"],
                input=html,
                text=True,
                capture_output=True,
                timeout=60,
            )
            if res.returncode == 0:
                return res.stdout.strip()
        except Exception:
            pass
    return BeautifulSoup(html, "html.parser").get_text("\n\n").strip()


def clean_body(body_html: str) -> BeautifulSoup:
    soup = BeautifulSoup(body_html, "html.parser")
    for tag in soup.find_all(["script", "style", "noscript"]):
        tag.decompose()
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()
    for tag in soup.find_all(["div", "span", "p"]):
        if not tag.get_text(strip=True) and not tag.find(["img", "a", "iframe", "video"]):
            tag.decompose()
    return soup


def frontmatter(meta: dict) -> str:
    lines = ["---"]
    for key, value in meta.items():
        if value is None or value == "":
            continue
        if isinstance(value, list):
            if not value:
                continue
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {json.dumps(item, ensure_ascii=False)}")
        else:
            lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
    lines.append("---")
    return "\n".join(lines)


def process_entry(
    entry: dict,
    kind: str,
    base_url: str,
    use_wayback: bool,
) -> dict:
    title = entry.get("title", {}).get("$t", "Untitled")
    published = entry.get("published", {}).get("$t", "")
    updated = entry.get("updated", {}).get("$t", "")
    authors = entry.get("author", [])
    if isinstance(authors, dict):
        authors = [authors]
    author = ", ".join(
        a.get("name", {}).get("$t", "") for a in authors if isinstance(a, dict)
    )
    labels = [c.get("term", "") for c in entry.get("category", [])]
    url = entry_url(entry, base_url)
    date = published[:10] if published else "undated"
    slug_base = Path(urlparse(url).path).name
    slug_base = re.sub(r"\.html?$", "", slug_base)
    slug = f"{date}-{slugify(slug_base)}" if kind == "post" else slugify(slug_base)

    body_html = entry.get("content", {}).get("$t", "")
    soup = clean_body(body_html)
    images = process_images(soup, slug, url, use_wayback)
    cleaned_html = str(soup)

    html_path = OUT / "html" / f"{kind}s" / f"{slug}.html"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(cleaned_html, encoding="utf-8")

    markdown_body = html_to_markdown(cleaned_html)
    meta = {
        "title": title,
        "date": published,
        "updated": updated,
        "author": author,
        "labels": labels,
        "source_url": url,
        "kind": kind,
    }
    md_path = OUT / "markdown" / f"{kind}s" / f"{slug}.md"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(frontmatter(meta) + "\n\n" + markdown_body + "\n", encoding="utf-8")

    failed = [img for img in images if img["status"] == "failed"]
    return {
        "slug": slug,
        "title": title,
        "published": published,
        "updated": updated,
        "author": author,
        "labels": labels,
        "url": url,
        "html": str(html_path),
        "markdown": str(md_path),
        "images_total": len(images),
        "images_failed": len(failed),
        "images": images,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-wayback", action="store_true", help="skip Wayback Machine recovery")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)

    sources = {
        "posts": f"{BLOG}/feeds/posts/default?alt=json&max-results=500",
        "pages": f"{BLOG}/feeds/pages/default?alt=json&max-results=500",
    }

    report = {
        "blog": BLOG,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "posts": [],
        "pages": [],
        "summary": {},
    }

    for kind, feed_url in sources.items():
        print(f"[feed] {kind}: {feed_url}")
        feed = fetch_json(feed_url)
        save_json(OUT / "raw" / f"{kind}.json", feed)
        entries = feed.get("feed", {}).get("entry", [])
        print(f"[feed] {kind}: {len(entries)} entries")

        for i, entry in enumerate(entries, start=1):
            title = entry.get("title", {}).get("$t", "Untitled")
            print(f"  [{i}/{len(entries)}] {title[:70]}")
            report[kind].append(process_entry(entry, "post" if kind == "posts" else "page", BLOG, not args.no_wayback))

    posts = report["posts"]
    pages = report["pages"]
    all_images = [img for item in posts + pages for img in item["images"]]
    report["summary"] = {
        "posts": len(posts),
        "pages": len(pages),
        "images_total": len(all_images),
        "images_downloaded": sum(1 for i in all_images if i["status"] in {"downloaded", "decoded"}),
        "images_failed": sum(1 for i in all_images if i["status"] == "failed"),
        "images_via_wayback": sum(1 for i in all_images if i.get("via") == "wayback"),
    }

    save_json(OUT / "manifest.json", report)

    summary = report["summary"]
    readme = f"""# Blogspot archive — racpatansouth.blogspot.com

Scraped {report['scraped_at']}.

- Posts: {summary['posts']}
- Static pages: {summary['pages']}
- Images recovered: {summary['images_downloaded']} / {summary['images_total']}
- Images failed: {summary['images_failed']} (mostly dead 2012–13 Facebook CDN links)
- Recovered via Wayback: {summary['images_via_wayback']}

Layout:
- `raw/` — original Blogger JSON feeds
- `html/` — cleaned post/page HTML with local image paths
- `markdown/` — converted Markdown with YAML frontmatter
- `images/<slug>/` — downloaded and decoded images
- `manifest.json` — full inventory including failed image URLs

Regenerate: `python3 scripts/scrape_blogspot.py`
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    print("\n[done]")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
