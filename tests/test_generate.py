import json
from pathlib import Path
import sys
import tempfile
import unittest
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from generate import BADGE_NAMES, badges_for, build, normalize_mods, rating_from_details

ROOT = Path(__file__).resolve().parents[1]


class GeneratorTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((ROOT / "tests" / "sample-catalog.json").read_text(encoding="utf-8"))

    def test_rating_uses_breakdown_not_rounded_source(self):
        label, rating = rating_from_details({"rating": 10, "ratingBreakdown": [0, 0, 1, 0, 9]})
        self.assertEqual(label, "4.8/5")
        self.assertEqual(rating, 4.8)
        self.assertEqual(rating_from_details({"ratingBreakdown": [0] * 5}), ("not rated", None))

    def test_all_badges_are_valid_xml_and_escaped(self):
        mods = normalize_mods(self.catalog)
        self.assertEqual(len(mods), 3)
        injected = next(mod for mod in mods if mod["id"] == "test-injection")
        badges = badges_for(injected)
        self.assertEqual(set(badges), set(BADGE_NAMES))
        for content in badges.values():
            ElementTree.fromstring(content)
        self.assertIn("&lt;script&gt;", badges["license"])
        self.assertNotIn("<script>", badges["license"])

    def test_generated_site_and_user_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "dist"
            count = build(self.catalog, out, ROOT / "site")
            self.assertEqual(count, 3)
            self.assertTrue((out / "index.html").exists())
            self.assertTrue((out / ".nojekyll").exists())
            self.assertTrue((out / "badges/taskbar-zones/users.svg").exists())
            manifest = json.loads((out / "data/catalog.json").read_text(encoding="utf-8"))
            mod = next(mod for mod in manifest["mods"] if mod["id"] == "taskbar-zones")
            self.assertEqual(mod["users"], 0)
            self.assertEqual(mod["ratingText"], "not rated")
            self.assertEqual(mod["license"], "GPL-3.0")

    def test_reject_invalid_catalog(self):
        with self.assertRaises(ValueError):
            normalize_mods({"mods": {}})


if __name__ == "__main__":
    unittest.main()
