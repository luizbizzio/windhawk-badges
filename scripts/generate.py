#!/usr/bin/env python3
"""Build static SVG badges and a compact Windhawk catalog for GitHub Pages."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from html import escape
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

CATALOG_URL = "https://mods.windhawk.net/catalogs/en.json"
MOD_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,95}$")
BADGE_LABELS = {
    "users": "Windhawk users",
    "rating": "Windhawk rating",
    "votes": "Rating votes",
    "reviews": "Reviews",
    "version": "Version",
    "author": "Author",
    "updated": "Updated",
    "published": "Published",
    "license": "License",
    "architecture": "Architecture",
    "github": "GitHub",
}
BADGE_NAMES = tuple(BADGE_LABELS)
PALETTE = {
    "blue": "#2563eb",
    "green": "#238636",
    "orange": "#b45309",
    "red": "#c62828",
    "purple": "#7c3aed",
    "gray": "#626b77",
    "cyan": "#0e7490",
    "yellow": "#a16207",
    "pink": "#be185d",
    "black": "#24292f",
}
# Older links remain valid, but these two colors are not shown in the editor.
LEGACY_PALETTE = {"teal": "#0f766e", "indigo": "#4338ca"}
DEFAULT_COLOR = "blue"
LABEL_COLOR = "#555555"


def download_catalog(url: str = CATALOG_URL) -> dict:
    request = Request(url, headers={
        "User-Agent": "windhawk-badges/1.2 (open-source catalog badge generator)",
        "Accept": "application/json",
    })
    with urlopen(request, timeout=45) as response:
        payload = response.read(15_000_001)
    if len(payload) > 15_000_000:
        raise ValueError("Catalog exceeds the 15 MB limit")
    return json.loads(payload)


def safe_string(value: object, default: str = "unknown", limit: int = 140) -> str:
    return str(value).strip()[:limit] if isinstance(value, str) and value.strip() else default


def valid_count(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def rating_from_details(details: dict) -> tuple[str, float | None]:
    breakdown = details.get("ratingBreakdown")
    if not isinstance(breakdown, list) or len(breakdown) != 5:
        return "not rated", None
    if any(valid_count(v) is None for v in breakdown):
        return "not rated", None
    total = sum(breakdown)
    if not total:
        return "not rated", None
    mean = sum(stars * count for stars, count in enumerate(breakdown, 1)) / total
    return f"{mean:.1f}/5", round(mean, 4)


def as_date(value: object) -> str:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
        return "unknown"
    try:
        return datetime.fromtimestamp(value / 1000, timezone.utc).strftime("%Y-%m-%d")
    except (ValueError, OverflowError, OSError):
        return "unknown"


GITHUB_PATH_RE = re.compile(r"^/[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*$")


def github_info(raw: object) -> tuple[str, str] | None:
    """Read the catalog's GitHub profile/repository URL without guessing a repo."""
    if not isinstance(raw, str) or len(raw) > 400:
        return None
    try:
        parsed = urlsplit(raw.strip())
        host = parsed.hostname
        port = parsed.port
    except ValueError:
        return None
    if (parsed.scheme not in ("http", "https")
            or host not in ("github.com", "www.github.com")
            or parsed.username or parsed.password or port is not None):
        return None
    path = parsed.path.rstrip("/")
    if not GITHUB_PATH_RE.fullmatch(path):
        return None
    username = path.split("/")[1]
    return f"https://github.com/{username}", username


def normalize_mods(catalog: dict) -> list[dict]:
    mods = catalog.get("mods")
    if not isinstance(mods, dict) or not mods:
        raise ValueError("Official catalog has no mods or has an unexpected structure")
    normalized = []
    for mod_id, entry in mods.items():
        if not isinstance(mod_id, str) or not MOD_ID_RE.fullmatch(mod_id) or not isinstance(entry, dict):
            continue
        details = entry.get("details") or {}
        metadata = entry.get("metadata") or {}
        if not isinstance(details, dict) or not isinstance(metadata, dict):
            continue
        rating_text, rating = rating_from_details(details)
        breakdown = details.get("ratingBreakdown", [])
        votes = valid_count(details.get("ratingUsers"))
        if votes is None and rating is not None:
            votes = sum(breakdown)
        architecture = metadata.get("architecture")
        if isinstance(architecture, list):
            architecture = ", ".join(safe_string(x, "", 20) for x in architecture if isinstance(x, str))
        github = github_info(metadata.get('github'))
        values = {
            "users": f"{details['users']:,}" if valid_count(details.get("users")) is not None else "unknown",
            "rating": rating_text,
            "votes": f"{votes:,}" if votes is not None else "unknown",
            "reviews": f"{details['reviews']:,}" if valid_count(details.get("reviews")) is not None else "unknown",
            "version": safe_string(metadata.get("version"), limit=40),
            "author": safe_string(metadata.get("author"), limit=44),
            "updated": as_date(details.get("updated")),
            "published": as_date(details.get("published")),
            "license": safe_string(metadata.get("license"), "not specified", 40),
            "architecture": safe_string(architecture, "not specified", 50),
            "github": github[1] if github else "not specified",
        }
        normalized.append({
            "id": mod_id,
            "name": safe_string(metadata.get("name"), mod_id),
            "url": f"https://windhawk.net/mods/{mod_id}",
            "githubUrl": github[0] if github else None,
            "values": values,
        })
    if not normalized:
        raise ValueError("No valid mods found")
    return sorted(normalized, key=lambda mod: mod["id"])


def text_width(value: str) -> int:
    return int(sum(7.9 if c in "MW@%" else 6.6 if c.isupper() else 6.3 if c.isdigit() else 5.8 if c in "ilI .,:!|" else 6.6 for c in value) + 1)


def render_badge(label: str, value: str, color: str, label_color: str = LABEL_COLOR) -> str:
    # Limit labels and values to prevent exceptionally wide or oversized SVGs.
    label, value = label[:60], value[:52]
    left_width = max(45, text_width(label) + 22)
    right_width = max(38, text_width(value) + 22)
    width = left_width + right_width
    title = escape(f"{label}: {value}", quote=True)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="22" '
        f'viewBox="0 0 {width} 22" role="img" aria-label="{title}">\n'
        f'  <title>{title}</title>\n'
        f'  <rect width="{width}" height="22" rx="3" fill="{label_color}"/>\n'
        f'  <path d="M{left_width} 0h{right_width}v22h-{right_width}z" fill="{color}"/>\n'
        '  <g fill="#ffffff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">\n'
        f'    <text x="{left_width / 2:g}" y="15">{escape(label, quote=True)}</text>\n'
        f'    <text x="{left_width + right_width / 2:g}" y="15">{escape(value, quote=True)}</text>\n'
        '  </g>\n'
        '</svg>\n'
    )


def badges_for(mod: dict, color_name: str = DEFAULT_COLOR) -> dict[str, str]:
    color = PALETTE[color_name]
    return {kind: render_badge(label, mod["values"][kind], color) for kind, label in BADGE_LABELS.items()}


def build(catalog: dict, output: Path, site_source: Path) -> int:
    mods = normalize_mods(catalog)
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(site_source, output)
    badge_root = output / "badges"
    for mod in mods:
        mod_path = badge_root / mod["id"]
        mod_path.mkdir(parents=True, exist_ok=True)
        for kind, label in BADGE_LABELS.items():
            value = mod["values"][kind]
            # Keep original URLs stable; additional color variants live in subfolders.
            (mod_path / f"{kind}.svg").write_text(render_badge(label, value, PALETTE[DEFAULT_COLOR]), encoding="utf-8")
            color_dir = mod_path / kind
            color_dir.mkdir(exist_ok=True)
            for color_name, color in {**PALETTE, **LEGACY_PALETTE}.items():
                (color_dir / f"{color_name}.svg").write_text(render_badge(label, value, color), encoding="utf-8")
    data_dir = output / "data"
    data_dir.mkdir(exist_ok=True)
    data = {
        "source": CATALOG_URL,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "totalMods": len(mods),
        "kinds": BADGE_LABELS,
        "palette": PALETTE,
        "defaultColor": DEFAULT_COLOR,
        "mods": mods,
    }
    (data_dir / "catalog.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (output / ".nojekyll").touch()
    return len(mods)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("dist"))
    parser.add_argument("--site", type=Path, default=Path(__file__).resolve().parents[1] / "site")
    parser.add_argument("--catalog-file", type=Path)
    args = parser.parse_args()
    try:
        catalog = json.loads(args.catalog_file.read_text(encoding="utf-8")) if args.catalog_file else download_catalog()
        count = build(catalog, args.output.resolve(), args.site.resolve())
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
        print(f"Generation failed: {exc}", file=sys.stderr)
        return 1
    print(f"Generated {count} mods and {count * len(BADGE_NAMES) * (1 + len(PALETTE) + len(LEGACY_PALETTE)):,} SVG badges")
    return 0


if __name__ == "__main__":
    sys.exit(main())
