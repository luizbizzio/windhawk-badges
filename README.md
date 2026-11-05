# Windhawk Badges

Free badges for **all mods in the public Windhawk catalog**. Add user counts, ratings, versions, or licenses to your GitHub README.

**This project is independent and is not affiliated with Windhawk.**

## Features

- Four badges: **Users**, **Rating**, **Version**, and **License**.
- Works for every mod in the public Windhawk catalog. No manual registration.
- A public website where anyone can find a mod and copy a badge.
- Uses **GitHub Actions and GitHub Pages**. No server or API key is needed.
- Refreshes from the official Windhawk catalog once per day.
- Uses SVG files, which work in GitHub READMEs.

## Deployment

This repository uses GitHub Actions to publish a static website on GitHub Pages.

1. In the repository, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**.
2. Open **Actions > Build and deploy badges** and run the workflow on `main` if a deployment has not already succeeded.
3. After a successful deployment, open [Windhawk Badges](https://luizbizzio.github.io/windhawk-badges/).

The workflow also runs after commits to `main` and on a daily schedule. If the workflow fails because Pages is not enabled yet, set the Pages source and run it again.

## How to use

1. Open the public badge website.
2. Search for a Windhawk mod by name or ID.
3. Click **Copy Markdown** next to the badge you want.
4. Paste the Markdown in your own GitHub `README.md`.

Example URL after the site is published:

`https://luizbizzio.github.io/windhawk-badges/badges/taskbar-zones/users.svg`

Other names are `rating.svg`, `version.svg`, and `license.svg`.

## How it works

The workflow in `.github/workflows/deploy.yml`:

1. Downloads `https://mods.windhawk.net/catalogs/en.json`.
2. Runs tests and generates SVG images with `scripts/generate.py`.
3. Publishes the `dist/` folder as a GitHub Pages website.

The workflow runs on a push to `main`, once a day, or when you run it manually. GitHub may delay scheduled workflows. Public repos may also have inactive schedules disabled after 60 days of no activity.

The official catalog may not change every day. Users and ratings are catalog values, not live downloads. Ratings come from the weighted average of the catalog's one-to-five-star votes. Mods with no votes display **not rated**. Missing licenses display **not specified**.

## Development and tests

Python 3.12 or newer is recommended. No packages are required.

```bash
python -m unittest discover -s tests -v
python scripts/generate.py --output dist
```

To generate an offline demo without downloading the official catalog:

```bash
python scripts/generate.py --catalog-file tests/sample-catalog.json --output dist
```

To preview the generated site locally:

```bash
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

## Limitations

- The data is refreshed daily, not in real time.
- GitHub and browser image caching can delay badge updates.
- If the source catalog is unavailable, the workflow fails and GitHub Pages keeps the previous successful deployment.
- The site provides badges only for mods already listed in the public catalog.
- Windhawk is a trademark of its respective owner. This is an independent community tool.

## License

Made by **Luiz Bizzio**. Released under the **MIT License**. See [LICENSE](LICENSE).
