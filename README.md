<div align="center">

<img src="site/assets/favicon.svg" alt="Windhawk Badges logo" width="76" height="76">

# Windhawk Badges

**Custom badges for your Windhawk mods.**

Create live SVG badges, choose your colors and style, and copy ready-to-use Markdown for your GitHub README.

**[Open the Badge Generator](https://luizbizzio.github.io/windhawk-badges/)**

[![GitHub Pages](https://github.com/luizbizzio/windhawk-badges/actions/workflows/deploy.yml/badge.svg)](https://github.com/luizbizzio/windhawk-badges/actions/workflows/deploy.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[![Windhawk users](https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/users.svg?icon=windhawk&labelMode=short)](https://windhawk.net/mods/taskbar-zones)
[![Windhawk rating](https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/rating.svg?icon=windhawk&labelMode=short)](https://windhawk.net/mods/taskbar-zones)
[![Mod version](https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/version.svg?icon=windhawk)](https://windhawk.net/mods/taskbar-zones)

</div>

Windhawk Badges is a free, independent community tool. It is **not affiliated with or endorsed by Windhawk**.

## Get started

1. Open the **[website](https://luizbizzio.github.io/windhawk-badges/)**.
2. Find your mod by name or ID.
3. Choose the style, colors, labels and icon.
4. Select **Markdown** or **URL** for a badge, or choose **Copy all Markdown**.
5. Paste the Markdown into your repository's README.

Your previews are made **in your browser**. Searching mods or changing the settings does not send badge requests to Cloudflare.

## Features

- **12 badge types** with live information from the official Windhawk catalog.
- **5 styles:** Classic, Flat, Flat square, Rounded and Pill.
- **2 sizes:** Normal and Compact.
- **2 label modes:** Full and Short.
- **10 preset colors** and custom HEX colors for each part of a badge.
- **Optional Windhawk icon** with its own background and icon color.
- **Ready-to-copy Markdown** with links to the mod page or GitHub profile.
- **Legacy URL support** for older badges and color presets.

### Badge types

| Badge | Shows |
| --- | --- |
| Users | Windhawk user count |
| Rating | Average rating, for example `4.8/5.0` |
| Votes | Number of rating votes |
| Reviews | Number of reviews |
| Version | Mod version |
| Author | Author's name |
| Updated | Last update date |
| Published | First publication date |
| License | Mod license |
| Architecture | Supported architecture |
| Mod name | Mod name without a separate label |
| GitHub | GitHub account name |

The numbers come from the **[Windhawk catalog](https://mods.windhawk.net/catalogs/en.json)**. User counts are not download totals. Some mods have missing information, which is shown as `unknown`, `not specified` or `not rated`.

## Customize a badge

Choose a preset or enter a six-digit HEX value. All color controls are available in the editor.

| Setting | URL parameter | Default |
| --- | --- | --- |
| Value background | `color` | `2563eb` |
| Label background | `labelColor` | `555555` |
| Icon background | `iconBgColor` | `000000` |
| Icon color | `iconColor` | `ffffff` |
| Label text | `labelTextColor` | `ffffff` |
| Value text | `valueTextColor` | `ffffff` |
| Style | `style` | `classic` |
| Size | `size` | `normal` |
| Labels | `labelMode` | `full` |
| Icon | `icon` | `none` for direct links |

The website **selects the Windhawk icon by default**. The Worker keeps `icon=none` as the default for older URLs, so existing badges do not change.

### Direct URL examples

**Standard badge**

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/users.svg
```

**Custom icon, colors and compact style**

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/rating.svg?icon=windhawk&iconBgColor=000000&iconColor=ffffff&color=2563eb&labelColor=555555&style=pill&size=compact&labelMode=short
```

**Mod name only**

```text
https://windhawk-badges.luizbizzio.workers.dev/badges/taskbar-zones/mod.svg?icon=windhawk
```

Replace `taskbar-zones` with any valid Windhawk mod ID. You can also use named-color URLs such as `/badges/taskbar-zones/users/green.svg`.

## How it works

| Part | Purpose |
| --- | --- |
| GitHub Pages | Hosts the editor and its search catalog |
| Local SVG renderer | Builds previews in your browser without Worker requests |
| Cloudflare Worker | Serves live badge SVG URLs used in READMEs |
| GitHub Actions | Runs tests and publishes the website |
| Dependabot | Checks dependencies and GitHub Actions for updates |

The website catalog updates daily. The Worker caches the upstream catalog for up to six hours, and its SVG responses are cacheable for one hour. GitHub may cache README images for longer. This means a preview and an embedded badge can briefly show different values.

Existing static badge links are kept for compatibility.

## Development

You need **Node.js 22+** and **Python 3.12+** to run the tests. Deploying a Worker also requires a Cloudflare account.

```bash
npm install
npm test
python -m unittest discover -s tests -p 'test_generate.py' -v
```

Run the Worker locally:

```bash
npm run dev
```

Deploy it to your Cloudflare account:

```bash
npm run deploy
```

The GitHub Actions workflow runs the tests and publishes GitHub Pages. Pull requests run the tests without publishing the site.

## Security

Please read [SECURITY.md](SECURITY.md) before reporting a security issue. Do not publish vulnerability details in public issues.

## License and attribution

Copyright © 2026 [Luiz Bizzio](https://github.com/luizbizzio). The project's original code is published under the **[Apache License 2.0](LICENSE)**.

The optional Windhawk icon uses the [official Windhawk SVG](https://github.com/ramensoftware/windhawk/blob/main/src/windhawk-frontend/apps/windhawk-frontend/src/app/panel/assets/logo-white.svg). Michael from Ramen Software confirmed by email on November 5, 2026, that the logo can be used for these badges. Thanks to the Windhawk team for allowing this.

The original Windhawk repository uses **GPL-3.0**. The logo and Windhawk name remain the property of their respective owner. The project's Apache 2.0 license applies to its original code and does not relicense the Windhawk logo or grant trademark rights.

Windhawk Badges is an unofficial project and is not sponsored, maintained or endorsed by Windhawk.
