# Windhawk Badges

A simple badge generator for mods in the public Windhawk catalog. Show users, ratings, version, author, reviews and other details in a GitHub README.

The code is hosted on GitHub. **Cloudflare Workers serves the public website and creates SVG badges on request.** The repository can remain private.

This is an independent community project, not affiliated with Windhawk.

## Features

- Ten badges: Users, Rating, Rating votes, Reviews, Version, Author, Updated, Published, License, Architecture.
- Choose from 12 preset colors or use any six-digit HEX value.
- Customize the value and label colors separately.
- Copy Markdown for one badge or all ten badges.
- Badges update automatically from the public Windhawk catalog, which is cached for up to six hours.
- No pre-generated SVG library and no API key needed.

## Setup with Cloudflare

1. Create a free Cloudflare account at https://dash.cloudflare.com/.
2. Open **Workers & Pages**, select **Create application**, and choose **GitHub**.
3. Authorize the **Cloudflare Workers and Pages** GitHub App. Give access only to `luizbizzio/windhawk-badges` if you prefer.
4. Select the private repository `luizbizzio/windhawk-badges`, branch `main`.
5. Set the project/Worker name to **`windhawk-badges`**. It must match `wrangler.jsonc`.
6. Leave the root directory at `/` (repository root). Set the build command to `npm test` and the deploy command to `npx wrangler deploy`.
7. Choose **Save and Deploy**. The website and badge API will share the `https://windhawk-badges.<your-subdomain>.workers.dev/` address.

Cloudflare Workers Builds can deploy automatically on each new commit to `main` after you connect the GitHub repository. No domain purchase or paid plan is required for normal free-tier use.

**Important:** the old `luizbizzio.github.io/windhawk-badges` links will not automatically redirect to the new Worker address. Replace badge links in existing READMEs once your Worker is live. GitHub Pages on private repositories also requires an eligible GitHub plan.

## Badge links

Use your Cloudflare Worker domain, for example:

`https://windhawk-badges.<your-subdomain>.workers.dev/badges/taskbar-zones/users.svg`

Select a preset color:

`https://windhawk-badges.<your-subdomain>.workers.dev/badges/taskbar-zones/users/green.svg`

Or use your own HEX colors:

`https://windhawk-badges.<your-subdomain>.workers.dev/badges/taskbar-zones/users.svg?color=ff5733&labelColor=24292f`

All three versions remain dynamic. The old `/badges/<mod-id>/<kind>.svg` and `/badges/<mod-id>/<kind>/<preset>.svg` routes are supported.

## Data and caching

- Source: https://mods.windhawk.net/catalogs/en.json.
- The Worker caches normalized catalog data for up to six hours per Cloudflare data center.
- Badge responses are cacheable for one hour. GitHub also caches README images, so updates may appear later.
- `users` means Windhawk catalog users, not file downloads.
- Ratings are weighted averages from the star breakdown. Missing values show `unknown` or `not specified`.
- The API endpoint `/api/catalog` provides the normalized data for the site.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run dev
```

To deploy manually after authenticating Wrangler, use `npm run deploy`. Normally, Cloudflare's Git integration handles deployments.

## License

MIT. See [LICENSE](LICENSE). Created by Luiz Bizzio.
