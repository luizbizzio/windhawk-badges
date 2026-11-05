#!/usr/bin/env python3
"""Generate static Windhawk badges and the searchable catalog for GitHub Pages.

No third-party packages are required.
"""

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

CATALOG_URL = "https://mods.windhawk.net/catalogs/en.json"
MOD_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,95}$")
BADGE_NAMES = ("users", "rating", "version", "license")
BADGE_LABELS = {
    "users": "Windhawk users",
    "rating": "Windhawk rating",
    "version": "Windhawk version",
    "license": "license",
}


def download_catalog(url: str = CATALOG_URL) -> dict:
    request = Request(url, headers={"User-Agent": "windhawk-badges/1.0 (public GitHub Pages badge generator)", "Accept": "application/json"})
    with urlopen(request, timeout=45) as response:
        payload = response.read(15_000_001)
    if len(payload) > 15_000_000:
        raise ValueError("Catalog is larger than the 15 MB limit")
    return json.loads(payload)


def rating_from_details(details: dict) -> tuple[str, float | None]:
    # Raw details.rating is an integer on a 0-10 scale. Use the actual
    # one-to-five star vote breakdown to show a meaningful average.
    votes = details.get("ratingBreakdown")
    if not isinstance(votes, list) or len(votes) != 5:
        return "not rated", None
    if any(not isinstance(x, int) or isinstance(x, bool) or x < 0 for x in votes):
        return "not rated", None
    total = sum(votes)
    if total == 0:
        return "not rated", None
    average = sum(stars * count for stars, count in enumerate(votes, start=1)) / total
    return f"{average:.1f}/5", round(average, 4)


def safe_string(value: object, default: str = "unknown", limit: int = 140) -> str:
    return str(value).strip()[:limit] if isinstance(value, str) and value.strip() else default


def normalize_mods(catalog: dict) -> list[dict]:
    mods = catalog.get("mods")
    if not isinstance(mods, dict) or not mods:
        raise ValueError("The official catalog has no mods or an unexpected structure")
    result: list[dict] = []
    for mod_id, value in mods.items():
        if not isinstance(mod_id, str) or not MOD_ID_RE.fullmatch(mod_id) or not isinstance(value, dict):
            continue
        details = value.get("details") or {}
        metadata = value.get("metadata") or {}
        if not isinstance(details, dict) or not isinstance(metadata, dict):
            continue
        raw_users = details.get("users")
        users = raw_users if isinstance(raw_users, int) and not isinstance(raw_users, bool) and raw_users >= 0 else None
        rating_label, rating_value = rating_from_details(details)
        result.append({
            "id": mod_id,
            "name": safe_string(metadata.get("name"), mod_id),
            "users": users,
            "rating": rating_value,
            "ratingText": rating_label,
            "ratingUsers": sum(details.get("ratingBreakdown")) if rating_value is not None else 0,
            "version": safe_string(metadata.get("version")),
            "license": safe_string(metadata.get("license"), "not specified"),
            "url": f"https://windhawk.net/mods/{mod_id}",
        })
    if not result:
        raise ValueError("No valid mods were found in the catalog")
    return sorted(result, key=lambda item: item["id"])


def text_width(s: str) -> int:
    # Keep enough breathing room for common proportional sans-serif fonts.
    return int(sum(7.9 if c in "MW@%" else 6.6 if c.isupper() else 6.3 if c.isdigit() else 5.8 if c in "ilI .,:!|" else 6.6 for c in s) + 1)


def render_badge(label: str, value: str, color: str) -> str:
    left_width = max(45, text_width(label) + 22)
    right_width = max(38, text_width(value) + 22)
    total = left_width + right_width
    title = escape(f"{label}: {value}", quote=True)
    label_xml = escape(label, quote=True)
    value_xml = escape(value, quote=True)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total}" height="22" '
        f'viewBox="0 0 {total} 22" role="img" aria-label="{title}">\n'
        f'  <title>{title}</title>\n'
        f'  <rect width="{total}" height="22" rx="4" fill="#555"/>\n'
        f'  <path d="M{left_width} 0h{right_width}v22h-{right_width}z" fill="{color}"/>\n'
        '  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">\n'
        f'    <text x="{left_width / 2:g}" y="15">{label_xml}</text>\n'
        f'    <text x="{left_width + right_width / 2:g}" y="15">{value_xml}</text>\n'
        '  </g>\n'
        '</svg>\n'
    )


def badges_for(mod: dict) -> dict[str, str]:
    users = f'{mod["users"]:,}' if mod["users"] is not None else "unknown"
    rating_color = "#18864b" if mod["rating"] is not None and mod["rating"] >= 4 else "#007ec6" if mod["rating"] is not None else "#707070"
    return {
        "users": render_badge(BADGE_LABELS["users"], users, "#17864e" if mod["users"] is not None else "#707070"),
        "rating": render_badge(BADGE_LABELS["rating"], mod["ratingText"], rating_color),
        "version": render_badge(BADGE_LABELS["version"], mod["version"], "#2563eb"),
        "license": render_badge(BADGE_LABELS["license"], mod["license"], "#6d45a7"),
    }


def build(catalog: dict, output: Path, site_source: Path) -> int:
    mods = normalize_mods(catalog)
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(site_source, output)
    badge_root = output / "badges"
    data_root = output / "data"
    data_root.mkdir(parents=True, exist_ok=True)
    for mod in mods:
        mod_path = badge_root / mod["id"]
        mod_path.mkdir(parents=True, exist_ok=True)
        for badge_name, svg in badges_for(mod).items():
            (mod_path / f"{badge_name}.svg").write_text(svg, encoding="utf-8")
    manifest = {
        "source": CATALOG_URL,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "totalMods": len(mods),
        "mods": mods,
    }
    (data_root / "catalog.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (output / ".nojekyll").touch()
    return len(mods)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("dist"))
    parser.add_argument("--site", type=Path, default=Path(__file__).resolve().parents[1] / "site")
    parser.add_argument("--catalog-file", type=Path, help="Use a local catalog for tests or offline builds")
    args = parser.parse_args()
    try:
        catalog = json.loads(args.catalog_file.read_text(encoding="utf-8")) if args.catalog_file else download_catalog()
        count = build(catalog, args.output.resolve(), args.site.resolve())
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
        print(f"Generation failed: {exc}", file=sys.stderr)
        return 1
    print(f"Generated {count} mods and {count * len(BADGE_NAMES)} SVG badges into {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
