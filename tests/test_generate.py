import json
from pathlib import Path
import sys
import tempfile
import unittest
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from generate import BADGE_NAMES, PALETTE, LEGACY_PALETTE, badges_for, build, normalize_mods, rating_from_details

ROOT = Path(__file__).resolve().parents[1]


class GeneratorTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((ROOT / "tests" / "sample-catalog.json").read_text(encoding="utf-8"))

    def test_rating_uses_star_breakdown(self):
        label, rating = rating_from_details({"rating": 10, "ratingBreakdown": [0, 0, 1, 0, 9]})
        self.assertEqual((label, rating), ("4.8/5", 4.8))
        self.assertEqual(rating_from_details({"ratingBreakdown": [0] * 5}), ("not rated", None))

    def test_all_badges_valid_xml_and_escaped(self):
        mods = normalize_mods(self.catalog)
        self.assertEqual(len(mods), 3)
        injected = next(mod for mod in mods if mod["id"] == "test-injection")
        for color_name in PALETTE:
            badges = badges_for(injected, color_name)
            self.assertEqual(set(badges), set(BADGE_NAMES))
            for text in badges.values():
                ElementTree.fromstring(text)
            self.assertIn("&lt;script&gt;", badges["license"])
            self.assertNotIn("<script>", badges["license"])

    def test_complete_build_and_compatibility(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "dist"
            self.assertEqual(build(self.catalog, out, ROOT / "site"), 3)
            self.assertTrue((out / "index.html").exists())
            self.assertTrue((out / ".nojekyll").exists())
            self.assertTrue((out / "badges/taskbar-zones/users.svg").exists())
            self.assertTrue((out / "badges/taskbar-zones/users/red.svg").exists())
            self.assertTrue((out / "badges/recycle-bin-file-preview/author/green.svg").exists())
            manifest = json.loads((out / "data/catalog.json").read_text(encoding="utf-8"))
            mod = next(mod for mod in manifest["mods"] if mod["id"] == "taskbar-zones")
            self.assertEqual(mod["values"]["users"], "0")
            self.assertEqual(mod["values"]["rating"], "not rated")
            self.assertEqual(mod["values"]["license"], "GPL-3.0")
            self.assertEqual(len(BADGE_NAMES), 10)
            self.assertEqual(manifest["palette"]["blue"], "#2563eb")
            self.assertEqual(len(PALETTE), 10)
            self.assertNotIn("teal", manifest["palette"])
            self.assertNotIn("indigo", manifest["palette"])
            self.assertTrue((out / "badges/taskbar-zones/users/teal.svg").exists())
            self.assertTrue((out / "badges/taskbar-zones/users/indigo.svg").exists())
            self.assertEqual(len(list((out / "badges/taskbar-zones").rglob("*.svg"))), len(BADGE_NAMES) * (len(PALETTE) + len(LEGACY_PALETTE) + 1))
            self.assertEqual(len(list(out.rglob("*.svg"))), 3 * len(BADGE_NAMES) * (len(PALETTE) + len(LEGACY_PALETTE) + 1))
            self.assertIn('fill="#24292f"', (out / "badges/taskbar-zones/users/black.svg").read_text())

    def test_reject_invalid_catalog(self):
        with self.assertRaises(ValueError):
            normalize_mods({"mods": {}})


if __name__ == "__main__":
    unittest.main()
