#!/usr/bin/env python3
"""Import the board record reconstructed from the district portal into the site.

The district portal (my.rotaract3292.org) records, for every member and every
rota year, the designation that member held in the club. Aggregated across the
club's 148 members that is the board of directors year by year — the only
surviving record for the early years, which the public site never covered.

This script merges that record with what the site already claims and rewrites
content/team-terms/*.md.

Precedence, highest first:

  1. a portal office — the designation the portal records for that member that
     year. It wins outright, including over a different role elsewhere.
  2. a portal "Club Member" — an explicit claim that the member held no office
     that year. It displaces any role recorded elsewhere for that person.
  3. the club's Blogspot board page — fills slots the portal is silent about.
  4. the site's existing records — fill whatever is still open.

Only "N/A" (or no row at all) counts as portal silence.

Usage:
    python3 scripts/import_portal_board.py [--portal ~/github/racps/portal]
                                             [--no-photos]
                                             [--dry-run]
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
TERMS_DIR = ROOT / "content" / "team-terms"
TEAM_PHOTOS = ROOT / "public" / "uploads" / "team"

DEFAULT_PORTAL = Path.home() / "github" / "racps" / "portal"
CONFLICT_REPORT = DEFAULT_PORTAL / "analysis" / "board-import-conflicts.md"

ROTA_YEARS = [
    "2012-13", "2013-14", "2014-15", "2015-16", "2016-17", "2017-18", "2018-19",
    "2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26",
    "2026-27",
]

# The same person, spelled differently across sources. The key on the left is
# normalised (letters only, lowercased); the value is the portal's spelling.
NAME_ALIASES = {
    "tejanmaharjan": "Tejan Shrestha",
    "shehashakya": "Sneha Shakya",
    "suzannasiddhibajracharya": "Suzana Siddhi Bajracharya",
    "suzanabajracharya": "Suzana Siddhi Bajracharya",
    "preetipsen": "Preeti Psen Khan Tharu",
    "preetypsen": "Preeti Psen Khan Tharu",
    "siddhikakhadka": "Sidhhika Khadka",
    "prashantbhattrai": "Prashant Bhattarai",
}

# Roles that describe a status rather than a slot on the board.
STATUS_ROLES = {"pastpresident"}

# Display order for the board list.
ROLE_ORDER = [
    "immediate past president",
    "president elect",
    "charter president",
    "vice president",
    "secretary",
    "joint secretary",
    "treasurer",
    "joint treasurer",
    "sergeant at arms",
    "club advisor",
    "club administration chair",
    "club service director",
    "service project chair",
    "community service director",
    "professional development chair",
    "professional development director",
    "international service chair",
    "international service director",
    "interact coordinator",
    "it officer",
    "editor / publication officer",
    "public image chair",
    "membership chair",
    "partner in service co-ordinator",
]

ROLE_RANK = {re.sub(r"[^a-z0-9]", "", role.lower()): i for i, role in enumerate(ROLE_ORDER)}

# Site notes that the portal record has made stale, and the notes this script
# writes itself — the latter so that re-running never piles them up.
STALE_PHRASES = (
    "still to be confirmed",
    "still to be identified",
    "still to confirm",
    "not recorded in the archive",
    "only the president",
    "the full board is still",
    "spelling to verify",
    "should be verified",
    "role abbreviation to confirm",
    "is kept from the club's own records",
    "recorded with the same role",
    "past presidents on record",
)


# ---------------------------------------------------------------- helpers

def norm_key(name: str) -> str:
    """Identity key for a person: letters only, lowercased, aliases folded in."""
    clean = re.sub(r"^\s*(phf\s+)?rtr\.?\s+", "", (name or ""), flags=re.I)
    key = re.sub(r"[^a-z]", "", clean.lower())
    return ALIAS_KEYS.get(key, key)


def norm_role(role: str) -> str:
    """Identity key for a role: letters and digits only, lowercased."""
    return re.sub(r"[^a-z0-9]", "", (role or "").lower())


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", (name or "").lower())
    return re.sub(r"-+", "-", re.sub(r"\s+", "-", slug)).strip("-")


def read_frontmatter(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not match:
        return {}, ""
    data = yaml.safe_load(match.group(1)) or {}
    return data, match.group(2)


def write_frontmatter(path: Path, data: dict, body: str = "") -> None:
    front = yaml.safe_dump(
        data,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=90,
    ).rstrip("\n")
    text = f"---\n{front}\n---\n"
    if body.strip():
        text += "\n" + body.strip() + "\n"
    path.write_text(text, encoding="utf-8")


ALIAS_KEYS = {re.sub(r"[^a-z]", "", k.lower()): re.sub(r"[^a-z]", "", v.lower()) for k, v in NAME_ALIASES.items()}


# ---------------------------------------------------------------- loading

def load_portal(portal_dir: Path):
    csv_dir = portal_dir / "data" / "csv"
    board_rows = list(csv.DictReader((csv_dir / "board-terms.csv").open(encoding="utf-8")))
    designation_rows = list(
        csv.DictReader((csv_dir / "member-designations.csv").open(encoding="utf-8"))
    )

    # Profile pictures, straight from the roster — a board slot filled from the
    # Blogspot has none of its own, but the member still has a picture.
    pictures: dict[str, str] = {}
    try:
        roster = json.loads(
            (portal_dir / "data" / "raw" / "board" / "roster.json").read_text(encoding="utf-8")
        )
    except OSError:
        roster = []
    for member in roster:
        image = (member.get("profile_image") or "").strip()
        if image and "default.jpg" not in image:
            pictures.setdefault(norm_key(member.get("name") or ""), image)

    # (year, person) -> what the portal records
    designations: dict[tuple[str, str], dict] = {}
    for row in designation_rows:
        key = (row["year"], norm_key(row["name"]))
        designations[key] = {
            "designation": row["club_designation"],
            "committee": row["committee"],
            "member_id": row["member_id"],
            "portal_id": row["portal_id"],
            "profile_image": row.get("profile_image", ""),
        }

    # (year, person) -> the board slot the merged record gives that person
    slots: dict[tuple[str, str], dict] = {}
    for row in board_rows:
        person = norm_key(row["name"])
        key = (row["year"], person)
        slots[key] = {
            "year": row["year"],
            "name": row["name"],
            "role": row["role"],
            "source": row["source"],
            "member_id": row["member_id"],
            "portal_id": row["portal_id"],
            "profile_image": row["profile_image"] or pictures.get(person, ""),
            "committee": row["committee"],
        }
    return slots, designations


def load_site(portal_dir: Path):
    """Read the site's team terms as they were before this import.

    The merge rewrites these files, so the next run would find nothing to
    disagree about. A copy of the pre-merge files is therefore kept in the
    portal's data directory (gitignored) and used as the baseline every time.
    """
    baseline = portal_dir / "data" / "raw" / "board" / "site-baseline"
    if not baseline.exists() or not any(baseline.glob("*.md")):
        baseline.mkdir(parents=True, exist_ok=True)
        for path in TERMS_DIR.glob("*.md"):
            shutil.copy2(path, baseline / path.name)
        print(f"  snapshot of the site's team terms -> {baseline}")

    terms = {}
    for path in sorted(baseline.glob("*.md")):
        data, body = read_frontmatter(path)
        year = str(data.get("year") or path.stem)
        terms[year] = {
            "path": TERMS_DIR / f"{year}.md",
            "data": data,
            "body": body,
            "president": (data.get("president") or "").strip(),
            "president_photo": (data.get("presidentPhoto") or "").strip(),
            "notes": (data.get("notes") or "").strip(),
            "source": (data.get("source") or "").strip(),
            "board": [
                b for b in (data.get("board") or []) if isinstance(b, dict) and b.get("name")
            ],
        }
    return terms


def existing_photos():
    """Photos already in public/uploads/team, by (year, person) and by person."""
    by_year: dict[tuple[str, str], str] = {}
    by_person: dict[str, str] = {}
    if not TEAM_PHOTOS.exists():
        return by_year, by_person
    for path in sorted(TEAM_PHOTOS.iterdir()):
        if not path.is_file():
            continue
        match = re.match(r"^(\d{4}-\d{2})-(.+)$", path.stem)
        if not match:
            continue
        year, rest = match.groups()
        public = f"/uploads/team/{path.name}"
        by_year.setdefault((year, norm_key(rest)), public)
        by_person.setdefault(norm_key(rest), public)
    return by_year, by_person


# ---------------------------------------------------------------- merging

def build_display_names(site_terms, portal_slots):
    """Spell names the way the portal does, keeping the site's capitalisation
    where it differs only in case."""
    site_spellings = defaultdict(Counter)
    for term in site_terms.values():
        for name in [term["president"]] + [b["name"] for b in term["board"]]:
            name = (name or "").strip()
            if not name:
                continue
            site_spellings[norm_key(name)][name] += 1

    display = {}
    for (_, key), slot in portal_slots.items():
        portal_name = slot["name"]
        candidates = [
            s for s in site_spellings.get(key, {}) if s.lower() == portal_name.lower()
        ]
        if candidates:
            display.setdefault(key, Counter(candidates).most_common(1)[0][0])
        else:
            display.setdefault(key, portal_name)
    for key, spelling in site_spellings.items():
        display.setdefault(key, spelling.most_common(1)[0][0])
    return display


def resolve_photo(year, slot, photos, fallback=""):
    """Photo path for a board member.

    The club's own picture for that person and year wins; then a file already
    named for that year; then the portal profile image; and only then a
    picture the site has from another year.
    """
    key = slot["key"]
    expected = f"/uploads/team/{year}-{slugify(slot['name'])}.jpg"
    site_photo = (slot.get("site") or {}).get("photo")
    if site_photo:
        return site_photo
    if (TEAM_PHOTOS / Path(expected).name).exists():
        return expected
    if fallback:
        return fallback
    if slot.get("profile_image"):
        return expected
    by_year, by_person = photos
    if (year, key) in by_year:
        return by_year[(year, key)]
    if key in by_person:
        return by_person[key]
    return ""


def filter_site_notes(notes: str) -> list[str]:
    """Keep the site's own notes, minus the ones the portal record makes stale."""
    kept = []
    for sentence in re.split(r"(?<=\.)\s+", notes or ""):
        sentence = sentence.strip()
        if not sentence:
            continue
        lowered = sentence.lower()
        if any(phrase in lowered for phrase in STALE_PHRASES):
            continue
        kept.append(sentence)
    return kept


def merge_year(year, portal_slots, designations, site_term, display, photos):
    """Return the merged board for one rota year."""
    conflicts = []
    notes = []

    portal_for_year = {
        key: slot for (yr, key), slot in portal_slots.items() if yr == year
    }
    site_board = {norm_key(b["name"]): b for b in site_term["board"]}
    site_president = site_term["president"]

    merged: dict[str, dict] = {}
    for key, slot in portal_for_year.items():
        merged[key] = {
            "key": key,
            "name": display.get(key, slot["name"]),
            "role": slot["role"],
            "source": slot["source"],
            "profile_image": slot["profile_image"],
            "site": site_board.get(key),
        }

    # The site's own claims fill what the portal leaves open.
    kept_notes = []
    for key, entry in site_board.items():
        if key in merged:
            continue
        state = designations.get((year, key))
        designation = state["designation"] if state else "N/A"
        if designation == "Club Member":
            conflicts.append(
                {
                    "year": year,
                    "name": entry["name"],
                    "site_role": entry["role"],
                    "portal_says": "Club Member",
                    "resolution": "removed — the portal records them as a club member that year",
                }
            )
            continue
        merged[key] = {
            "key": key,
            "name": display.get(key, entry["name"]),
            "role": entry["role"],
            "source": "site",
            "profile_image": "",
            "site": entry,
            "portal_silent": True,
        }
        kept_notes.append(
            f"{display.get(key, entry['name'])} ({entry['role']}) is kept from the club's own "
            "records; the portal does not record this slot."
        )

    # Where the portal has an office and the site disagrees, the portal wins.
    for key, slot in merged.items():
        entry = slot.get("site")
        if not entry or slot["source"] == "site":
            continue
        if norm_role(entry["role"]) == norm_role(slot["role"]):
            continue
        conflicts.append(
            {
                "year": year,
                "name": entry["name"],
                "site_role": entry["role"],
                "portal_says": slot["role"],
                "resolution": f"role replaced with the portal's “{slot['role']}”",
            }
        )

    # The president.
    president = ""
    president_source = ""
    president_key = ""
    for key, slot in portal_for_year.items():
        if norm_role(slot["role"]) == "president":
            president = display.get(key, slot["name"])
            president_source = slot["source"]
            president_key = key
            break
    if site_president:
        if not president:
            president = display.get(norm_key(site_president), site_president)
            president_source = "site"
            president_key = norm_key(site_president)
            notes.append(
                "The president is kept from the club's own records; the portal does not "
                "record one for this year."
            )
        elif norm_key(site_president) != president_key:
            conflicts.append(
                {
                    "year": year,
                    "name": site_president,
                    "site_role": "President",
                    "portal_says": f"President — {president}",
                    "resolution": "replaced with the portal's president",
                }
            )
    if not president:
        notes.append("The president for this year is still to be confirmed.")

    # The president is shown once, above the board.
    if president_key:
        merged.pop(president_key, None)

    officers = [s for s in merged.values() if norm_role(s["role"]) not in STATUS_ROLES]
    officers.sort(
        key=lambda s: (ROLE_RANK.get(norm_role(s["role"]), len(ROLE_ORDER)), s["name"])
    )

    # The same role held by two people is worth flagging.
    role_counts = Counter(norm_role(s["role"]) for s in officers)
    for role, count in role_counts.items():
        if count < 2:
            continue
        people = ", ".join(s["name"] for s in officers if norm_role(s["role"]) == role)
        canonical = next(s["role"] for s in officers if norm_role(s["role"]) == role)
        notes.append(f"Two members are recorded with the same role ({canonical}): {people}.")

    # Past presidents the portal records are honorary, not board seats.
    past = sorted(s["name"] for s in merged.values() if norm_role(s["role"]) in STATUS_ROLES)
    if past:
        notes.append("Past presidents on record: " + ", ".join(past) + ".")

    board = []
    for slot in officers:
        board.append(
            {
                "name": slot["name"],
                "role": slot["role"],
                "photo": resolve_photo(year, slot, photos),
                "note": "",
                "_key": slot["key"],
                "_profile_image": slot["profile_image"],
            }
        )

    president_photo = ""
    if president:
        president_slot = {
            "key": president_key,
            "name": president,
            "profile_image": portal_for_year.get(president_key, {}).get("profile_image", ""),
            "site": next(
                (b for b in site_term["board"] if norm_key(b["name"]) == president_key),
                None,
            ),
        }
        president_photo = resolve_photo(
            year, president_slot, photos, fallback=site_term["president_photo"]
        )

    sources = {s["source"] for s in merged.values()}
    if president_source:
        sources.add(president_source)

    # The site's own notes survive only where the site is still the source.
    if "site" in sources:
        for sentence in filter_site_notes(site_term["notes"]):
            notes.append(sentence)

    notes.extend(sorted(kept_notes))

    return {
        "president": president,
        "president_photo": president_photo,
        "board": board,
        "notes": notes,
        "conflicts": conflicts,
        "sources": sorted(sources),
    }


# ---------------------------------------------------------------- photos

def download_photos(needed):
    """Fetch the portal profile images for board members who have no photo.

    The portal stores a mix of JPEG and PNG at up to 2 MB; the site's own board
    photos are 400×400 JPEGs, so the downloaded ones are cropped square (face
    biased upward) and re-encoded to match.
    """
    import io

    import requests
    from PIL import Image

    fetched = 0
    skipped = 0
    TEAM_PHOTOS.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124 Safari/537.36"
    )
    for year, name, url in needed:
        target = TEAM_PHOTOS / f"{year}-{slugify(name)}.jpg"
        if target.exists():
            skipped += 1
            continue
        if not url:
            continue
        try:
            response = session.get(url, timeout=30)
            response.raise_for_status()
            body = response.content
            if len(body) < 1024:
                raise ValueError("suspiciously small image")
            image = Image.open(io.BytesIO(body))
            image.load()
            image = square_crop(image)
            image = image.convert("RGB").resize((400, 400), Image.LANCZOS)
            image.save(target, "JPEG", quality=85, optimize=True)
            fetched += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  photo failed: {year} {name}: {exc}")
    return fetched, skipped


def square_crop(image):
    """Crop to a square, keeping the face near the top of the frame."""
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = int((height - side) * 0.25)
    return image.crop((left, top, left + side, top + side))


# ---------------------------------------------------------------- main

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--portal", type=Path, default=DEFAULT_PORTAL)
    parser.add_argument("--no-photos", action="store_true", help="do not download profile images")
    parser.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    args = parser.parse_args()

    portal_slots, designations = load_portal(args.portal)
    site_terms = load_site(args.portal)
    display = build_display_names(site_terms, portal_slots)
    photos = existing_photos()

    summary = []
    all_conflicts = []
    needed_photos = []
    written = []

    for year in ROTA_YEARS:
        site_term = site_terms.get(
            year,
            {
                "path": TERMS_DIR / f"{year}.md",
                "data": {},
                "body": "",
                "president": "",
                "president_photo": "",
                "notes": "",
                "source": "",
                "board": [],
            },
        )
        result = merge_year(year, portal_slots, designations, site_term, display, photos)
        all_conflicts.extend(result["conflicts"])

        for entry in result["board"]:
            photo = entry["photo"]
            if not photo:
                continue
            if (ROOT / "public" / photo.lstrip("/")).exists():
                continue
            if entry["_profile_image"]:
                needed_photos.append((year, entry["name"], entry["_profile_image"]))

        president_photo = result.get("president_photo", "")
        if (
            president_photo
            and not (ROOT / "public" / president_photo.lstrip("/")).exists()
        ):
            slot = portal_slots.get((year, norm_key(result["president"])))
            if slot and slot["profile_image"]:
                needed_photos.append(
                    (year, result["president"], slot["profile_image"])
                )

        data = {"year": year}
        if result["president"]:
            data["president"] = result["president"]
        if result["president_photo"]:
            data["presidentPhoto"] = result["president_photo"]
        if result["notes"]:
            data["notes"] = " ".join(result["notes"])
        data["board"] = [
            {k: v for k, v in entry.items() if v and not k.startswith("_")}
            for entry in result["board"]
        ]
        sources = []
        if "portal" in result["sources"]:
            sources.append("Rotaract District 3292 portal, member designation timeline")
        if "blogspot" in result["sources"]:
            sources.append("Club Officers' Profiles, RAC Patan South Blogspot archive")
        if "site" in result["sources"]:
            sources.append("RAC Patan South Instagram and Blogspot archive")
        data["source"] = "; ".join(sources)

        summary.append((year, result))
        if not args.dry_run:
            write_frontmatter(site_term["path"], data)
            written.append(year)

    print(f"{'year':9} {'president':28} {'board':>5}  sources")
    for year, result in summary:
        president = result["president"] or "—"
        print(f"{year:9} {president:28} {len(result['board']):>5}  {','.join(result['sources'])}")

    if all_conflicts:
        print(f"\n{len(all_conflicts)} conflicts resolved:")
        for c in all_conflicts:
            print(
                f"  {c['year']}  {c['name']}: site says {c['site_role']!r}, "
                f"portal says {c['portal_says']!r} → {c['resolution']}"
            )

    if needed_photos and not args.no_photos and not args.dry_run:
        print(f"\ndownloading {len(needed_photos)} profile photos…")
        fetched, skipped = download_photos(needed_photos)
        print(f"  fetched {fetched}, already present {skipped}")

    if args.dry_run:
        print("\ndry run — nothing written")
        return

    print(f"\nwrote {len(written)} team term files")

    report = build_conflict_report(all_conflicts, summary, designations)
    CONFLICT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    CONFLICT_REPORT.write_text(report, encoding="utf-8")
    print(f"wrote {CONFLICT_REPORT}")


def build_conflict_report(conflicts, summary, designations):
    lines = [
        "# Board import — conflicts and decisions",
        "",
        f"Generated {datetime.date.today().isoformat()} by `scripts/import_portal_board.py` "
        "in the website repository.",
        "",
        "The portal's member designation timelines are the authority. A portal entry of",
        "“Club Member” is an explicit claim that the member held no office that year, so it",
        "displaces a role recorded elsewhere. Only “N/A” — or no row at all — is silence, and only",
        "silence lets another source fill a slot.",
        "",
        "## Conflicts",
        "",
    ]
    if conflicts:
        lines += [
            "| Year | Person | Site record | Portal record | Resolution |",
            "|---|---|---|---|---|",
        ]
        for c in conflicts:
            lines.append(
                f"| {c['year']} | {c['name']} | {c['site_role']} | {c['portal_says']} "
                f"| {c['resolution']} |"
            )
    else:
        lines.append("None — every site record was either confirmed or already empty.")
    lines += [
        "",
        "## Boards as published",
        "",
        "| Year | President | Board members | Sources |",
        "|---|---|---|---|",
    ]
    for year, result in summary:
        president = result["president"] or "—"
        lines.append(
            f"| {year} | {president} | {len(result['board'])} | {', '.join(result['sources'])} |"
        )
    lines += ["", "## Open questions", ""]
    questions = []
    for year, result in summary:
        for note in result["notes"]:
            if "kept from the club's own records" in note or "still to be confirmed" in note:
                questions.append(f"- **{year}** — {note}")
            elif "same role" in note:
                questions.append(f"- **{year}** — {note}")
    lines += questions or ["None."]
    lines += [
        "",
        "## Rota years the portal has no president for",
        "",
        "For these years the portal records no president at all, so the club's own records stand.",
        "",
    ]
    for year in ROTA_YEARS:
        state = [
            v
            for (y, _k), v in designations.items()
            if y == year and v["designation"] == "President"
        ]
        if not state:
            lines.append(f"- {year}")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    main()
