#!/usr/bin/env python3
import json
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "_sources/blogspot/markdown/posts"
IMAGES = ROOT / "_sources/blogspot/images"
OUT = ROOT / "content/blog"
UPLOAD = ROOT / "public/uploads/blog"

HEADINGS = {"h1": "#", "h2": "##", "h3": "###", "h4": "####"}
BLOCKS = {"div", "p", "section", "article", "header", "footer", "blockquote", "table", "tr"}


def yaml_value(value):
    return json.dumps(value, ensure_ascii=False)


def inline_text(node: Tag) -> str:
    return " ".join(node.get_text(" ", strip=True).split())


def to_markdown(node, slug: str, counter: list[int]) -> str:
    if isinstance(node, NavigableString):
        return str(node)

    if not isinstance(node, Tag):
        return ""

    name = node.name.lower()
    if name in {"script", "style"}:
        return ""

    if name == "br":
        return "\n"

    if name == "img":
        src = node.get("src", "")
        alt = inline_text(node) if node.get_text(strip=True) else ""
        if src.startswith("../../images/"):
            relative = src.removeprefix("../../images/")
            source_path = IMAGES / relative
            if source_path.is_file():
                UPLOAD.mkdir(parents=True, exist_ok=True)
                counter[0] += 1
                target = UPLOAD / f"{slug}-{counter[0]}{source_path.suffix.lower()}"
                shutil.copyfile(source_path, target)
                return f"\n\n![{alt}](/uploads/blog/{target.name})\n\n"
        return ""

    children = "".join(to_markdown(child, slug, counter) for child in node.children)

    if name in {"strong", "b"}:
        text = children.strip()
        return f"**{text}**" if text else ""

    if name in {"em", "i"}:
        text = children.strip()
        return f"*{text}*" if text else ""

    if name == "a":
        text = children.strip()
        href = node.get("href", "")
        if not text:
            return ""
        if href and not href.startswith("#") and "blogger.com/null" not in href:
            return f"[{text}]({href})"
        return text

    if name == "li":
        text = children.strip()
        if not text:
            return ""
        marker = "1. " if node.find_parent("ol") else "- "
        return f"\n{marker}{text}"

    if name in HEADINGS:
        text = children.strip()
        return f"\n\n{HEADINGS[name]} {text}\n\n" if text else ""

    if name in BLOCKS:
        text = children.strip()
        return f"\n\n{text}\n\n" if text else ""

    return children


def process_markdown_images(value: str, slug: str, counter: list[int]) -> str:
    def replace(match):
        alt = match.group(1)
        src = match.group(2)
        if src.startswith("../../images/"):
            relative = src.removeprefix("../../images/")
            source_path = IMAGES / relative
            if not source_path.is_file():
                return ""
            UPLOAD.mkdir(parents=True, exist_ok=True)
            counter[0] += 1
            target = UPLOAD / f"{slug}-{counter[0]}{source_path.suffix.lower()}"
            shutil.copyfile(source_path, target)
            return f"\n\n![{alt}](/uploads/blog/{target.name})\n\n"
        if src.startswith("/uploads/"):
            return match.group(0)
        return ""

    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", replace, value)


def normalize_markdown(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"\\([.!])", r"\1", value)
    value = re.sub(r"\[\s*(!\[[^\]]*\]\(/uploads/blog/[^)]+\))\s*\]\([^)]*\)", r"\1", value)
    value = re.sub(r"(!\[[^\]]*\]\(/uploads/blog/[^)]+\))", r"\n\n\1\n\n", value)
    value = re.sub(r"\[!\]\([^)]*\)", "", value)
    value = re.sub(r"(?<!!)\[\]\([^)]*\)", "", value)
    value = re.sub(r"(?m)^(\d+)\.(\S)", r"\1. \2", value)
    value = re.sub(r"\[([^\]]+)\]\(mailto:[^)]+\)", r"\1", value)
    value = re.sub(r"\b[\w.+-]+@[\w.-]+\.\w+\b", "", value)
    value = re.sub(r"(?m)^#{1,6}\s*$", "", value)
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r" +\n", "\n", value)
    value = re.sub(r"\n\n[ \t]*\n\n", "\n\n", value)
    return value.strip()


def make_excerpt(body: str) -> str:
    text = re.sub(r"---.*", "", body, flags=re.S)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"[#*_>`]", "", text)
    text = " ".join(text.split())
    if len(text) <= 180:
        return text
    return text[:180].rsplit(" ", 1)[0].rstrip(" .,:;") + "..."


def parse_frontmatter(text: str):
    if not text.startswith("---"):
        raise ValueError("missing frontmatter")
    _, frontmatter, body = text.split("---", 2)
    values = {}
    for line in frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip().strip('"')
        values[key.strip()] = value
    return values, body


def main():
    if not SOURCE.is_dir():
        raise SystemExit(f"missing source directory: {SOURCE}")
    OUT.mkdir(parents=True, exist_ok=True)
    if UPLOAD.exists():
        shutil.rmtree(UPLOAD)
    for path in OUT.glob("*.md"):
        path.unlink()

    written = 0
    for path in sorted(SOURCE.glob("*.md")):
        raw = path.read_text()
        meta, html = parse_frontmatter(raw)
        soup = BeautifulSoup(html, "lxml")
        counter = [0]
        body = to_markdown(soup, path.stem, counter)
        body = process_markdown_images(body, path.stem, counter)
        body = normalize_markdown(body)
        if not body:
            continue
        source_url = meta.get("source_url", "")
        if source_url:
            body += f"\n\n---\n\n*Originally published on the [RAC Patan South Blogspot]({source_url}).*"
        cover_match = re.search(r"!\[[^\]]*\]\((/uploads/blog/[^)]+)\)", body)
        cover = cover_match.group(1) if cover_match else ""
        if cover:
            body = re.sub(r"!\[[^\]]*\]\(" + re.escape(cover) + r"\)\n*", "", body, count=1).strip()
        frontmatter = [
            "---",
            f"title: {yaml_value(meta.get('title', path.stem))}",
            f"slug: {yaml_value(path.stem)}",
            f"date: {yaml_value(meta.get('date', ''))}",
            f"author: {yaml_value('RAC Patan South Archive')}",
            f"excerpt: {yaml_value(make_excerpt(body))}",
        ]
        if cover:
            frontmatter.append(f"coverImage: {yaml_value(cover)}")
        frontmatter.append("---")
        (OUT / f"{path.stem}.md").write_text("\n".join(frontmatter) + "\n\n" + body + "\n")
        written += 1

    print(f"Wrote {written} blog posts to {OUT}")
    print(f"Copied blog images to {UPLOAD}")


if __name__ == "__main__":
    main()
