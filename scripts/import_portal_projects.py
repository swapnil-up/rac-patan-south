#!/usr/bin/env python3
"""Publish the club's project archive from the district portal.

The portal records every project the club reported, with a detail page carrying
the venue, the hours, the cost and a written account of what happened. For the
years the public site never covered, that account is the only narrative
surviving anywhere.

This script turns those reports into event files under content/events/.

Scope. The rota years the site had no coverage for are published in full. For
the years it covered only partly, a report is published only when it is not
already there: a report counts as already published when it carries the same
title, or when its date falls within a month of an existing event and the two
titles share a significant word.

Usage:
    python3 scripts/import_portal_projects.py [--portal ~/github/racps/portal]
                                               [--years 2015-16,2016-17]
                                               [--dry-run]
"""

from __future__ import annotations

import argparse
import csv
import datetime
import html
import re
import sys
from collections import defaultdict
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
EVENTS_DIR = ROOT / "content" / "events"

DEFAULT_PORTAL = Path.home() / "github" / "racps" / "portal"
REPORT = DEFAULT_PORTAL / "analysis" / "project-publication.md"

# Rota years the site had no coverage for — published in full.
GAP_YEARS = ["2015-16", "2016-17", "2017-18", "2018-19", "2019-20"]

# Rota years the site covered partly — published only where they add something.
TOPUP_YEARS = ["2013-14", "2014-15", "2020-21"]

# Reports the site already carries under a different name. Checked by hand:
# the portal and the club's Instagram posts call the same project different
# things, so no amount of title matching finds them.
KNOWN_SAME_EVENT = {
    "23718": "2020-06-24-quarantine-art-festival.md",
    "23593": "2020-09-07-know-the-law-session-with-zone-clubs.md",
    "23626": "2020-07-31-know-the-law-12-day-online-training.md",
    "23720": "2021-03-08-women-s-day-special-mixed-futsal-match-between-members-of-rac-patan-south.md",
    "23253": "2020-08-08-online-fellowship-bingo-and-scavenger-hunt.md",
    "23711": "2020-09-09-panel-discussion-on-the-machhindranath-jatra.md",
    "23589": "2020-09-12-suicide-prevention-awareness-week-2020.md",
    "23638": "2020-10-08-know-the-inner-calmness-and-peace-webinar.md",
    "23712": "2020-11-14-diabetes-awareness-project-and-twin-club-mou.md",
    "23722": "2021-01-07-cycle-safety-awareness-campaign.md",
    "23719": "2021-03-11-hike-to-tarebhir.md",
    "23257": "2020-10-09-entrepreneurship-series-with-denim-krishna-shrestha.md",
    "23633": "2021-05-08-goodwill-visit-to-zone-clubs.md",
    "25288": "2021-05-29-drr-visit.md",
}

# The avenue the report was filed under, mapped to the site's categories.
AVENUE_CATEGORY = {
    "Club Administration": "club_service",
    "Service Project": "community_service",
    "Professional Development": "professional_development",
    "International Service": "international_service",
    "SAP": "community_service",
    "Public Image": "other",
    "Membership Development": "other",
    "Finance": "other",
    "The Rotary Foundation": "other",
}

# Words too common to identify an event.
STOPWORDS = {
    "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or", "the",
    "to", "with", "session", "program", "programme", "celebration", "day",
    "club", "rac", "rotaract",
}

MOJIBAKE_MARKERS = ("Ã", "â€", "Â", "ð\x9f")

# Devanagari, romanised Hunterian-style for use in slugs.
DEVANAGARI_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "ळ": "l", "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z",
    "ड़": "d", "ढ़": "dh", "फ़": "f", "य़": "y",
}
DEVANAGARI_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ii", "उ": "u", "ऊ": "uu",
    "ऋ": "ri", "ॠ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
}
DEVANAGARI_MATRAS = {
    "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri",
    "ॄ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
    "ॉ": "o", "ॊ": "o", "ऺ": "e", "ऻ": "ai",
}
DEVANAGARI_VIRAMA = "्"


# ---------------------------------------------------------------- helpers

def norm_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (title or "").lower())


def title_tokens(title: str) -> set[str]:
    words = re.findall(r"[^\W\d_]+", (title or "").lower(), flags=re.UNICODE)
    return {w for w in words if len(w) >= 4 and w not in STOPWORDS}


def body_tokens(text: str) -> set[str]:
    words = re.findall(r"[^\W\d_]+", (text or "").lower(), flags=re.UNICODE)
    return {w for w in words if len(w) >= 5 and w not in STOPWORDS}


def romanise_devanagari(text: str) -> str:
    """Render Devanagari in Latin letters (Hunterian style).

    Every slug on the site is ASCII, and a URL path with Devanagari in it
    does not survive the browser's percent-encoding. A Nepali title still
    deserves to be readable in the address bar, so it is romanised rather
    than stripped: "Entrepreneurship तीन दृष्टिकोण" becomes
    "entrepreneurship tin drishtikon".

    The scheme is Hunterian: a dependent vowel replaces the consonant's
    inherent "a", and a word-final "a" is dropped.
    """
    out: list[str] = []
    pending_a = False
    for ch in text:
        if ch in DEVANAGARI_CONSONANTS:
            if pending_a:
                out.append("a")
            out.append(DEVANAGARI_CONSONANTS[ch])
            pending_a = True
        elif ch in DEVANAGARI_MATRAS:
            # The matra replaces the inherent vowel rather than following it.
            pending_a = False
            out.append(DEVANAGARI_MATRAS[ch])
        elif ch == DEVANAGARI_VIRAMA:
            # The virama kills the inherent vowel of the consonant before it.
            pending_a = False
        elif ch in DEVANAGARI_VOWELS:
            if pending_a:
                out.append("a")
            out.append(DEVANAGARI_VOWELS[ch])
            pending_a = False
        else:
            # A word ends here, and a word-final inherent vowel is dropped.
            pending_a = False
            out.append(ch)
    return "".join(out)


def slugify(title: str) -> str:
    slug = romanise_devanagari((title or "").lower())
    slug = re.sub(r"[^\w\s-]", "", slug, flags=re.UNICODE)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


def fix_mojibake(text: str) -> str:
    """Undo the double-encoding the portal's own pages carry."""
    if not text or not any(marker in text for marker in MOJIBAKE_MARKERS):
        return text
    # The portal's pages were served with the utf-8 bytes read as cp1252, so
    # "’" comes back as "â€™" and "é" as "Ã©". cp1252 is the right inverse —
    # latin-1 cannot round-trip the euro sign or the trademark mark.
    for encoding in ("cp1252", "latin-1"):
        try:
            repaired = text.encode(encoding).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
        if repaired != text:
            return repaired
    # A string can hold both a good character and a broken one; repair the
    # broken pieces alone.
    out = []
    for token in re.split(r"(\s+)", text):
        if any(marker in token for marker in MOJIBAKE_MARKERS):
            for encoding in ("cp1252", "latin-1"):
                try:
                    token = token.encode(encoding).decode("utf-8")
                    break
                except (UnicodeEncodeError, UnicodeDecodeError):
                    continue
        out.append(token)
    return "".join(out)


def clean_text(text: str) -> str:
    text = html.unescape(text or "")
    text = fix_mojibake(text)
    text = text.replace(" ", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def read_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        return {}
    return yaml.safe_load(match.group(1)) or {}


def parse_date(value: str) -> datetime.date | None:
    try:
        return datetime.date.fromisoformat((value or "")[:10])
    except ValueError:
        return None


def category_for(title: str, avenue: str) -> str:
    """The site's category for a report: the title decides, else the avenue."""
    lowered = (title or "").lower()
    if "installation" in lowered:
        return "installation"
    if "meeting" in lowered or "assembly" in lowered:
        return "meeting"
    if "fellowship" in lowered or "friendly futsal" in lowered:
        return "fellowship"
    return AVENUE_CATEGORY.get((avenue or "").strip(), "other")


# ---------------------------------------------------------------- loading

def load_baseline(portal_dir: Path):
    """The event files the site had before this import.

    The import adds pages, so a second run would find every report already
    published and the record of what was published would be lost. A list of the
    original file names is therefore kept in the portal's data directory
    (gitignored) and used as the baseline every time.
    """
    baseline = portal_dir / "data" / "raw" / "board" / "site-event-baseline.txt"
    if not baseline.exists():
        baseline.parent.mkdir(parents=True, exist_ok=True)
        names = sorted(p.name for p in EVENTS_DIR.glob("*.md"))
        baseline.write_text("\n".join(names) + "\n", encoding="utf-8")
        print(f"  snapshot of the site's event files -> {baseline}")
    return {
        line.strip()
        for line in baseline.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def load_site_events():
    events = []
    for path in sorted(EVENTS_DIR.glob("*.md")):
        data = read_frontmatter(path)
        text = path.read_text(encoding="utf-8")
        body = text.split("---", 2)[-1] if text.count("---") >= 2 else ""
        description = data.get("description") or ""
        title = data.get("title") or path.stem
        events.append(
            {
                "path": path,
                "title": title,
                "date": parse_date(data.get("date") or ""),
                "rota_year": data.get("rotaYear") or "",
                "norm": norm_title(title),
                "tokens": title_tokens(title),
                "text_tokens": title_tokens(title) | body_tokens(description) | body_tokens(body),
            }
        )
    return events


def score_match(report, event):
    """How likely it is that the site already carries this project.

    The title is the signal. The written account is deliberately not used:
    the portal's accounts share so much ordinary vocabulary with the club's
    Instagram captions that the overlap says more about the weather than
    about the event.
    """
    report_title = report["tokens"]
    event_title = event["tokens"]
    union = report_title | event_title
    title_score = len(report_title & event_title) / len(union) if union else 0.0
    return title_score


def is_published(report, site_events):
    """True when the site already carries this project.

    The same name is decisive; otherwise the two titles have to overlap
    substantially and fall near each other in the calendar.
    """
    report_date = parse_date(report["date_iso"])
    report_year = report["year"]
    report_norm = norm_title(report["title"])

    for event in site_events:
        same_title = event["norm"] == report_norm
        same_year = bool(event["rota_year"]) and event["rota_year"] == report_year
        delta = None
        if report_date and event["date"]:
            delta = abs((report_date - event["date"]).days)

        if same_title:
            # The same name is decisive; the date only has to be plausible.
            if delta is None or delta <= 120 or same_year:
                return event
            continue

        if score_match(report, event) >= 0.5 and (
            delta is None or delta <= 60 or same_year
        ):
            return event
    return None


# ---------------------------------------------------------------- writing

def build_body(report):
    """The event body: what the club set out to do, and what happened."""
    objectives = clean_text(report.get("objectives", ""))
    details = clean_text(report.get("details", ""))
    parts = []
    if objectives:
        parts.append(objectives)
    if details:
        parts.append(details)

    facts = []
    duration = clean_text(report.get("duration", ""))
    if duration and duration.lower() not in ("n/a", ""):
        facts.append(f"Duration: {duration}")
    hours = clean_text(report.get("volunteering_hours", ""))
    if hours:
        facts.append(f"Volunteering hours: {hours}")
    expense = clean_text(report.get("expense_npr", ""))
    if expense:
        facts.append(f"Project cost: NPR {expense}")
    people = []
    for label, key in (
        ("Rotaractors", "rotaractors"),
        ("Rotarians", "rotarians"),
        ("Visitors", "other_visitors"),
    ):
        value = clean_text(report.get(key, ""))
        if value and value != "0":
            people.append(f"{label}: {value}")
    if people:
        facts.append("; ".join(people))
    if facts:
        parts.append("\n".join(f"- {fact}" for fact in facts))
    return "\n\n".join(parts)


def make_description(body: str) -> str:
    flat = re.sub(r"\s+", " ", body).strip()
    if len(flat) <= 260:
        return flat
    cut = flat[:260].rsplit(" ", 1)[0]
    return cut + "…"


def write_event(report, taken_slugs):
    date_iso = report["date_iso"]
    title = clean_text(report["title"])
    slug = f"{date_iso}-{slugify(title)}"
    candidate = slug
    counter = 2
    while (EVENTS_DIR / f"{candidate}.md").exists() or candidate in taken_slugs:
        candidate = f"{slug}-{counter}"
        counter += 1
    taken_slugs.add(candidate)

    body = build_body(report)
    venue = clean_text(report.get("venue", ""))
    end_date = clean_text(report.get("end_date", ""))

    data = {
        "title": title,
        "slug": candidate,
        "date": f"{date_iso}T00:00:00.000Z",
    }
    if end_date and parse_date(end_date) and parse_date(end_date) != parse_date(date_iso):
        data["endDate"] = f"{end_date[:10]}T00:00:00.000Z"
    if venue:
        data["location"] = venue
    description = make_description(body)
    if description:
        data["description"] = description
    data["type"] = "past"
    data["category"] = category_for(title, report.get("avenue", ""))
    data["rotaYear"] = report["year"]
    data["sourceType"] = "portal_report"
    data["sourceUrl"] = report["report_url"]
    data["registrationLink"] = ""

    front = yaml.safe_dump(
        data, sort_keys=False, allow_unicode=True, default_flow_style=False, width=100
    ).rstrip("\n")
    text = f"---\n{front}\n---\n\n{body}\n"
    path = EVENTS_DIR / f"{candidate}.md"
    path.write_text(text, encoding="utf-8")
    return path


# ---------------------------------------------------------------- main

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--portal", type=Path, default=DEFAULT_PORTAL)
    parser.add_argument(
        "--years",
        default=",".join(GAP_YEARS + TOPUP_YEARS),
        help="comma separated rota years to publish",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    years = [y.strip() for y in args.years.split(",") if y.strip()]
    csv_path = args.portal / "data" / "csv" / "club-projects-by-year.csv"
    reports = list(csv.DictReader(csv_path.open(encoding="utf-8")))

    site_events = load_site_events()
    baseline = load_baseline(args.portal)
    taken_slugs = set()
    published = []
    skipped = []
    per_year = defaultdict(lambda: [0, 0])

    for report in reports:
        if report["year"] not in years:
            continue
        report["tokens"] = title_tokens(report["title"])
        report["text_tokens"] = body_tokens(
            f"{report.get('objectives', '')} {report.get('details', '')}"
        )
        known = KNOWN_SAME_EVENT.get(report["id"])
        existing = None
        if known:
            existing = next((e for e in site_events if e["path"].name == known), None)
        else:
            existing = is_published(report, site_events)

        if existing and existing["path"].name in baseline:
            # The site already carried this project before the import.
            skipped.append((report, existing))
            per_year[report["year"]][1] += 1
            continue
        if existing:
            # Published by an earlier run of this script.
            published.append(report)
            per_year[report["year"]][0] += 1
            continue
        per_year[report["year"]][0] += 1
        if args.dry_run:
            published.append(report)
            continue
        path = write_event(report, taken_slugs)
        published.append(report)
        print(f"  wrote {path.name}")

    print(f"\n{'year':9} {'new':>5} {'already there':>14}")
    for year in years:
        new, old = per_year[year]
        print(f"{year:9} {new:>5} {old:>14}")
    print(f"{'total':9} {sum(v[0] for v in per_year.values()):>5} "
          f"{sum(v[1] for v in per_year.values()):>14}")

    if args.dry_run:
        print("\ndry run — nothing written")
        return

    print(f"\npublished {len(published)} new project pages")
    write_report(years, per_year, published, skipped, args.portal)


def write_report(years, per_year, published, skipped, portal_dir):
    """A record of what was published and what was already there."""
    lines = [
        "# Project archive — what was published",
        "",
        f"Generated {datetime.date.today().isoformat()} by "
        "`scripts/import_portal_projects.py` in the website repository.",
        "",
        "The portal records every project the club reported. The rota years the site had",
        "no coverage for are published in full; for the years it covered partly, a report",
        "is published only when it is not already there.",
        "",
        "## Coverage",
        "",
        "| Year | Reports | Published | Already on the site |",
        "|---|---|---|---|",
    ]
    for year in years:
        new, old = per_year[year]
        lines.append(f"| {year} | {new + old} | {new} | {old} |")
    lines.append(
        f"| **total** | **{sum(v[0] + v[1] for v in per_year.values())}** "
        f"| **{sum(v[0] for v in per_year.values())}** "
        f"| **{sum(v[1] for v in per_year.values())}** |"
    )

    lines += [
        "",
        "## Reports already on the site under another name",
        "",
        "The portal and the club's Instagram posts call the same project different things,",
        "so no amount of title matching finds them. Each of these was checked by hand.",
        "",
        "| Year | Portal report | Site page |",
        "|---|---|---|",
    ]
    for report_id, filename in KNOWN_SAME_EVENT.items():
        match = next((r for r in skipped if r[0]["id"] == report_id), None)
        if match is None:
            continue
        report = match[0]
        lines.append(f"| {report['year']} | {report['title']} | `{filename}` |")

    lines += [
        "",
        "## Reports matched automatically",
        "",
        "| Year | Portal report | Site page |",
        "|---|---|---|",
    ]
    for report, event in skipped:
        if report["id"] in KNOWN_SAME_EVENT:
            continue
        lines.append(f"| {report['year']} | {report['title']} | `{event['path'].name}` |")

    lines.append("")
    report_path = portal_dir / "analysis" / "project-publication.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {report_path}")


if __name__ == "__main__":
    main()
