#!/usr/bin/env python3
"""Sort scraped Instagram and Blogspot content into a reviewable staging set.

Reads:
    _sources/instagram_export/manifest.json
    _sources/blogspot/manifest.json
    _sources/blogspot/markdown/{posts,pages}/*.md

Writes:
    _sources/sorted/inventory.json
    _sources/sorted/clusters.json
    _sources/sorted/review.md
    _sources/sorted/review.csv
    _sources/sorted/archive_pages.md
    _sources/sorted/README.md

The output is intentionally review-first. Dates and categories are best-effort
and should be corrected in the review files before content is written to
content/.
"""

from __future__ import annotations

import csv
import html
import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

IG_MANIFEST = Path("_sources/instagram_export/manifest.json")
BLOG_MANIFEST = Path("_sources/blogspot/manifest.json")
BLOG_MD = Path("_sources/blogspot/markdown")
OUT = Path("_sources/sorted")

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

NEPALI_MONTHS = [
    "baisakh",
    "baishakh",
    "jestha",
    "jetha",
    "ashadh",
    "asadh",
    "shrawan",
    "sawan",
    "bhadra",
    "ashwin",
    "aswin",
    "kartik",
    "mangsir",
    "poush",
    "push",
    "magh",
    "falgun",
    "phagun",
    "chaitra",
    "chait",
]

CATEGORY_RULES = {
    "installation": [
        ("installation", 6),
        ("charter presentation", 4),
        ("handover", 4),
        ("board of directors", 3),
        ("president elect", 2),
    ],
    "meeting": [
        ("joint meeting", 5),
        ("general meeting", 4),
        ("club assembly", 4),
        ("district conference", 4),
        ("district assembly", 4),
        ("drr visit", 4),
        ("zonal meeting", 4),
        ("pets", 3),
        ("sets", 3),
        ("conference", 2),
        ("meeting", 2),
    ],
    "community_service": [
        ("blood donation", 6),
        ("clean up", 5),
        ("cleanup", 5),
        ("orphan", 4),
        ("community service", 5),
        ("menstrual hygiene", 5),
        ("health camp", 4),
        ("eye camp", 4),
        ("dental", 3),
        ("relief", 3),
        ("cancer", 3),
        ("school bag", 4),
        ("book donation", 4),
        ("tree plantation", 4),
        ("environment", 2),
        ("awareness", 2),
        ("donation", 2),
        ("education", 2),
        ("hygiene", 3),
        ("cleaning campaign", 5),
        ("cleaning", 3),
        ("breastfeeding", 4),
    ],
    "professional_development": [
        ("public speaking", 5),
        ("cv writing", 5),
        ("boot camp", 4),
        ("bootcamp", 4),
        ("workshop", 4),
        ("webinar", 4),
        ("seminar", 3),
        ("training", 3),
        ("career", 3),
        ("entrepreneur", 3),
        ("model united", 4),
        ("mun", 3),
        ("vidushe", 4),
        ("professional service", 4),
        ("session", 1),
    ],
    "international_service": [
        ("international service", 5),
        ("twin club", 5),
        ("letterhead exchange", 5),
        ("goodwill visit", 4),
        ("global", 2),
        ("international", 2),
        ("exchange", 1),
    ],
    "club_service": [
        ("club service", 5),
        ("membership drive", 4),
        ("fellowship", 2),
        ("club meeting", 2),
    ],
    "fellowship": [
        ("secret santa", 5),
        ("poetry saanjh", 5),
        ("poetry साँझ", 5),
        ("fantasy league", 4),
        ("fellowship", 4),
        ("hike", 4),
        ("futsal", 4),
        ("badminton", 4),
        ("picnic", 3),
        ("party", 3),
        ("trip", 3),
        ("dance", 2),
        ("musical", 2),
        ("halloween", 3),
        ("sports", 3),
        ("holi", 4),
        ("jatra", 4),
    ],
    "fundraiser": [
        ("fundraiser", 5),
        ("fund raising", 5),
        ("deusi", 4),
        ("bhailo", 4),
        ("charity show", 4),
    ],
    "greeting": [
        ("constitution day", 5),
        ("charter day", 4),
        ("dashain", 4),
        ("tihar", 4),
        ("nawami", 4),
        ("bisket", 4),
        ("jatra", 3),
        ("new year", 3),
        ("festival", 2),
        ("greetings", 2),
        ("wishing", 2),
        ("happy", 1),
    ],
    "recruitment": [
        ("join us", 5),
        ("join racps", 5),
        ("recruitment", 4),
        ("membership", 3),
        ("call for", 3),
        ("application", 2),
        ("register", 2),
    ],
    "partnership": [
        ("twin club", 4),
        ("jointly", 3),
        ("collaboration", 3),
        ("collaborated", 3),
        ("along with", 2),
        ("joint meeting", 2),
    ],
    "team": [
        ("board of directors", 5),
        ("bod", 4),
        ("congratulations on your appointment", 5),
        ("congratulations on your new role", 4),
        ("congratulations on your role", 4),
        ("congratulations on taking the lead", 4),
        ("introducing you the", 4),
        ("president elect", 2),
    ],
}

ALWAYS_NON_EVENT_PATTERNS = [
    (r"^greetings\b", "announcement"),
    (r"^hello everyone\b", "announcement"),
    (r"^stay tuned\b", "announcement"),
    (r"^did you know\b", "announcement"),
    (r"^what is\b", "announcement"),
    (r"^merry christmas\b", "greeting"),
    (r"^happy new year\b", "greeting"),
    (r"^happy (?:dashain|tihar|holi|nawami|constitution day|charter day)\b", "greeting"),
    (r"^hope you all\b", "greeting"),
    (r"^warm wishes\b", "greeting"),
    (r"^on behalf of .*wish\b", "greeting"),
    (r"^zonal newsletter\b", "announcement"),
    (r"president elect", "team"),
    (r"^anju mandal\b", "announcement"),
    (r"^ri theme\b|rotary international theme", "announcement"),
    (r"^this has been\b", "announcement"),
    (r"^signing off\b", "announcement"),
]


NON_EVENT_PATTERNS = [
    (r"^greetings\b", "announcement"),
    (r"^hello everyone\b", "announcement"),
    (r"^stay tuned\b", "announcement"),
    (r"^did you know\b", "announcement"),
    (r"^what is\b", "announcement"),
    (r"^merry christmas\b", "greeting"),
    (r"^happy\b", "greeting"),
    (r"^hope you all\b", "greeting"),
    (r"^warm wishes\b", "greeting"),
    (r"^15 years of service\b", "greeting"),
    (r"^we will be having\b", "announcement"),
    (r"^do register\b", "announcement"),
    (r"^registration is\b", "announcement"),
    (r"^zonal newsletter\b", "announcement"),
    (r"^congratulations\b", "team"),
    (r"^huge congratulations\b", "team"),
    (r"^we need to apply\b", "announcement"),
    (r"^covid-19 vaccine\b", "announcement"),
    (r"^cycle safety\b", "announcement"),
    (r"^urgent help\b", "announcement"),
    (r"^anju mandal\b", "announcement"),
    (r"^ri theme\b|rotary international theme", "announcement"),
    (r"^this has been\b", "announcement"),
    (r"^signing off\b", "announcement"),
]


CATEGORY_ORDER = [
    "installation",
    "meeting",
    "community_service",
    "professional_development",
    "international_service",
    "club_service",
    "fellowship",
    "fundraiser",
    "recruitment",
    "partnership",
    "team",
    "greeting",
    "announcement",
    "other",
]

EVENT_KINDS = {
    "installation",
    "meeting",
    "community_service",
    "professional_development",
    "international_service",
    "club_service",
    "fellowship",
    "fundraiser",
}

SIGNATURES = [
    (
        r"congratulations on (?:your )?(?:new )?(?:appointment|role|responsibility|taking the lead)|"
        r"introducing (?:you the|the team for|our (?:new )?(?:board|president|vice president|secretary|treasurer|director|club advisor))|"
        r"presenting you the|"
        r"the board is set|"
        r"(?:new|our|the) board of directors|"
        r"announce (?:our|the) (?:new )?board|"
        r"officially introducing our|"
        r"honoring our club advisor|"
        r"thank you for your dedication|"
        r"shiny new board",
        "bod-announcement",
    ),
    (r"constitution day|संविधान दिवस", "constitution-day"),
    (r"happy dashain|दशैँ", "dashain"),
    (r"happy tihar|तिहार", "tihar"),
    (r"nawami|नवमी", "nawami"),
    (r"late rtr\.? sachin|sachin memorial|pathshala nepal|bagdol", "sachin-blood-donation"),
    (r"stuti wagle", "vidushe-stuti"),
    (r"international cultural exchange", "cultural-exchange"),
    (r"\bkaruna\b", "karuna"),
    (r"zonal picnic", "zonal-picnic"),
    (r"bal samrakhshan|orphanage", "orphanage-visit"),
    (r"halloween", "halloween"),
    (r"उपहार|warm gift|cancer battling", "uphar"),
    (r"badminton", "badminton"),
    (r"cleaning campaign", "cleaning-campaign"),
    (r"\bholi\b", "holi"),
    (r"\b(\d{1,2})(?:st|nd|rd|th)?\s+installation\b", "installation"),
    (r"\bpoetry\s+(?:saanjh|साँझ)\b", "poetry-saanjh"),
    (r"\bsecret\s+santa\b", "secret-santa"),
    (r"\bblood\s+donation\b", "blood-donation"),
    (r"\bschool\s+bag\s+for\s+all\b", "school-bag-for-all"),
    (r"\bvidushe\b", "vidushe"),
    (r"\bpenlink\b", "penlink"),
    (r"\bverseny\b", "verseny"),
    (r"\bnaari\b", "naari"),
    (r"\bcharter\s+day\b", "charter-day"),
    (r"\bdistrict\s+conference\b", "district-conference"),
    (r"\bdistrict\s+assembly\b", "district-assembly"),
    (r"\bzonal\s+meeting\b", "zonal-meeting"),
    (r"\bgeneral\s+meeting\b", "general-meeting"),
    (r"\bdeusi\b|\bbhailo\b", "deusi-bhailo"),
    (r"\bhike\b", "hike"),
    (r"\bfutsal\b", "futsal"),
]

SIGNATURE_MAX_DELTA = {
    "sachin-blood-donation": 60,
    "blood-donation": 14,
    "hike": 14,
    "futsal": 14,
    "badminton": 14,
    "uphar": 14,
    "orphanage-visit": 14,
    "halloween": 30,
    "cultural-exchange": 30,
    "zonal-picnic": 30,
    "karuna": 60,
    "vidushe-stuti": 60,
    "district-conference": 120,
    "cleaning-campaign": 60,
    "holi": 30,
}

STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "for",
    "with",
    "in",
    "on",
    "at",
    "from",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "this",
    "that",
    "our",
    "we",
    "us",
    "your",
    "you",
    "it",
    "its",
    "as",
    "not",
    "no",
    "all",
    "new",
    "club",
    "rotaract",
    "racps",
    "rac",
    "patan",
    "south",
    "2020",
    "2021",
    "2022",
    "2023",
    "2024",
    "2025",
    "2026",
    "caption",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def rota_year(value: date | None) -> str | None:
    if not value:
        return None
    start = value.year if value.month >= 7 else value.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def strip_html(value: str) -> str:
    value = re.sub(r"<script\b.*?</script>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<style\b.*?</style>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</p\s*>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r"\n\s*\n+", "\n\n", value)
    return value.strip()


def parse_frontmatter(text: str) -> tuple[dict, str]:
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not match:
        return {}, text
    raw, body = match.groups()
    meta = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        meta[key.strip()] = value
    return meta, body


def clean_for_matching(text: str) -> str:
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"www\.\S+", " ", text)
    text = re.sub(r"#\w+", " ", text)
    text = re.sub(r"@\w+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def title_from_caption(caption: str | None) -> str:
    if not caption:
        return "[no caption]"
    for line in caption.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("#") and len(line.split()) <= 2:
            continue
        line = re.sub(r"\s+", " ", line)
        if len(line) > 120:
            line = line[:117].rsplit(" ", 1)[0] + "..."
        return line
    return "[no caption]"


def tokens(text: str) -> set[str]:
    text = clean_for_matching(text.lower())
    return {
        token
        for token in re.findall(r"[a-z]{3,}", text)
        if token not in STOPWORDS
    }


def signature(text: str) -> str | None:
    lowered = clean_for_matching(text.lower())
    for pattern, name in SIGNATURES:
        if re.search(pattern, lowered):
            return name
    return None


EVENT_VERB_PATTERN = (
    r"\b(?:organized|organised|held|conducted|hosted|celebrated|attended|"
    r"participated|jointly|program|programme|ceremony|session|workshop|visit|"
    r"hike|picnic|donation|campaign|installation|meeting|conference|"
    r"remembered|came together|brought|lit up|full of|celebrat(?:e|ed|ing))\b"
)


def classify(text: str) -> tuple[str, dict[str, int]]:
    lowered = clean_for_matching(text.lower())
    scores: dict[str, int] = defaultdict(int)
    for category, rules in CATEGORY_RULES.items():
        for phrase, weight in rules:
            if len(phrase) <= 4 and phrase.isalpha():
                matched = bool(re.search(rf"\b{re.escape(phrase)}\b", lowered))
            else:
                matched = phrase in lowered
            if matched:
                scores[category] += weight
    event_verb = bool(re.search(EVENT_VERB_PATTERN, lowered))
    if event_verb:
        scores["greeting"] = 0
        if "jatra" in lowered:
            scores["fellowship"] += 3
        elif "charter day" in lowered:
            scores["club_service"] += 3
        elif "dashain" in lowered:
            scores["fellowship"] += 2
    sig = signature(text)
    if sig == "bod-announcement":
        scores["team"] += 8
    elif sig in {"constitution-day", "dashain", "tihar", "nawami"}:
        scores["greeting"] += 8
    if "club officer" in lowered:
        scores["team"] += 6
    if "goal setting" in lowered or "designing your future" in lowered:
        scores["professional_development"] += 5
    if re.search(r"\bkavre\b|\bflood\b|\brelief\b|\bmenstrual\b", lowered):
        scores["community_service"] += 3
    scores = {key: value for key, value in scores.items() if value > 0}
    if not scores:
        if event_verb:
            if re.search(r"clean|campaign|breastfeeding", lowered):
                return "community_service", {"community_service": 1}
            if re.search(r"hike|picnic|holi|jatra|celebrat", lowered):
                return "fellowship", {"fellowship": 1}
            return "club_service", {"club_service": 1}
        return "other", {}
    ranked = sorted(
        scores.items(),
        key=lambda item: (-item[1], CATEGORY_ORDER.index(item[0])),
    )
    return ranked[0][0], dict(ranked)


def term_hint(text: str) -> str | None:
    match = re.search(r"\bRY\s*(\d{2,4})\s*[/-]\s*(\d{2,4})\b", text, re.I)
    if not match:
        match = re.search(r"\bRota\s*Year\s*(\d{2,4})\s*[/-]\s*(\d{2,4})\b", text, re.I)
    if not match:
        return None
    start_raw, end_raw = match.groups()
    start = int(start_raw) if len(start_raw) == 4 else 2000 + int(start_raw)
    end = int(end_raw) if len(end_raw) == 4 else 2000 + int(end_raw)
    if start < 2000 or start > 2100 or end != start + 1:
        return None
    return f"{start}-{end % 100:02d}"


def content_kind(category: str) -> str:
    if category in EVENT_KINDS:
        return "event"
    if category in {"greeting", "recruitment", "announcement"}:
        return "announcement"
    if category == "team":
        return "team"
    if category == "partnership":
        return "event"
    return "other"


def month_regex() -> str:
    names = sorted(MONTHS, key=len, reverse=True)
    return "(?:" + "|".join(names) + ")"


def parse_date_text(text: str, posted: datetime | None) -> dict:
    cleaned = clean_for_matching(text)
    lowered = cleaned.lower()
    month = month_regex()
    candidates: list[dict] = []
    spans: set[tuple[int, int]] = set()

    def add(start: int, end: int, value: date | None, precision: str, raw: str, note: str = "") -> None:
        if (start, end) in spans:
            return
        spans.add((start, end))
        if value and not (date(2010, 1, 1) <= value <= date(2027, 12, 31)):
            return
        candidates.append(
            {
                "date": value.isoformat() if value else None,
                "precision": precision,
                "raw": raw.strip(),
                "note": note,
                "position": start,
            }
        )

    patterns = [
        (
            re.compile(
                rf"(?<!\d)(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({month})\s*,?\s*(\d{{4}})(?!\d)",
                re.I,
            ),
            "dmy",
        ),
        (
            re.compile(
                rf"({month})\s+(\d{{1,2}})(?:st|nd|rd|th)?\s*,?\s*(\d{{4}})(?!\d)",
                re.I,
            ),
            "mdy",
        ),
        (
            re.compile(r"(?<!\d)(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?!\d)"),
            "ymd",
        ),
    ]

    for pattern, kind in patterns:
        for match in pattern.finditer(cleaned):
            if kind == "dmy":
                day, month_name, year = match.groups()
            elif kind == "mdy":
                month_name, day, year = match.groups()
            else:
                year, month_number, day = match.groups()
                month_name = None

            if month_name:
                month_number = MONTHS.get(month_name.lower())
            else:
                month_number = int(month_number)

            value = safe_date(int(year), int(month_number), int(day))
            if value:
                context = cleaned[max(0, match.start() - 24) : match.start()].lower()
                score = 0
                if re.search(r"\b(on|held on|dated|from)\s*$", context):
                    score += 1
                add(
                    match.start(),
                    match.end(),
                    value,
                    "explicit",
                    match.group(0),
                    f"context_score={score}",
                )

    for match in re.finditer(
        r"(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?!\d)", cleaned
    ):
        first, second, year_text = match.groups()
        if len(year_text) == 2:
            year = 2000 + int(year_text)
            note = "two-digit year"
        else:
            year = int(year_text)
            note = ""
        if year < 2010:
            add(
                match.start(),
                match.end(),
                None,
                "ambiguous_numeric",
                match.group(0),
                "short or non-Gregorian year",
            )
            continue
        a, b = int(first), int(second)
        if a > 12:
            day, month_number = a, b
        elif b > 12:
            month_number, day = a, b
        else:
            day, month_number = a, b
            note = (note + "; day/month assumed").strip("; ")
        value = safe_date(year, month_number, day)
        if value:
            add(
                match.start(),
                match.end(),
                value,
                "explicit_numeric",
                match.group(0),
                note,
            )

    without_year: list[tuple[int, int, int, str]] = []
    for match in re.finditer(
        rf"(?<!\d)(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({month})(?!\s*,?\s*\d{{4}})",
        cleaned,
        re.I,
    ):
        day, month_name = match.groups()
        without_year.append((match.start(), match.end(), int(day), month_name))
    for match in re.finditer(
        rf"({month})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?!\s*,?\s*\d{{4}})",
        cleaned,
        re.I,
    ):
        month_name, day = match.groups()
        without_year.append((match.start(), match.end(), int(day), month_name))

    for start, end, day, month_name in without_year:
        m = MONTHS.get(month_name.lower())
        if not m:
            continue
        inferred = None
        if posted:
            options = []
            for year in (posted.year - 1, posted.year, posted.year + 1):
                candidate = safe_date(year, m, day)
                if candidate:
                    delta = abs((candidate - posted.date()).days)
                    if delta <= 400:
                        options.append((delta, candidate))
            if options:
                inferred = min(options)[1]
        if inferred:
            add(start, end, inferred, "inferred_year", cleaned[start:end])

    for match in re.finditer(
        rf"(?<!\d)(\d{{1,2}})\s*({ '|'.join(NEPALI_MONTHS) })(?:\s*(\d{{4}}))?",
        lowered,
    ):
        add(
            match.start(),
            match.end(),
            None,
            "nepali",
            cleaned[match.start() : match.end()],
            "Nepali/BS date needs manual conversion",
        )
    for match in re.finditer(r"\b(20[7-9]\d)\b", lowered):
        add(
            match.start(),
            match.end(),
            None,
            "bs_year",
            cleaned[match.start() : match.end()],
            "possible Bikram Sambat year",
        )

    if posted and re.search(r"\btoday|tonight\b", lowered):
        add(0, 0, posted.date(), "same_day", "today/tonight")
    elif posted and re.search(r"\byesterday\b", lowered):
        add(0, 0, posted.date() - timedelta(days=1), "same_day", "yesterday")
    elif posted and re.search(r"\btomorrow\b", lowered):
        add(0, 0, posted.date() + timedelta(days=1), "same_day", "tomorrow")

    priority = {
        "explicit": 5,
        "explicit_numeric": 4,
        "inferred_year": 3,
        "same_day": 3,
        "bs_year": 2,
        "nepali": 2,
        "ambiguous_numeric": 1,
    }
    candidates.sort(
        key=lambda item: (
            -priority.get(item["precision"], 0),
            item["date"] is None,
            abs(
                (
                    date.fromisoformat(item["date"]) - posted.date()
                ).days
                if item["date"] and posted
                else 99999
            ),
            item["position"],
        )
    )

    best = candidates[0] if candidates else None
    if not best:
        return {
            "event_date": posted.date().isoformat() if posted else None,
            "event_date_text": None,
            "date_confidence": "unknown" if posted else None,
            "date_note": "no date found; posted date used as placeholder"
            if posted
            else "no date found",
            "date_candidates": candidates,
        }

    return {
        "event_date": best["date"],
        "event_date_text": best["raw"],
        "date_confidence": best["precision"],
        "date_note": best["note"],
        "date_candidates": candidates,
    }


def location_hint(text: str) -> str | None:
    cleaned = clean_for_matching(text)
    places = (
        "School|College|Hospital|Hall|Restaurant|Cafe|Park|Temple|Mandir|"
        "Stupa|Durbar|Square|Chowk|Nepal|Patan|Lalitpur|Kathmandu|Bhaktapur|"
        "Jawalakhel|Pulchowk|Lagankhel|Harisiddhi|Kusunti|Sanepa|Balkumari|"
        "Bhaisepati|Damak|Pokhara|Dhulikhel|Kavre|Panauti|Thimi|Sano Gaucharan"
    )
    match = re.search(
        rf"\b(?:held|organized|organised|conducted|hosted|at|in)\s+(?:at\s+)?"
        rf"([A-Z][A-Za-z0-9'’.&/-]*(?:\s+[A-Z][A-Za-z0-9'’.&/-]*){{0,6}}"
        rf"(?:\s+(?:{places}))?)",
        cleaned,
    )
    if not match:
        return None
    value = re.sub(r"\s+", " ", match.group(1)).strip(" .,;-")
    value = re.split(r"\.\s+(?=[A-Z])", value)[0].strip(" .,;-")
    if len(value) < 4 or len(value) > 90:
        return None
    return value


def ig_inventory() -> list[dict]:
    manifest = load_json(IG_MANIFEST)
    items = []
    for index, entry in enumerate(manifest.get("items", [])):
        category = entry.get("category")
        if category not in {"post", "reel", "archived", "repost", "igtv"}:
            continue
        posted = parse_dt(entry.get("date"))
        caption = entry.get("caption") or ""
        flat = clean_for_matching(caption)
        auto_category, scores = classify(f"{flat}")
        content = content_kind(auto_category)
        parsed = parse_date_text(caption, posted)
        notes = []
        if not caption.strip():
            notes.append("No caption")
        if category in {"reel", "archived", "repost", "igtv"}:
            notes.append(f"Instagram {category}")
        if entry.get("media_count", 0) == 0:
            notes.append("No media attached")
        if content == "announcement":
            notes.append("Non-event announcement/greeting; decide later")
        if content == "team":
            notes.append("BOD/team announcement; candidate for team archive")
        if parsed["date_confidence"] in {"nepali", "bs_year", "ambiguous_numeric"}:
            notes.append("Date needs manual review")
        items.append(
            {
                "id": f"ig:{index:04d}",
                "source": "instagram",
                "source_type": category,
                "source_url": entry.get("instagram_url"),
                "shortcode": entry.get("shortcode"),
                "title": title_from_caption(caption),
                "caption": caption or None,
                "body_text": None,
                "posted_at": entry.get("date"),
                "posted_date": posted.date().isoformat() if posted else None,
                "rota_year_posted": rota_year(posted.date()) if posted else None,
                "event_date": parsed["event_date"],
                "event_date_text": parsed["event_date_text"],
                "date_confidence": parsed["date_confidence"],
                "date_note": parsed["date_note"],
                "date_candidates": parsed["date_candidates"],
                "category": auto_category,
                "category_scores": scores,
                "content_kind": content,
                "term_hint": term_hint(caption),
                "location_hint": location_hint(caption),
                "media": entry.get("media") or [],
                "media_count": entry.get("media_count", 0),
                "notes": notes,
            }
        )
    return items


def blogspot_inventory() -> list[dict]:
    manifest = load_json(BLOG_MANIFEST)
    items = []
    for kind in ("posts", "pages"):
        for entry in manifest.get(kind, []):
            slug = entry.get("slug")
            md_path = BLOG_MD / kind / f"{slug}.md"
            meta = {}
            body_html = ""
            if md_path.exists():
                meta, body_html = parse_frontmatter(
                    md_path.read_text(encoding="utf-8")
                )
            body_text = strip_html(body_html)
            posted = parse_dt(entry.get("published") or meta.get("date"))
            caption = body_text
            auto_category, scores = classify(f"{entry.get('title', '')}\n{body_text}")
            content = content_kind(auto_category)
            title_lower = str(entry.get("title", "")).lower()
            if "projects and events" in title_lower:
                content = "index"
            elif "club officer" in title_lower or "board of directors" in title_lower:
                auto_category = "team"
                content = "team"
            if kind == "pages":
                content = "page"
            parsed = parse_date_text(f"{entry.get('title', '')}\n{body_text}", posted)
            base = md_path.parent.parent if md_path.exists() else BLOG_MD
            image_dir = Path("_sources/blogspot/images") / str(slug)
            media = []
            if image_dir.exists():
                for path in sorted(image_dir.iterdir()):
                    if path.is_file():
                        media.append(
                            {
                                "uri": str(path),
                                "path": str(path),
                                "exists": True,
                                "bytes": path.stat().st_size,
                                "kind": "image",
                            }
                        )
            notes = []
            if entry.get("images_failed"):
                notes.append(f"{entry['images_failed']} image(s) unavailable")
            if kind == "pages":
                notes.append("Static Blogspot page; route manually")
            if "projects and events" in str(entry.get("title", "")).lower():
                notes.append("Index page; expand linked activities manually")
            if "club officer" in str(entry.get("title", "")).lower():
                notes.append("Contains BOD/past-president data; archive to team history")
            items.append(
                {
                    "id": f"blogspot:{kind[:-1]}:{slug}",
                    "source": "blogspot",
                    "source_type": f"blogspot_{kind[:-1]}",
                    "source_url": entry.get("url"),
                    "shortcode": None,
                    "title": entry.get("title") or meta.get("title") or slug,
                    "caption": body_text or None,
                    "body_text": body_text,
                    "posted_at": entry.get("published") or meta.get("date"),
                    "posted_date": posted.date().isoformat() if posted else None,
                    "rota_year_posted": rota_year(posted.date()) if posted else None,
                    "event_date": parsed["event_date"],
                    "event_date_text": parsed["event_date_text"],
                    "date_confidence": parsed["date_confidence"],
                    "date_note": parsed["date_note"],
                    "date_candidates": parsed["date_candidates"],
                    "category": auto_category,
                    "category_scores": scores,
                    "content_kind": content,
                    "term_hint": term_hint(f"{entry.get('title', '')}\n{body_text}"),
                    "location_hint": location_hint(body_text),
                    "media": media,
                    "media_count": len(media),
                    "notes": notes,
                }
            )
    return items


def choose_event_date(items: list[dict]) -> tuple[str | None, str]:
    priority = {
        "explicit": 5,
        "explicit_numeric": 4,
        "inferred_year": 3,
        "same_day": 3,
        "unknown": 1,
        "bs_year": 0,
        "nepali": 0,
        "ambiguous_numeric": 0,
    }
    dated = [item for item in items if item.get("event_date")]
    if not dated:
        return None, "unknown"
    dated.sort(
        key=lambda item: (
            -priority.get(item.get("date_confidence"), 0),
            item.get("event_date") or "9999",
        )
    )
    return dated[0]["event_date"], dated[0].get("date_confidence") or "unknown"


def cluster_items(items: list[dict]) -> list[dict]:
    clusters: list[dict] = []
    for item in sorted(
        [item for item in items if item["content_kind"] not in {"page", "index"}],
        key=lambda item: item.get("posted_at") or "",
    ):
        text = f"{item.get('title', '')} {item.get('caption') or ''}"
        item_tokens = tokens(text)
        item_signature = signature(text)
        event_date = item.get("event_date") or item.get("posted_date")
        event_day = date.fromisoformat(event_date) if event_date else None
        item_term = item.get("term_hint") or item.get("rota_year_posted")
        best = None
        best_score = 0.0
        best_reason = ""
        for cluster in clusters:
            cluster_day = (
                date.fromisoformat(cluster["event_date"])
                if cluster.get("event_date")
                else None
            )
            if not event_day or not cluster_day:
                continue
            delta = abs((event_day - cluster_day).days)
            if delta > 120:
                continue
            union = item_tokens | cluster["_tokens"]
            jaccard = (
                len(item_tokens & cluster["_tokens"]) / len(union)
                if union and item_tokens and cluster["_tokens"]
                else 0.0
            )
            score = 0.0
            reason = ""
            if item_signature and item_signature == cluster.get("signature"):
                if item_signature == "bod-announcement":
                    same_term = bool(item_term and item_term == cluster.get("term"))
                    score = 1.2 if same_term else 1.0 - min(delta, 60) / 200
                    reason = "same BOD term" if same_term else "same BOD announcement signature"
                elif item_signature in {"dashain", "tihar", "nawami", "constitution-day"}:
                    if delta <= 7:
                        score = 1.0 - delta / 100
                        reason = f"same festival signature ({item_signature})"
                else:
                    max_delta = SIGNATURE_MAX_DELTA.get(item_signature, 60)
                    if delta <= max_delta:
                        score = 1.0 - min(delta, 60) / 200
                        reason = f"same signature ({item_signature})"
            elif delta <= 2 and item["content_kind"] == "team" and cluster.get("kind") == "team":
                score = 0.95
                reason = "same day + team/BOD"
            elif delta <= 2 and jaccard >= 0.25:
                score = 0.9 + min(jaccard, 0.1)
                reason = f"same day + caption similarity {jaccard:.2f}"
            elif delta <= 14 and jaccard >= 0.40:
                score = 0.7 + min(jaccard, 0.2)
                reason = f"nearby + caption similarity {jaccard:.2f}"
            elif delta <= 45 and jaccard >= 0.55:
                score = 0.6 + min(jaccard, 0.2)
                reason = f"within 45 days + caption similarity {jaccard:.2f}"
            if score > best_score:
                best = cluster
                best_score = score
                best_reason = reason
        if best and best_score >= 0.6:
            best["items"].append(item["id"])
            best["_tokens"] |= item_tokens
            best["_reasons"].add(best_reason)
        else:
            clusters.append(
                {
                    "id": f"C{len(clusters) + 1:04d}",
                    "event_date": event_date,
                    "items": [item["id"]],
                    "_tokens": item_tokens,
                    "signature": item_signature,
                    "kind": item["content_kind"],
                    "term": item_term,
                    "_reasons": set(),
                }
            )

    by_id = {item["id"]: item for item in items}
    output = []
    for cluster in clusters:
        members = [by_id[item_id] for item_id in cluster["items"]]
        event_date, confidence = choose_event_date(members)
        near = sorted(
            [m for m in members if m.get("event_date")],
            key=lambda m: m["event_date"],
        )
        if not event_date and near:
            event_date = near[0]["event_date"]
        category_scores: Counter[str] = Counter()
        for member in members:
            category_scores[member["category"]] += 1
        ranked_categories = sorted(
            category_scores.items(),
            key=lambda item: (
                -item[1],
                CATEGORY_ORDER.index(item[0]) if item[0] in CATEGORY_ORDER else 999,
            ),
        )
        category = ranked_categories[0][0]
        if cluster.get("signature") == "bod-announcement":
            category = "team"
        elif cluster.get("signature") in {"constitution-day", "dashain", "tihar", "nawami"}:
            category = "greeting"
        terms = Counter(
            member.get("term_hint") or member.get("rota_year_posted")
            for member in members
            if member.get("term_hint") or member.get("rota_year_posted")
        )
        term = terms.most_common(1)[0][0] if terms else None
        locations = Counter(
            member["location_hint"] for member in members if member.get("location_hint")
        )
        title = max(members, key=lambda m: len(m.get("title") or "")).get("title")
        notes = set()
        for member in members:
            notes.update(member.get("notes") or [])
        if any(m["content_kind"] == "announcement" for m in members):
            notes.add("Contains announcement/greeting content; curate before publishing")
        if any(m["content_kind"] == "team" for m in members):
            notes.add("Contains team/BOD content; archive in team history")
        if confidence in {"unknown", "nepali", "bs_year", "ambiguous_numeric"}:
            notes.add("Event date needs manual confirmation")
        media_count = sum(member.get("media_count", 0) for member in members)
        combined_text = " ".join(
            f"{member.get('title') or ''} {member.get('caption') or ''}"
            for member in members
        )
        if len(members) == 1:
            for pattern, non_event_kind in ALWAYS_NON_EVENT_PATTERNS:
                if re.search(pattern, (title or "").lower()):
                    category = non_event_kind
                    notes.add("Moved out of events by non-event title rule")
                    break
            else:
                if not re.search(EVENT_VERB_PATTERN, combined_text.lower()):
                    for pattern, non_event_kind in NON_EVENT_PATTERNS:
                        if re.search(pattern, (title or "").lower()):
                            category = non_event_kind
                            notes.add("Moved out of events by non-event title rule")
                            break
        selected_event_day = date.fromisoformat(event_date) if event_date else None
        selected_rota_year = rota_year(selected_event_day)
        term = term if category == "team" else selected_rota_year
        output.append(
            {
                "id": cluster["id"],
                "event_date": event_date,
                "date_confidence": confidence,
                "rota_year": selected_rota_year,
                "term": term,
                "title": title,
                "category": category,
                "content_kind": (
                    "team"
                    if category == "team"
                    else "announcement"
                    if category in {"greeting", "announcement"}
                    else "event"
                    if any(m["content_kind"] == "event" for m in members)
                    else content_kind(category)
                ),
                "location": locations.most_common(1)[0][0] if locations else None,
                "item_ids": cluster["items"],
                "item_count": len(members),
                "media_count": media_count,
                "signature": cluster.get("signature"),
                "cluster_reasons": sorted(cluster["_reasons"]),
                "notes": sorted(notes),
            }
        )
    output.sort(
        key=lambda cluster: (
            cluster["event_date"] or "9999",
            cluster["rota_year"] or "9999",
            cluster["id"],
        )
    )
    for index, cluster in enumerate(output, start=1):
        cluster["id"] = f"C{index:04d}"
    return output


def write_review(
    items: list[dict],
    clusters: list[dict],
    filename: str = "review.md",
    kinds: set[str] | None = None,
    heading: str = "Content review",
) -> None:
    by_id = {item["id"]: item for item in items}
    selected = [
        cluster
        for cluster in clusters
        if kinds is None or cluster["content_kind"] in kinds
    ]
    grouped: dict[str, list[dict]] = defaultdict(list)
    for cluster in selected:
        grouped[cluster["rota_year"] or "Unknown"].append(cluster)

    lines = [
        f"# {heading}",
        "",
        "Tick a cluster when the title, date, category, and included posts look right.",
        "Edit `review.csv` or leave notes here, then re-run the sorter.",
        "",
    ]
    for ry in sorted(grouped, key=lambda value: (value == "Unknown", value)):
        clusters_for_year = grouped[ry]
        lines.append(f"## RY {ry}")
        lines.append("")
        for cluster in clusters_for_year:
            date_label = cluster["event_date"] or "undated"
            meta = [
                f"kind:{cluster['content_kind']}",
                f"category:{cluster['category']}",
                f"date:{cluster['date_confidence']}",
            ]
            if cluster.get("term"):
                meta.append(f"term:{cluster['term']}")
            if cluster.get("location"):
                meta.append(f"location:{cluster['location']}")
            lines.append(
                f"- [ ] `{cluster['id']}` **{date_label}** · "
                f"{' · '.join(meta)} · {cluster['title']} · "
                f"{cluster['item_count']} post(s), {cluster['media_count']} media"
            )
            if cluster.get("content_kind") != "event":
                lines.append("  - note: non-event; decide whether to archive, blog, or skip")
            seen_notes = set()
            for note in cluster["notes"]:
                if note in seen_notes:
                    continue
                seen_notes.add(note)
                lines.append(f"  - note: {note}")
            for item_id in cluster["item_ids"]:
                item = by_id[item_id]
                source = "IG" if item["source"] == "instagram" else "Blogspot"
                url = item.get("source_url")
                link = f" · [source]({url})" if url else ""
                posted = item.get("posted_date") or "?"
                title = (item.get("title") or "").replace("\n", " ")
                date_text = item.get("event_date_text")
                detail = f" · date-text:{date_text}" if date_text else ""
                lines.append(
                    f"  - {source} {posted} · {item['category']} · "
                    f"{item['media_count']} media · {title}{detail}{link}"
                )
            lines.append("")
    (OUT / filename).write_text("\n".join(lines), encoding="utf-8")


def write_csv(clusters: list[dict]) -> None:
    with (OUT / "review.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "cluster_id",
                "rota_year",
                "event_date",
                "date_confidence",
                "category",
                "content_kind",
                "term",
                "title",
                "location",
                "item_count",
                "media_count",
                "notes",
                "item_ids",
            ]
        )
        for cluster in clusters:
            writer.writerow(
                [
                    cluster["id"],
                    cluster["rota_year"],
                    cluster["event_date"],
                    cluster["date_confidence"],
                    cluster["category"],
                    cluster["content_kind"],
                    cluster.get("term"),
                    cluster["title"],
                    cluster["location"],
                    cluster["item_count"],
                    cluster["media_count"],
                    " | ".join(cluster["notes"]),
                    ",".join(cluster["item_ids"]),
                ]
            )


def write_archive_pages(items: list[dict]) -> None:
    pages = [
        item for item in items if item["content_kind"] in {"page", "index"}
    ]
    lines = ["# Blogspot pages and indexes", ""]
    for page in pages:
        lines.append(f"## {page['title']}")
        lines.append("")
        lines.append(f"- Source: {page.get('source_url') or 'n/a'}")
        lines.append(f"- Images: {page.get('media_count', 0)}")
        if page.get("notes"):
            lines.append(f"- Notes: {'; '.join(page['notes'])}")
        excerpt = re.sub(r"\s+", " ", page.get("body_text") or "")[:500]
        lines.append("")
        lines.append(f"> {excerpt}")
        lines.append("")
    (OUT / "archive_pages.md").write_text("\n".join(lines), encoding="utf-8")


def write_team_history(items: list[dict], clusters: list[dict]) -> None:
    by_id = {item["id"]: item for item in items}
    team_clusters = [c for c in clusters if c["content_kind"] == "team"]
    clustered = {item_id for cluster in team_clusters for item_id in cluster["item_ids"]}
    extra = [
        item
        for item in items
        if item["id"] not in clustered
        and (
            item["content_kind"] == "team"
            or (
                item["source_type"] == "blogspot_page"
                and "club officer" in item["title"].lower()
            )
        )
    ]
    lines = [
        "# Team / BOD archive staging",
        "",
        "Names and roles still need manual extraction. This file groups the source",
        "posts so the board history can be reconstructed year by year.",
        "",
    ]
    for cluster in sorted(
        team_clusters,
        key=lambda c: (c.get("term") or c.get("rota_year") or "9999", c["event_date"] or "9999"),
    ):
        label = cluster.get("term") or cluster.get("rota_year") or "Undated"
        lines.append(f"## {label} · {cluster['event_date'] or 'undated'} · {cluster['title']}")
        lines.append("")
        if cluster.get("notes"):
            lines.append(f"- Notes: {'; '.join(cluster['notes'])}")
        for item_id in cluster["item_ids"]:
            item = by_id[item_id]
            lines.append("")
            lines.append(f"### {item.get('posted_date') or 'undated'} · {item['title']}")
            if item.get("source_url"):
                lines.append(f"- Source: {item['source_url']}")
            caption = re.sub(r"\s+", " ", item.get("caption") or "")[:2500]
            if caption:
                lines.append("")
                lines.append(f"> {caption}")
        lines.append("")
    if extra:
        lines.append("## Ungrouped team items")
        lines.append("")
        for item in extra:
            lines.append(f"### {item.get('posted_date') or 'undated'} · {item['title']}")
            if item.get("source_url"):
                lines.append(f"- Source: {item['source_url']}")
            caption = re.sub(r"\s+", " ", item.get("caption") or "")[:2500]
            if caption:
                lines.append(f"> {caption}")
            lines.append("")
    (OUT / "team_history.md").write_text("\n".join(lines), encoding="utf-8")


def write_readme(items: list[dict], clusters: list[dict]) -> None:
    counts = Counter(item["source_type"] for item in items)
    category_counts = Counter(cluster["category"] for cluster in clusters)
    confidence_counts = Counter(cluster["date_confidence"] for cluster in clusters)
    lines = [
        "# Sorted content staging",
        "",
        f"Generated from Instagram and Blogspot manifests on {datetime.now(timezone.utc).date().isoformat()}.",
        "",
        "## Inputs",
        "",
        f"- Instagram items: {sum(v for k, v in counts.items() if k in {'post', 'reel', 'archived', 'repost', 'igtv'})}",
        f"- Blogspot posts: {counts.get('blogspot_post', 0)}",
        f"- Blogspot pages: {counts.get('blogspot_page', 0)}",
        "",
        "## Outputs",
        "",
        "- `inventory.json` — every source item with parsed date, category, media, and notes.",
        "- `clusters.json` — candidate activities; review these before writing CMS content.",
        "- `review.md` — human-readable review by Rota year.",
        "- `review_events.md` — event-only review, easier for the curated gallery pass.",
        "- `review_non_events.md` — announcements, greetings, and team/other items.",
        "- `review.csv` — spreadsheet-friendly version of the same clusters.",
        "- `archive_pages.md` — static Blogspot pages and index posts that need manual routing.",
        "- `team_history.md` — grouped BOD/team source posts for reconstructing board history.",
        "",
        "## Counts",
        "",
        f"- Candidate clusters: {len(clusters)}",
        f"- Multi-post clusters: {sum(1 for c in clusters if c['item_count'] > 1)}",
        f"- Clusters with unknown/non-Gregorian dates: {sum(1 for c in clusters if c['date_confidence'] in {'unknown', 'nepali', 'bs_year', 'ambiguous_numeric'})}",
        "",
        "### By category",
        "",
    ]
    for category, count in category_counts.most_common():
        lines.append(f"- {category}: {count}")
    lines.extend(["", "### By date confidence", ""])
    for confidence, count in confidence_counts.most_common():
        lines.append(f"- {confidence}: {count}")
    lines.extend(
        [
            "",
            "## Current decisions",
            "",
            "- Event-first: one curated event per activity; Blog is reserved for narratives.",
            "- Stories are excluded from public content.",
            "- Ambiguous, greeting, and announcement posts are flagged; decide later.",
            "- 2015–2020 remains a known gap until Facebook/reports are available.",
            "",
            "## Next step",
            "",
            "Review `review.md` or `review.csv`, correct dates/titles/categories, then write CMS content from the approved clusters.",
            "",
        ]
    )
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    items = ig_inventory() + blogspot_inventory()
    clusters = cluster_items(items)
    inventory = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": dict(Counter(item["source_type"] for item in items)),
        "items": items,
    }
    (OUT / "inventory.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT / "clusters.json").write_text(
        json.dumps(clusters, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_review(items, clusters)
    write_review(
        items,
        clusters,
        filename="review_events.md",
        kinds={"event"},
        heading="Event review",
    )
    write_review(
        items,
        clusters,
        filename="review_non_events.md",
        kinds={"announcement", "team", "other"},
        heading="Non-event review",
    )
    write_csv(clusters)
    write_archive_pages(items)
    write_team_history(items, clusters)
    write_readme(items, clusters)
    print(f"Wrote {len(items)} items and {len(clusters)} clusters to {OUT}")


if __name__ == "__main__":
    main()
