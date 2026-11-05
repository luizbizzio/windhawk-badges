# Windhawk Badges

Generate simple SVG badges for any mod in the public Windhawk catalog.

**Website:** https://luizbizzio.github.io/windhawk-badges/

Windhawk Badges is an independent community project. It is not affiliated with Windhawk.

## Badges

Choose from ten statistics:

- **Users:** users shown in the Windhawk catalog (not downloads)
- **Rating:** average from one-to-five-star votes
- **Rating votes:** number of users who rated the mod
- **Reviews:** written review count
- **Version:** current mod version
- **Author:** mod author
- **Updated:** date of the latest cataloged update
- **Published:** initial publication date
- **License:** license specified by the mod, when available
- **Architecture:** CPU architectures listed by the mod, when available

Each badge has six hosted colors: blue, green, orange, red, purple, and gray. You can also choose **custom HEX colors** for the value and label, then download an SVG to upload to your own repository.

Preset-color badges stay updated automatically. A downloaded custom SVG is **static** and does not update on its own.

## How to use

1. Open the [badge generator](https://luizbizzio.github.io/windhawk-badges/).
2. Find your Windhawk mod by name or ID.
3. Choose a badge type and a color.
4. Click **Copy Markdown** and paste it into your GitHub `README.md`.

You can also copy the SVG URL or download the image. For custom HEX colors, use **Download SVG** and upload that file to your own repository.

## Direct badge URLs

A badge uses this format:

`https://luizbizzio.github.io/windhawk-badges/badges/<mod-id>/<kind>.svg`

For example:

`https://luizbizzio.github.io/windhawk-badges/badges/taskbar-zones/users.svg`

For a specific hosted color, use:

`https://luizbizzio.github.io/windhawk-badges/badges/taskbar-zones/users/green.svg`

Supported badge kinds: `users`, `rating`, `votes`, `reviews`, `version`, `author`, `updated`, `published`, `license`, `architecture`.

Supported hosted colors: `blue`, `green`, `orange`, `red`, `purple`, `gray`.

The earlier `<kind>.svg` links remain supported.

## How it works

GitHub Actions downloads the [public Windhawk catalog](https://mods.windhawk.net/catalogs/en.json), generates SVG images for every listed mod, and publishes the site with GitHub Pages. It runs every day and after updates to the `main` branch.

The catalog is the only source for badge values. Missing values are displayed as `unknown` or `not specified`. Scores such as `defaultSorting` and `trendingSorting` are not used as public badges because they are internal sorting metrics.

The value on each SVG reflects the most recent successful deployment. It is not a live counter. Browsers and GitHub can cache images.

## Deploy your own copy

1. Fork the repository.
2. Open **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Open **Actions > Build and deploy badges** and select **Run workflow**.

For local development, use Python 3.12+ (no third-party libraries):

```bash
python -m unittest discover -s tests -v
python scripts/generate.py --catalog-file tests/sample-catalog.json --output dist
python -m http.server 8000 --directory dist
```

For a live catalog build, omit `--catalog-file`.

GitHub Pages serves static files, so arbitrary HEX colors cannot be generated at a stable hosted URL on request. Instead, the site offers a local SVG download for custom colors.

## License

MIT. See [LICENSE](LICENSE). Created by [Luiz Bizzio](https://github.com/luizbizzio).
