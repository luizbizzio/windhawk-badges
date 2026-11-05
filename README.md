# Windhawk Badges

Badges for mods from the public [Windhawk catalog](https://mods.windhawk.net/catalogs/en.json).

**Website:** https://luizbizzio.github.io/windhawk-badges/

An independent community project, not affiliated with Windhawk.

## Features

- 12 badges, including a mod name badge linked to Windhawk and a GitHub badge linked to the address provided in the official catalog.
- 5 styles: Classic, Flat, Flat square, Rounded and Pill.
- Normal and compact sizes, full and short labels.
- 10 preset colors and custom six-digit HEX colors for the value and label.
- Copy the Markdown for a badge or all badges at once.
- Dynamic statistics sourced from Windhawk, with caching.
- Badge previews render locally in the browser. Searching mods and changing colors, sizes or styles does not invoke Cloudflare Workers.

## Example

A compact, short-label badge with custom color:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/users.svg?style=pill&size=compact&labelMode=short&color=ff5733
```

A badge showing only the mod's name:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/mod.svg
```

The Mod name badge links to `https://windhawk.net/mods/<mod-id>`. The GitHub badge shows the username from `metadata.github` and links to that GitHub profile. If the metadata contains a repository URL, only the owner username is used. If no valid GitHub URL is provided, its Markdown action is disabled.

## Hosting

- **GitHub Pages** hosts the website and its catalog search data, updated daily by `.github/workflows/deploy.yml`.
- **Cloudflare Workers** generates dynamic SVGs for embedded badge URLs, not for the editor's previews. The catalog is cached for up to six hours; SVG responses are cacheable for one hour. GitHub can cache README images longer.
- The site's preview data comes from the GitHub Pages catalog (updated daily), so an editor preview may briefly show older statistics than the Worker badge.
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
