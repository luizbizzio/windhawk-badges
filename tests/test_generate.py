import json
from pathlib import Path
import sys
import tempfile
import unittest
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from generate import BADGE_NAMES, PALETTE, build, normalize_mods, rating_from_details

ROOT = Path(__file__).resolve().parents[1]


class GeneratorTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((ROOT / "tests" / "sample-catalog.json").read_text(encoding="utf-8"))

    def test_rating_uses_star_breakdown(self):
        label, rating = rating_from_details({"rating": 10, "ratingBreakdown": [0, 0, 1, 0, 9]})
        self.assertEqual((label, rating), ("4.8/5.0", 4.8))
        self.assertEqual(rating_from_details({"ratingBreakdown": [0, 0, 0, 0, 2]}), ("5.0/5.0", 5.0))
        self.assertEqual(rating_from_details({"ratingBreakdown": [0] * 5}), ("not rated", None))

    def test_catalog_normalization_preserves_data_without_emitting_svg_files(self):
        mods = normalize_mods(self.catalog)
        self.assertEqual(len(mods), 3)
        injected = next(mod for mod in mods if mod["id"] == "test-injection")
        self.assertEqual(injected["values"]["github"], "not specified")
        self.assertIsNone(injected["githubUrl"])
        self.assertIn("<script>", injected["values"]["license"])

    def test_complete_build_and_compatibility(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "dist"
            self.assertEqual(build(self.catalog, out, ROOT / "site"), 3)
            self.assertTrue((out / "index.html").exists())
            self.assertTrue((out / "sitemap.xml").exists())
            self.assertTrue((out / ".nojekyll").exists())
            self.assertFalse((out / "badges").exists(), "Site must not generate static badge files")
            self.assertTrue((out / "assets/favicon.svg").exists())
            self.assertTrue((out / "assets/windhawk-logo.svg").exists())
            ElementTree.parse(out / "assets/favicon.svg")
            ElementTree.parse(out / "assets/windhawk-logo.svg")
            self.assertEqual(len(list(out.rglob("*.svg"))), 2)
            manifest = json.loads((out / "data/catalog.json").read_text(encoding="utf-8"))
            mod = next(mod for mod in manifest["mods"] if mod["id"] == "taskbar-zones")
            self.assertEqual(mod["values"]["users"], "0")
            self.assertEqual(mod["values"]["rating"], "not rated")
            self.assertEqual(mod["values"]["license"], "GPL-3.0")
            self.assertEqual(mod["values"]["github"], "luizbizzio")
            self.assertEqual(mod["githubUrl"], "https://github.com/luizbizzio")
            self.assertEqual(len(BADGE_NAMES), 11)
            self.assertEqual(len(manifest["kinds"]), 11)
            self.assertEqual(len(PALETTE), 10)
            self.assertEqual(manifest["defaultColor"], "blue")
            self.assertNotIn("teal", manifest["palette"])
            self.assertNotIn("indigo", manifest["palette"])

    def test_site_seo_metadata_and_sitemap(self):
        index = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
        canonical = "https://windhawk-badges.luizbizzio.com/"
        self.assertIn(f'<link rel="canonical" href="{canonical}">', index)
        self.assertIn('property="og:title"', index)
        self.assertIn('property="og:description"', index)
        self.assertIn('name="twitter:card"', index)
        self.assertNotIn('content="noindex"', index)
        self.assertIn('type="application/ld+json"', index)
        # The generator must publish an actual sitemap for this subpath.
        sitemap = ElementTree.parse(ROOT / "site" / "sitemap.xml")
        urls = [element.text for element in sitemap.iter()
                if element.tag.endswith("loc")]
        self.assertEqual(urls, [canonical])

    def test_reject_invalid_catalog(self):
        with self.assertRaises(ValueError):
            normalize_mods({"mods": {}})


if __name__ == "__main__":
    unittest.main()
