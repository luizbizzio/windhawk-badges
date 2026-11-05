# Windhawk Badges

Badges for mods from the public [Windhawk catalog](https://mods.windhawk.net/catalogs/en.json).

**Website:** https://luizbizzio.github.io/windhawk-badges/

An independent community project, not affiliated with Windhawk.

## Features

- 11 badges, including a single-color mod name badge that links to the mod page.
- 5 styles: Classic, Flat, Flat square, Rounded and Pill.
- Normal and compact sizes, full and short labels.
- 10 preset colors and custom six-digit HEX colors for the value and label.
- Copy the Markdown for a badge or all badges at once.
- Dynamic statistics sourced from Windhawk, with caching.

## Example

A compact, short-label badge with custom color:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/users.svg?style=pill&size=compact&labelMode=short&color=ff5733
```

A badge showing only the mod's name:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/mod.svg
```

The generated Markdown points to `https://windhawk.net/mods/<mod-id>`.

## Hosting

- **GitHub Pages** hosts the website and its catalog search data, updated daily by `.github/workflows/deploy.yml`.
- **Cloudflare Workers** generates dynamic SVGs. The catalog is cached for up to six hours; SVG responses are cacheable for one hour. GitHub can cache README images longer.
- Older badge URLs and named preset colors (including `teal` and `indigo`) still work, but only ten presets appear in the editor.

## Development

```bash
npm install
npm test
npm run dev
python -m unittest discover -s tests -v
```

Deploying the Worker uses `npm run deploy`; Cloudflare is already connected to `main` for automatic deployment. GitHub Actions publishes the site.

## License

MIT. See [LICENSE](LICENSE). Created by [Luiz Bizzio](https://github.com/luizbizzio).
