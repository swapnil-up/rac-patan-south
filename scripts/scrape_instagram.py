#!/usr/bin/env python3
"""Scrape @racpatansouth posts, reels, highlights and media into _sources/instagram/.

Uses a logged-in Firefox session via Playwright so Instagram's API rate limits
do not apply to the browser's own requests. Media is downloaded immediately
because the CDN URLs are signed and expire.

Usage:
    python3 scripts/scrape_instagram.py --limit 3      # smoke test
    python3 scripts/scrape_instagram.py                # full scrape (resumable)
    python3 scripts/scrape_instagram.py --highlights   # also fetch highlights
"""

from __future__ import annotations

import argparse
import asyncio
import http.cookiejar
import json
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
from playwright.async_api import async_playwright

OUT = Path("_sources/instagram")
COOKIES = OUT / "cookies.txt"
PROFILE = "racpatansouth"
BASE = f"https://www.instagram.com/{PROFILE}"
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
MARKER = "xdt_api__v1__media__shortcode__web_info"


def log(message: str) -> None:
    print(message, flush=True)


def load_cookies(path: Path) -> list[dict]:
    jar = http.cookiejar.MozillaCookieJar(str(path))
    jar.load(ignore_discard=True, ignore_expires=True)
    cookies = []
    for cookie in jar:
        expires = -1
        if cookie.expires:
            expires = int(cookie.expires / 1000) if cookie.expires > 1e12 else int(cookie.expires)
        cookies.append(
            {
                "name": cookie.name,
                "value": cookie.value,
                "domain": cookie.domain,
                "path": cookie.path,
                "secure": cookie.secure,
                "expires": expires,
                "httpOnly": False,
            }
        )
    return cookies


def find_key(obj, key: str):
    if isinstance(obj, dict):
        if key in obj:
            yield obj[key]
        for value in obj.values():
            yield from find_key(value, key)
    elif isinstance(obj, list):
        for value in obj:
            yield from find_key(value, key)


def extract_items(scripts: list[str]) -> list[dict]:
    for script in scripts:
        if MARKER not in script:
            continue
        try:
            payload = json.loads(script)
        except Exception:
            continue
        for found in find_key(payload, MARKER):
            items = (found or {}).get("items") or []
            if items:
                return items
    return []


def extract_highlight_items(scripts: list[str]) -> list[dict]:
    items: list[dict] = []
    for script in scripts:
        if "reels_media" not in script:
            continue
        try:
            payload = json.loads(script)
        except Exception:
            continue
        for key in ("xdt_api__v1__feed__reels_media__connection", "xdt_api__v1__feed__reels_media"):
            for found in find_key(payload, key):
                if isinstance(found, dict) and "edges" in found:
                    for edge in found.get("edges") or []:
                        node = (edge or {}).get("node") or {}
                        items.extend(node.get("items") or [])
                elif isinstance(found, dict):
                    items.extend(found.get("items") or [])
    return items


def extract_profile(scripts: list[str]) -> dict:
    for script in scripts:
        if '"biography"' not in script:
            continue
        try:
            payload = json.loads(script)
        except Exception:
            continue
        for found in find_key(payload, "data"):
            if isinstance(found, dict) and "biography" in found and "full_name" in found:
                return {
                    "biography": found.get("biography"),
                    "full_name": found.get("full_name"),
                    "username": found.get("username"),
                    "external_url": found.get("external_url"),
                    "id": found.get("id"),
                    "profile_pic_url": found.get("profile_pic_url"),
                }
    return {}


def best_image(candidates: list[dict]) -> dict | None:
    usable = [c for c in candidates or [] if c.get("url")]
    if not usable:
        return None
    return max(usable, key=lambda c: (c.get("width") or 0) * (c.get("height") or 0))


def best_video(versions: list[dict]) -> dict | None:
    usable = [v for v in versions or [] if v.get("url")]
    if not usable:
        return None
    return max(usable, key=lambda v: (v.get("width") or 0) * (v.get("height") or 0))


def iso_date(timestamp: int | None) -> str | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()


def content_ext(content_type: str) -> str:
    content_type = (content_type or "").split(";")[0].strip().lower()
    return {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
    }.get(content_type, "")


def download(url: str, dest: Path) -> tuple[bool, str]:
    if dest.exists() and dest.stat().st_size > 0:
        return True, "cached"
    dest.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": UA, "Referer": f"{BASE}/"}
    try:
        with requests.get(url, headers=headers, stream=True, timeout=90) as res:
            if res.status_code != 200:
                return False, f"http {res.status_code}"
            tmp = dest.with_suffix(dest.suffix + ".part")
            with tmp.open("wb") as handle:
                for chunk in res.iter_content(1 << 16):
                    if chunk:
                        handle.write(chunk)
            if tmp.stat().st_size == 0:
                tmp.unlink(missing_ok=True)
                return False, "empty"
            tmp.replace(dest)
            return True, "downloaded"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"


def pick_ext(item: dict) -> str:
    return ".mp4" if item.get("video_versions") else ".jpg"


def media_plan(item: dict) -> list[dict]:
    """Return a flat list of downloadable children with their metadata."""
    children = item.get("carousel_media") or [item]
    plan = []
    for child in children:
        video = best_video(child.get("video_versions") or [])
        image = best_image((child.get("image_versions2") or {}).get("candidates") or [])
        chosen = video or image
        if not chosen:
            continue
        plan.append(
            {
                "pk": child.get("pk") or child.get("id"),
                "media_type": child.get("media_type"),
                "url": chosen["url"],
                "width": chosen.get("width"),
                "height": chosen.get("height"),
                "kind": "video" if video else "image",
                "accessibility_caption": child.get("accessibility_caption"),
            }
        )
    return plan


def download_media(item: dict, shortcode: str, folder: Path | None = None) -> list[dict]:
    plan = media_plan(item)
    base = folder or (OUT / "media" / shortcode)
    results = []
    for index, media in enumerate(plan, start=1):
        ext = ".mp4" if media["kind"] == "video" else ".jpg"
        name = f"{index:02d}_{media['pk']}{ext}"
        dest = base / name
        ok, detail = download(media["url"], dest)
        media["local"] = str(dest) if ok else None
        media["status"] = detail
        results.append(media)
    return results


def summarize_item(item: dict, shortcode: str, url: str, media: list[dict]) -> dict:
    caption = (item.get("caption") or {}).get("text") if isinstance(item.get("caption"), dict) else item.get("caption")
    user = item.get("user") or {}
    location = item.get("location") or {}
    return {
        "shortcode": shortcode,
        "url": url,
        "taken_at": item.get("taken_at"),
        "date": iso_date(item.get("taken_at")),
        "media_type": item.get("media_type"),
        "product_type": item.get("product_type"),
        "caption": caption,
        "username": user.get("username"),
        "full_name": user.get("full_name"),
        "location": location.get("name"),
        "like_count": item.get("like_count"),
        "comment_count": item.get("comment_count"),
        "original_width": item.get("original_width"),
        "original_height": item.get("original_height"),
        "carousel_count": len(item.get("carousel_media") or []),
        "media": media,
    }


async def collect_profile_links(page, limit: int | None = None) -> tuple[list[str], list[str], dict]:
    await page.goto(f"{BASE}/", wait_until="domcontentloaded", timeout=90000)
    await page.wait_for_timeout(6000)

    scripts = await page.eval_on_selector_all(
        'script[type="application/json"]', "els => els.map(e => e.textContent)"
    )
    profile_meta = extract_profile(scripts)
    try:
        avatar = await page.eval_on_selector(
            'img[alt*="profile picture"]', "el => el.getAttribute('src')"
        )
        if avatar:
            profile_meta["profile_pic_url"] = avatar
    except Exception:
        pass

    links: list[str] = []
    seen = set()
    stale = 0
    for _ in range(200):
        hrefs = await page.eval_on_selector_all(
            'a[href*="/p/"], a[href*="/reel/"]',
            "els => els.map(e => e.getAttribute('href'))",
        )
        before = len(seen)
        for href in hrefs:
            if not href:
                continue
            if not re.match(rf"^/{PROFILE}/(p|reel)/[^/]+/?$", href):
                continue
            if href in seen:
                continue
            seen.add(href)
            links.append(href)
        if limit and len(links) >= limit:
            break
        if len(seen) == before:
            stale += 1
            if stale >= 8:
                break
        else:
            stale = 0
        await page.evaluate("window.scrollBy(0, window.innerHeight * 2)")
        await page.wait_for_timeout(2000 + random.random() * 900)

    highlight_hrefs = await page.eval_on_selector_all(
        'a[href*="/stories/highlights/"]',
        "els => [...new Set(els.map(e => e.getAttribute('href')))]",
    )
    highlights = [
        h for h in highlight_hrefs if h and re.match(r"^/stories/highlights/[^/]+/?$", h)
    ]
    return links, highlights, profile_meta


async def fetch_post(context, page, url: str, extractor, retries: int = 3):
    """Load a post/highlight page, recovering a fresh page after navigation errors."""
    absolute = url if url.startswith("http") else f"https://www.instagram.com{url}"
    for attempt in range(retries):
        try:
            await page.goto(absolute, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(900 + random.random() * 500)
            scripts = await page.eval_on_selector_all(
                'script[type="application/json"]', "els => els.map(e => e.textContent)"
            )
            return page, extractor(scripts)
        except Exception:
            try:
                await page.close()
            except Exception:
                pass
            page = await context.new_page()
            if attempt == retries - 1:
                raise
            await asyncio.sleep(3 + random.random() * 2)
    return page, []


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="stop after N posts (smoke test)")
    parser.add_argument("--highlights", action="store_true", help="also scrape story highlights")
    parser.add_argument("--refresh", action="store_true", help="re-fetch posts even if raw JSON exists")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "raw" / "posts").mkdir(parents=True, exist_ok=True)
    (OUT / "media").mkdir(parents=True, exist_ok=True)

    cookies = load_cookies(COOKIES)
    log(f"[cookies] loaded {len(cookies)} cookies")

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        "profile": PROFILE,
        "scraped_at": None,
        "posts": [],
        "highlights": [],
    }
    known = {post["shortcode"] for post in manifest["posts"]}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True, args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent=UA,
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        await context.add_cookies(cookies)
        page = await context.new_page()

        log("[profile] collecting post links")
        links, highlights, profile_meta = await collect_profile_links(page, args.limit)
        if profile_meta:
            manifest["profile_meta"] = profile_meta
            avatar = profile_meta.get("profile_pic_url")
            if avatar:
                ok, detail = download(avatar, OUT / "media" / "profile" / "avatar.jpg")
                log(f"[profile] avatar: {detail}")
            log(
                f"[profile] {profile_meta.get('full_name') or PROFILE} "
                f"({profile_meta.get('username') or PROFILE})"
            )
        log(f"[profile] found {len(links)} post/reel links, {len(highlights)} highlights")

        start = time.time()
        for index, href in enumerate(links, start=1):
            shortcode = href.rstrip("/").split("/")[-1]
            raw_path = OUT / "raw" / "posts" / f"{shortcode}.json"
            if shortcode in known and not args.refresh:
                log(f"  [{index}/{len(links)}] {shortcode} cached")
                continue

            try:
                page, items = await fetch_post(context, page, href, extract_items)
            except Exception as exc:
                log(f"  [{index}/{len(links)}] {shortcode} ERROR {type(exc).__name__}: {exc}")
                try:
                    await page.close()
                except Exception:
                    pass
                page = await context.new_page()
                continue

            if not items:
                log(f"  [{index}/{len(links)}] {shortcode} no media (login/age gate?)")
                continue

            item = items[0]
            raw_path.write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
            media = download_media(item, shortcode)
            entry = summarize_item(item, shortcode, f"https://www.instagram.com{href}", media)
            manifest["posts"] = [p for p in manifest["posts"] if p["shortcode"] != shortcode] + [entry]
            known.add(shortcode)

            ok = sum(1 for m in media if m["status"] in {"downloaded", "cached"})
            caption = (entry.get("caption") or "").replace("\n", " ")[:60]
            log(f"  [{index}/{len(links)}] {shortcode} {entry.get('date','?')[:10]} media={ok}/{len(media)} | {caption}")

            if index % 5 == 0:
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
            await page.wait_for_timeout(600 + random.random() * 600)

        if args.highlights and highlights:
            log(f"[highlights] scraping {len(highlights)}")
            (OUT / "raw" / "highlights").mkdir(parents=True, exist_ok=True)
            for index, href in enumerate(highlights, start=1):
                highlight_id = href.rstrip("/").split("/")[-1]
                try:
                    page, items = await fetch_post(context, page, href, extract_highlight_items)
                except Exception as exc:
                    log(f"  [{index}/{len(highlights)}] {highlight_id} ERROR {type(exc).__name__}: {exc}")
                    try:
                        await page.close()
                    except Exception:
                        pass
                    page = await context.new_page()
                    continue
                if not items:
                    log(f"  [{index}/{len(highlights)}] {highlight_id} no items")
                    continue
                (OUT / "raw" / "highlights" / f"{highlight_id}.json").write_text(
                    json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
                )
                entry = {"id": highlight_id, "url": f"https://www.instagram.com{href}", "items": []}
                for item in items:
                    media = download_media(item, highlight_id, OUT / "media" / "highlights" / highlight_id)
                    entry["items"].append(
                        {
                            "pk": item.get("pk"),
                            "taken_at": item.get("taken_at"),
                            "date": iso_date(item.get("taken_at")),
                            "media_type": item.get("media_type"),
                            "caption": (item.get("caption") or {}).get("text")
                            if isinstance(item.get("caption"), dict)
                            else item.get("caption"),
                            "media": media,
                        }
                    )
                manifest["highlights"] = [h for h in manifest["highlights"] if h["id"] != highlight_id] + [entry]
                log(f"  [{index}/{len(highlights)}] {highlight_id} items={len(items)}")

        await browser.close()

    manifest["scraped_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest["posts"].sort(key=lambda p: p.get("taken_at") or 0, reverse=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    total_media = sum(len(p.get("media") or []) for p in manifest["posts"])
    downloaded = sum(
        1
        for p in manifest["posts"]
        for m in (p.get("media") or [])
        if m.get("status") in {"downloaded", "cached"}
    )
    summary = {
        "posts": len(manifest["posts"]),
        "media": total_media,
        "downloaded": downloaded,
        "highlights": len(manifest["highlights"]),
        "seconds": round(time.time() - start, 1) if "start" in locals() else None,
    }
    log("\n[done] " + json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
