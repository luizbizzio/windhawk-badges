// Copyright 2026 Luiz Bizzio
// SPDX-License-Identifier: Apache-2.0

/** Windhawk Badges API, based on the public Windhawk mod catalog. */
const CATALOG_URL = 'https://mods.windhawk.net/catalogs/en.json';
const CATALOG_TTL = 6 * 60 * 60;
const BADGE_TTL = 60 * 60;
const BADGE_LABELS = Object.freeze({
  users: 'Windhawk users',
  rating: 'Windhawk rating',
  votes: 'Rating votes',
  reviews: 'Reviews',
  version: 'Version',
  author: 'Author',
  updated: 'Updated',
  published: 'Published',
  license: 'License',
  architecture: 'Architecture',
  mod: 'Mod name',
  github: 'GitHub',
});
const SHORT_LABELS = Object.freeze({
  users: 'Users', rating: 'Rating', votes: 'Votes',
});
const STYLES = new Set(['classic', 'flat', 'flat-square', 'rounded', 'pill']);
const SIZES = new Set(['normal', 'compact']);
// Official Windhawk logo vector, from ramensoftware/windhawk (logo-white.svg).
// The shape is embedded in SVGs so no extra image request is required.
const WINDHAWK_LOGO_PATH = 'm208.00003,254.6l3.6,-0.6c-20.9,9.9 -49,30.4 -67.8,44.9c-30.4,23.3 -54.1,57.9 -74,92.9c84.1,-45.7 161.8,-52.4 178.5,-48.2c0.2,0.1 -7.7,45.5 -36.7,83.6c-30.5,39.9 -82.2,72.4 -82.2,72.4c18.9,2.2 37.9,2.6 56.7,0.8c32.2,-3 65.3,-12.4 91.5,-34.7c11.6,-9.9 32.8,-39 30.5,-34.8c-12.5,31.2 -14.3,66.7 -12.3,100.6c1.1,19.9 3.2,39.6 9.1,58.4c5,16.1 12.3,31.2 20.6,45.3l8.2,6.5c0.1,-0.7 -7.9,-111.8 48.5,-166.7c102.6,-99.8 216,-4.9 216,-4.9s-4.5,-75.2 -89.6,-111.7c203.8,-18.8 159.7,102 159.7,102s69.8,-29.8 59.1,-114.9c-9.7,-77 -85,-95.3 -100.7,-98.3c-13.2,-21.7 -113.2,-186.8 -279.8,-121.9c-180.6,70.3 -326.9,53.6 -326.9,53.6c21.5,24.7 46.7,44.6 74.1,58.7c35.6,18.4 75.3,23.8 113.9,17zm314,-15.9c6.3,2.1 12.7,4.2 19.1,6.2c-0.5,6.1 -4.8,10.9 -10,10.9c-5.5,0 -10.1,-5.4 -10.1,-12.1c0.1,-1.8 0.4,-3.5 1,-5zm-40.1,2.4c0,-5.1 0.9,-9.9 2.6,-14.4c3.8,0.9 7.6,1.8 11.2,3c3.8,1.2 7.5,2.5 11.3,3.8c-1.1,3.1 -1.8,6.5 -1.8,10.1c0,15.4 11.6,27.9 25.9,27.9c12.6,0 23,-9.7 25.4,-22.5c2.7,0.6 5.3,1.3 8,1.8c-4.4,18.5 -20.9,32.3 -40.7,32.3c-23.2,0 -41.9,-18.8 -41.9,-42z';
const ICONS = new Set(['none', 'windhawk']);

const LABEL_MODES = new Set(['full', 'short']);
const PALETTE = Object.freeze({
  blue: '#2563eb', green: '#238636', orange: '#b45309', red: '#c62828',
  purple: '#7c3aed', gray: '#626b77', cyan: '#0e7490',
  yellow: '#a16207', pink: '#be185d', black: '#24292f',
});
// Old named color URLs stay valid, but are no longer offered as presets.
const LEGACY_COLORS = Object.freeze({ teal: '#0f766e', indigo: '#4338ca' });
const HEX = /^#?[a-fA-F0-9]{6}$/;
const MOD_ID = /^[a-z0-9][a-z0-9-]{0,95}$/;
const DEFAULT_LABEL_COLOR = '#555555';

function text(value, fallback = 'unknown', max = 100) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}
function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function formatNumber(value) {
  return value === null ? 'unknown' : value.toLocaleString('en-US');
}
function dateLabel(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().slice(0, 10);
}
function averageRating(details) {
  const bins = details.ratingBreakdown;
  if (!Array.isArray(bins) || bins.length !== 5 || bins.some(v => count(v) === null)) return null;
  const total = bins.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return bins.reduce((total, votes, index) => total + (index + 1) * votes, 0) / total;
}
/**
 * The catalog's github field can point to an author profile or to a mod repository.
 * Only accept actual github.com URLs. Never infer a repository from the mod ID.
 */
export function githubLink(raw) {
  if (typeof raw !== 'string' || raw.length > 400) return null;
  let link;
  try { link = new URL(raw.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(link.protocol) ||
      !['github.com', 'www.github.com'].includes(link.hostname.toLowerCase()) ||
      link.username || link.password || link.port) return null;
  const path = link.pathname.replace(/\/+$/, '');
  if (!/^\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(path)) return null;
  const username = path.split('/')[1];
  return { url: `https://github.com/${username}`, label: username };
}

export function normalizeCatalog(source, generatedAt = new Date().toISOString()) {
  if (!source || typeof source !== 'object' || !source.mods || typeof source.mods !== 'object' || Array.isArray(source.mods)) {
    throw new Error('Unexpected Windhawk catalog format');
  }
  const mods = [];
  for (const [id, item] of Object.entries(source.mods)) {
    if (!MOD_ID.test(id) || !item || typeof item !== 'object') continue;
    const metadata = item.metadata || {};
    const details = item.details || {};
    if (typeof metadata !== 'object' || typeof details !== 'object') continue;
    const rating = averageRating(details);
    const votes = count(details.ratingUsers) ?? (rating === null ? null : details.ratingBreakdown.reduce((a, b) => a + b, 0));
    const architecture = Array.isArray(metadata.architecture) ? metadata.architecture.filter(x => typeof x === 'string').join(', ') : metadata.architecture;
    const github = githubLink(metadata.github);
    mods.push({
      id,
      name: text(metadata.name, id, 140),
      url: `https://windhawk.net/mods/${id}`,
      githubUrl: github?.url ?? null,
      values: {
        mod: text(metadata.name, id, 140),
        users: formatNumber(count(details.users)),
        rating: rating === null ? 'not rated' : `${rating.toFixed(1)}/5.0`,
        votes: formatNumber(votes),
        reviews: formatNumber(count(details.reviews)),
        version: text(metadata.version, 'unknown', 40),
        author: text(metadata.author, 'unknown', 44),
        updated: dateLabel(details.updated),
        published: dateLabel(details.published),
        license: text(metadata.license, 'not specified', 40),
        architecture: text(architecture, 'not specified', 50),
        github: github?.label ?? 'not specified',
      },
    });
  }
  if (!mods.length) throw new Error('No valid Windhawk mods found');
  mods.sort((a, b) => a.id.localeCompare(b.id));
  return {
    source: CATALOG_URL,
    generatedAt,
    totalMods: mods.length,
    kinds: BADGE_LABELS,
    palette: PALETTE,
    defaultColor: 'blue',
    mods,
  };
}

function hexColor(value) {
  return typeof value === 'string' && HEX.test(value) ? `#${value.replace(/^#/, '').toLowerCase()}` : null;
}
export function resolveColor(value, fallback = null) {
  if (typeof value !== 'string' || value.length > 30) return fallback;
  return PALETTE[value.toLowerCase()] || LEGACY_COLORS[value.toLowerCase()] || hexColor(value) || fallback;
}
export function parseBadgePath(pathname) {
  const match = /^\/badges\/([a-z0-9][a-z0-9-]{0,95})\/([a-z]+)(?:\/([a-z0-9-]+))?\.svg$/.exec(pathname);
  if (!match || !MOD_ID.test(match[1]) || !Object.hasOwn(BADGE_LABELS, match[2])) return null;
  return { id: match[1], kind: match[2], preset: match[3] || 'blue' };
}
function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function approximateWidth(value, scale = 1) {
  return Math.round([...value].reduce((sum, c) => sum + (/[MW@%]/.test(c) ? 8 : /[ilI .,:!|]/.test(c) ? 4 : /[0-9]/.test(c) ? 6.3 : 6.7), 0) * scale);
}

/** Render the original two-part badge by default; mod badges use a single segment. */
export function renderBadge(label, rawValue, color = PALETTE.blue, labelColor = DEFAULT_LABEL_COLOR, options = {}) {
  const style = options.style ?? 'classic';
  const size = options.size ?? 'normal';
  const single = options.single === true;
  const icon = options.icon ?? 'none';
  if (!ICONS.has(icon)) throw new Error('Invalid badge icon');
  if (!STYLES.has(style) || !SIZES.has(size)) throw new Error('Invalid appearance');
  if (!hexColor(color) || !hexColor(labelColor)) throw new Error('Invalid badge color');

  const compact = size === 'compact';
  const height = compact ? 18 : 22;
  const fontSize = compact ? 10 : 11;
  const baseline = compact ? 13 : 15;
  const horizontalPadding = compact ? 7 : 11;
  const iconSize = compact ? 15 : 18;
  const iconSpace = icon === 'windhawk' ? iconSize + (compact ? 4 : 5) : 0;
  const scale = fontSize / 11;
  const titleText = String(label).slice(0, 60);
  const maxLength = single ? 72 : 52;
  const rawText = String(rawValue);
  const valueText = [...rawText].length > maxLength ? [...rawText].slice(0, maxLength - 1).join('') + '…' : rawText;
  const left = single ? 0 : Math.max(compact ? 32 : 45, approximateWidth(titleText, scale) + 2 * horizontalPadding + iconSpace);
  const right = Math.max(compact ? 26 : 38, approximateWidth(valueText, scale) + 2 * horizontalPadding + (single ? iconSpace : 0));
  const width = left + right;
  const radius = style === 'flat-square' ? 0 : style === 'pill' ? height / 2 : style === 'rounded' ? 7 : style === 'flat' ? 2 : 3;
  const aria = single ? valueText : `${titleText}: ${valueText}`;
  const title = xmlEscape(aria);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">`,
    `  <title>${title}</title>`,
    `  <defs><clipPath id="badge-clip"><rect width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>`,
    '  <g clip-path="url(#badge-clip)">',
    `    <rect width="${width}" height="${height}" fill="${single ? color : labelColor}"/>`,
  ];
  if (!single) parts.push(`    <path d="M${left} 0h${right}v${height}h-${right}z" fill="${color}"/>`);
  // Classic retains the familiar subtle darker bottom edge; flat stays fully solid.
  if (style === 'classic') parts.push(`    <path d="M0 ${height - 2}h${width}v2H0z" fill="#000000" fill-opacity="0.09"/>`);
  parts.push('  </g>');
  if (icon === 'windhawk') {
    const iconX = compact ? 6 : 7;
    const iconY = (height - iconSize) / 2;
    parts.push(`  <g data-windhawk-icon="true" transform="translate(${iconX} ${iconY}) scale(${iconSize / 750})"><path fill="#ffffff" d="${WINDHAWK_LOGO_PATH}"/></g>`);
  }
  parts.push(`  <g fill="#ffffff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="${fontSize}" text-anchor="middle">`);
  if (!single) parts.push(`    <text x="${iconSpace + (left - iconSpace) / 2}" y="${baseline}">${xmlEscape(titleText)}</text>`);
  parts.push(`    <text x="${left + (single ? iconSpace + (right - iconSpace) / 2 : right / 2)}" y="${baseline}">${xmlEscape(valueText)}</text>`);
  parts.push('  </g>', '</svg>', '');
  return parts.join('\n');
}

async function loadCatalog(request, context) {
  // A cache entry holds normalized data, not thousands of pre-rendered SVGs.
  // The cache is regional; on a cold request the Windhawk JSON is fetched once.
  const cache = globalThis.caches?.default;
  const cacheKey = new Request(new URL('/__windhawk_internal/catalog-v2', request.url));
  if (cache) {
    const saved = await cache.match(cacheKey);
    if (saved) return saved.json();
  }
  const upstream = await fetch(CATALOG_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'WindhawkBadges/1.3' },
    cf: { cacheTtl: CATALOG_TTL, cacheEverything: true },
  });
  if (!upstream.ok) throw new Error(`Windhawk catalog returned ${upstream.status}`);
  const raw = await upstream.json();
  const catalog = normalizeCatalog(raw);
  if (cache && context?.waitUntil) {
    const response = new Response(JSON.stringify(catalog), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${CATALOG_TTL}` },
    });
    context.waitUntil(cache.put(cacheKey, response));
  }
  return catalog;
}
function errorResponse(status, message) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env, context) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return errorResponse(405, 'Method not allowed');
    const url = new URL(request.url);
    if (url.pathname !== '/api/catalog' && !url.pathname.startsWith('/badges/')) {
      return errorResponse(404, 'Not found');
    }
    const info = url.pathname === '/api/catalog' ? null : parseBadgePath(url.pathname);
    if (url.pathname !== '/api/catalog' && !info) return errorResponse(404, 'Unknown badge type or mod ID');
    const colorInput = url.searchParams.get('color');
    const labelInput = url.searchParams.get('labelColor');
    const style = url.searchParams.get('style') ?? 'classic';
    const size = url.searchParams.get('size') ?? 'normal';
    const labelMode = url.searchParams.get('labelMode') ?? 'full';
    const icon = url.searchParams.get('icon') ?? 'none';
    if (info && (!STYLES.has(style) || !SIZES.has(size) || !LABEL_MODES.has(labelMode) || !ICONS.has(icon))) {
      return errorResponse(400, 'Invalid appearance option.');
    }
    const color = info ? resolveColor(colorInput ?? info.preset) : null;
    const labelColor = info ? resolveColor(labelInput ?? DEFAULT_LABEL_COLOR) : null;
    if (info && (!color || !labelColor)) return errorResponse(400, 'Invalid color. Use a named preset or six-digit HEX.');
    try {
      const catalog = await loadCatalog(request, context);
      if (url.pathname === '/api/catalog') {
        return new Response(request.method === 'HEAD' ? null : JSON.stringify(catalog), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=600, s-maxage=3600',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      const mod = catalog.mods.find(item => item.id === info.id);
      if (!mod) return errorResponse(404, 'Mod not found in public Windhawk catalog');
      const label = labelMode === 'short' ? (SHORT_LABELS[info.kind] || BADGE_LABELS[info.kind]) : BADGE_LABELS[info.kind];
      const value = info.kind === 'mod' ? mod.name : (mod.values?.[info.kind] ?? 'not specified');
      const svg = renderBadge(label, value, color, labelColor, { style, size, single: info.kind === 'mod', icon });
      return new Response(request.method === 'HEAD' ? null : svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': `public, max-age=${BADGE_TTL}, s-maxage=${BADGE_TTL}`,
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Windhawk Badges:', error instanceof Error ? error.message : 'Unknown error');
      return errorResponse(503, 'Badge data is temporarily unavailable');
    }
  },
};
