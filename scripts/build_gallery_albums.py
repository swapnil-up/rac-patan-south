#!/usr/bin/env python3
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVENTS = ROOT / "_sources/sorted/curated_events.json"
OUT = ROOT / "content/gallery"
MAX_PHOTOS = 36
MAX_PER_EVENT = 3
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def yaml_value(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    events = json.loads(EVENTS.read_text())
    albums = defaultdict(list)
    for event in events:
        if event.get("image"):
            albums[event["rotaYear"]].append(event)

    OUT.mkdir(parents=True, exist_ok=True)
    for path in OUT.glob("*.md"):
        path.unlink()

    for rota_year in sorted(albums, reverse=True):
        year_events = sorted(albums[rota_year], key=lambda item: (item["date"], item["slug"]), reverse=True)
        photos = []
        seen = set()
        for event in year_events:
            candidates = [event.get("image")]
            candidates.extend(photo.get("image") for photo in event.get("photos") or [])
            added_for_event = 0
            month = MONTHS[int(event["date"][5:7]) - 1]
            month_year = f"{month} {event['date'][:4]}"
            for image in candidates:
                if not image or image in seen:
                    continue
                seen.add(image)
                photos.append({"image": image, "caption": f"{event['title']} ({month_year})"})
                added_for_event += 1
                if added_for_event >= MAX_PER_EVENT or len(photos) >= MAX_PHOTOS:
                    break
            if len(photos) >= MAX_PHOTOS:
                break
        if not photos:
            continue

        start = int(rota_year[:4])
        slug = f"rota-year-{rota_year}"
        lines = [
            "---",
            f"title: {yaml_value(f'Rota Year {rota_year}')}",
            f"slug: {yaml_value(slug)}",
            f"date: {yaml_value(f'{start}-07-01T00:00:00.000Z')}",
            f"cover: {yaml_value(photos[0]['image'])}",
            "photos:",
        ]
        for photo in photos:
            lines.extend([
                f"  - image: {yaml_value(photo['image'])}",
                f"    caption: {yaml_value(photo['caption'])}",
            ])
        lines.append("---")
        (OUT / f"{slug}.md").write_text("\n".join(lines) + "\n")
        print(f"{rota_year}: {len(photos)} photos")


if __name__ == "__main__":
    main()
