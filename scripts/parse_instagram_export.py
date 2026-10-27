#!/usr/bin/env python3
"""Normalise the Instagram data export into a browsable manifest.

Reads the official export (unzipped) in _sources/instagram_export/ and writes:

    _sources/instagram_export/manifest.json   profile + posts/reels/archived/reposts
    _sources/instagram_export/stories.json    archived stories
    _sources/instagram_export/index.md        human-readable chronological index
    _sources/instagram_export/README.md       counts + caveats

Also joins against the partial Playwright scrape in _sources/instagram/manifest.json
by exact timestamp to recover permalinks/shortcodes where available.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("_sources/instagram_export")
ACTIVITY = ROOT / "your_instagram_activity" / "media"
SCRAPE_MANIFEST = Path("_sources/instagram/manifest.json")


def fix_text(value: str | None) -> str | None:
    """Repair UTF-8 text that the export double-encoded as Latin-1."""
    if not value:
        return value
    try:
        return value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def iso(timestamp: int | None) -> str | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()


def media_timestamp(entry: dict) -> int | None:
    if entry.get("creation_timestamp"):
        return entry["creation_timestamp"]
    media = entry.get("media") or []
    return media[0].get("creation_timestamp") if media else entry.get("timestamp")


def caption_of(entry: dict) -> str | None:
    for candidate in [entry.get("title")] + [m.get("title") for m in (entry.get("media") or [])]:
        text = fix_text(candidate)
        if text and text.strip():
            return text.strip()
    return None


def media_kind(uri: str) -> str:
    suffix = Path(uri).suffix.lower()
    if suffix in {".mp4", ".mov"}:
        return "video"
    if suffix in {".heic", ".heif"}:
        return "image_heic"
    if suffix in {".webp"}:
        return "image_webp"
    return "image"


def normalise_entry(entry: dict, category: str) -> dict:
    stamp = media_timestamp(entry)
    media = []
    for item in entry.get("media") or []:
        uri = item.get("uri") or ""
        if not uri:
            continue
        local = ROOT / uri
        media.append(
            {
                "uri": uri,
                "path": str(local),
                "exists": local.exists(),
                "bytes": local.stat().st_size if local.exists() else None,
                "kind": media_kind(uri),
                "timestamp": item.get("creation_timestamp"),
                "date": iso(item.get("creation_timestamp")),
            }
        )
    return {
        "category": category,
        "timestamp": stamp,
        "date": iso(stamp),
        "caption": caption_of(entry),
        "media": media,
        "media_count": len(media),
        "instagram_url": None,
        "shortcode": None,
    }


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def repost_entries(entries: list[dict]) -> list[dict]:
    out = []
    for entry in entries:
        url = caption = owner = None
        for label in entry.get("label_values") or []:
            for nested in label.get("dict") or []:
                fields = {}
                for item in nested.get("dict") or []:
                    name = item.get("label") or item.get("title")
                    if name:
                        fields[name] = item.get("value")
                if fields:
                    url = url or fields.get("URL")
                    caption = caption or fields.get("Caption")
                    owner = owner or fields.get("Username")
        stamp = entry.get("timestamp")
        out.append(
            {
                "category": "repost",
                "timestamp": stamp,
                "date": iso(stamp),
                "caption": fix_text(caption),
                "owner": owner,
                "instagram_url": url,
                "shortcode": (url or "").rstrip("/").split("/")[-1] or None,
                "media": [],
                "media_count": 0,
            }
        )
    return out


def build_scrape_lookup() -> dict[int, dict]:
    if not SCRAPE_MANIFEST.exists():
        return {}
    try:
        data = load(SCRAPE_MANIFEST)
    except Exception:
        return {}
    lookup = {}
    for post in data.get("posts") or []:
        if post.get("taken_at"):
            lookup[int(post["taken_at"])] = post
    return lookup


def main() -> int:
    profile_raw = load(ROOT / "personal_information/personal_information/personal_information.json")
    user = (profile_raw.get("profile_user") or [{}])[0]
    info = user.get("string_map_data") or {}
    profile_photo = (user.get("media_map_data") or {}).get("Profile Photo") or {}

    profile = {
        "username": (info.get("Username") or {}).get("value"),
        "full_name": (info.get("Name") or {}).get("value"),
        "bio": fix_text((info.get("Bio") or {}).get("value")),
        "website": (info.get("Website") or {}).get("value"),
        "email": (info.get("Email") or {}).get("value"),
        "profile_photo": profile_photo.get("uri"),
    }

    scrape = build_scrape_lookup()

    posts = [normalise_entry(e, "post") for e in load(ACTIVITY / "posts_1.json")]
    reels = [normalise_entry(e, "reel") for e in load(ACTIVITY / "reels.json")["ig_reels_media"]]
    archived = [
        normalise_entry(e, "archived") for e in load(ACTIVITY / "archived_posts.json")["ig_archived_post_media"]
    ]
    igtv = [normalise_entry(e, "igtv") for e in load(ACTIVITY / "igtv_videos.json")["ig_igtv_media"]]
    reposts = repost_entries(load(ACTIVITY / "reposts.json"))
    stories = [
        normalise_entry(e, "story") for e in load(ACTIVITY / "stories.json")["ig_stories"]
    ]

    for item in posts + reels + archived + igtv:
        hit = scrape.get(item["timestamp"])
        if hit:
            item["instagram_url"] = hit.get("url")
            item["shortcode"] = hit.get("shortcode")

    items = posts + reels + archived + igtv + reposts
    items.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)
    stories.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)

    manifest = {
        "source": "official Instagram data export",
        "export_file": "instagram-racpatansouth-2026-10-26-GZh8l1lA.zip",
        "parsed_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "counts": {
            "posts": len(posts),
            "reels": len(reels),
            "archived": len(archived),
            "igtv": len(igtv),
            "reposts": len(reposts),
            "stories": len(stories),
            "media_files": sum(item["media_count"] for item in items + stories),
        },
        "items": items,
    }
    (ROOT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (ROOT / "stories.json").write_text(
        json.dumps(stories, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    by_year: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        year = (item.get("date") or "unknown")[:4]
        by_year[year].append(item)

    lines = [
        "# Instagram archive — @racpatansouth",
        "",
        f"Parsed {manifest['parsed_at']} from the official data export.",
        "",
        f"- Posts: {len(posts)}",
        f"- Reels: {len(reels)}",
        f"- Archived posts: {len(archived)}",
        f"- IGTV: {len(igtv)}",
        f"- Reposts: {len(reposts)}",
        f"- Stories: {len(stories)}",
        f"- Media files: {manifest['counts']['media_files']}",
        "",
        "Dates are UTC. `instagram_url` is filled only for items also present in the partial browser scrape.",
        "",
    ]
    for year in sorted(by_year, reverse=True):
        lines.append(f"## {year} ({len(by_year[year])})")
        lines.append("")
        for item in by_year[year]:
            date = (item.get("date") or "")[:10] or "undated"
            caption = (item.get("caption") or "").replace("\n", " ").strip()
            snippet = caption[:140] + ("…" if len(caption) > 140 else "")
            url = item.get("instagram_url") or ""
            bits = [f"**{date}**", f"`{item['category']}`"]
            if item.get("media_count"):
                bits.append(f"{item['media_count']} media")
            if url:
                bits.append(f"[link]({url})")
            lines.append(f"- {' · '.join(bits)} — {snippet}")
        lines.append("")
    (ROOT / "index.md").write_text("\n".join(lines), encoding="utf-8")

    readme = f"""# Instagram export

Official export parsed from `{manifest['export_file']}`.

- Profile: {profile.get('full_name')} (@{profile.get('username')})
- Bio: {profile.get('bio')}
- Website: {profile.get('website')}
- Email: {profile.get('email')}
- Posts: {len(posts)} · Reels: {len(reels)} · Archived: {len(archived)} · IGTV: {len(igtv)} · Reposts: {len(reposts)}
- Stories: {len(stories)} (many are personal/transient; see `stories.json`)
- Media files referenced: {manifest['counts']['media_files']}

Files:
- `manifest.json` — normalized profile + posts/reels/archived/reposts
- `stories.json` — normalized story archive
- `index.md` — chronological human-readable index
- `media/` — export media, paths preserved
- `your_instagram_activity/media/` — original JSON
- `personal_information/` — profile info

Media formats include HEIC and WebP, which most browsers do not render reliably;
they will need conversion before being used on the website.
"""
    (ROOT / "README.md").write_text(readme, encoding="utf-8")

    print(json.dumps(manifest["counts"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
