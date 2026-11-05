#!/usr/bin/env python3
# Copyright 2026 Luiz Bizzio
# SPDX-License-Identifier: Apache-2.0
"""Build a compact Windhawk mod catalog and static site for GitHub Pages."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
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
DEFAULT_COLOR = "blue"


def download_catalog(url: str = CATALOG_URL) -> dict:
    request = Request(url, headers={
        "User-Agent": "windhawk-badges/1.0 (open-source Windhawk catalog viewer)",
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
    return f"{mean:.1f}/5.0", round(mean, 4)


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


def build(catalog: dict, output: Path, site_source: Path) -> int:
    mods = normalize_mods(catalog)
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(site_source, output)
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
    print(f"Generated catalog for {count:,} mods (no static badge SVG files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
