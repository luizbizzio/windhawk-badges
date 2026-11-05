# Windhawk Badges

Create custom SVG badges for mods in the public [Windhawk catalog](https://mods.windhawk.net/catalogs/en.json). Choose a mod, change the colors and style, and copy the Markdown into your GitHub README.

**[Open the badge generator](https://luizbizzio.github.io/windhawk-badges/)**

[![Windhawk users](https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/users.svg?icon=windhawk&labelMode=short)](https://windhawk.net/mods/taskbar-zones)

Windhawk Badges is an independent community project. It is not affiliated with Windhawk.

## Quick start

1. Open the [Windhawk Badges website](https://luizbizzio.github.io/windhawk-badges/).
2. Search for a Windhawk mod and select it.
3. Choose a badge style, size, colors, labels, and icon.
4. Click **Markdown** on a badge or **Copy all Markdown**.
5. Paste the result into your README.

The editor shows the Windhawk icon by default. You can set **Icon** to **None** at any time.

## Available badges

| Badge | Information |
| --- | --- |
| Windhawk users | User count reported in the Windhawk catalog |
| Windhawk rating | Average rating, such as `4.8/5.0` |
| Rating votes | Number of rating votes |
| Reviews | Number of reviews |
| Version | Latest version in the catalog |
| Author | Mod author |
| Updated | Last update date |
| Published | Publication date |
| License | Mod license |
| Architecture | Supported architecture |
| Mod name | Name-only badge, linked to the mod page |
| GitHub | GitHub username, linked to the author's profile |

The available values come from the Windhawk catalog. User counts are not presented as download totals. A missing value may appear as `unknown` or `not specified`.

## Appearance

The website provides five styles: **Classic**, **Flat**, **Flat square**, **Rounded**, and **Pill**. You can use **Normal** or **Compact** size and **Full** or **Short** labels.

You can also choose one of ten preset colors or enter six-digit HEX colors for each part of the badge. The color controls use the full width of the editor for a compact layout.

| Option | What it changes | URL parameter |
| --- | --- | --- |
| Value background | Background of the value | `color` |
| Label background | Background of the label | `labelColor` |
| Icon background | Background behind the Windhawk logo (default `#000000`) | `iconBgColor` |
| Icon color | Color of the Windhawk logo (default `#ffffff`) | `iconColor` |
| Label text | Text color of the label | `labelTextColor` |
| Value text | Text color of the value or mod name | `valueTextColor` |
| Icon | Show or hide the Windhawk logo | `icon=windhawk` or `icon=none` |
| Style | Badge shape | `style` |
| Size | Badge height | `size` |
| Labels | Full or short text | `labelMode` |

Use HEX colors with six digits in URLs, for example `ff5733` or `#ff5733` (URL-encoded when needed). The website prepares the correct links for you.

**Compatibility:** the website starts with the Windhawk icon enabled, but old badge URLs still have no icon unless `icon=windhawk` is present. Existing Markdown links continue to work.

## Direct badge URLs

The URL format is:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/<mod-id>/<badge>.svg
```

For example, a compact rating badge with a Windhawk icon and custom colors:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/rating.svg?style=pill&size=compact&icon=windhawk&iconBgColor=000000&iconColor=ffffff&labelColor=555555&color=2563eb&labelTextColor=ffffff&valueTextColor=ffffff
```

A name-only badge:

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/mod.svg?icon=windhawk
```

You can also use named colors in the URL, such as `/users/blue.svg`. Previously supported URLs, including the older `teal` and `indigo` colors, remain available.

## How it works

- **GitHub Pages** hosts the website and search data. Its catalog is updated daily.
- **Local previews** render in your browser. Searching mods or changing badge settings does not make Cloudflare Worker requests.
- **Cloudflare Workers** serves the SVG links used in READMEs. The Worker caches the public catalog for up to six hours and returns cacheable SVG responses for one hour.
- **GitHub image caching** may keep README badge images longer. A badge shown in the editor can also briefly differ from the live Worker badge because their catalog refresh schedules are different.

The Windhawk logo vector is embedded in the generated SVG. No external image request is needed to show the icon.

## Development

Requirements: Node.js 22 or later, Python 3.12 or later, and a Cloudflare account to deploy your own Worker.

```bash
npm install
npm test
python -m unittest discover -s tests -v
```

To test the Worker locally:

```bash
npm run dev
```

To deploy your own Worker:

```bash
npm run deploy
```

GitHub Actions tests the code, builds the static catalog and legacy badge URLs, and publishes the website.

## Security

Please report security issues privately. See [SECURITY.md](SECURITY.md). Do not publish vulnerability details in a public GitHub issue.

## License and credits

Copyright 2026 [Luiz Bizzio](https://github.com/luizbizzio). This project uses the [Apache License 2.0](LICENSE).

Badge data comes from the [public Windhawk catalog](https://mods.windhawk.net/catalogs/en.json). The optional icon uses the [official Windhawk logo vector](https://github.com/ramensoftware/windhawk/blob/main/src/windhawk-frontend/apps/windhawk-frontend/src/app/panel/assets/logo-white.svg). Windhawk and its logo belong to their respective owners. This project is independent and is not endorsed by Windhawk.
