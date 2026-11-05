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
});
const PALETTE = Object.freeze({
  blue: '#2563eb', green: '#238636', orange: '#b45309', red: '#c62828',
  purple: '#7c3aed', gray: '#626b77', cyan: '#0e7490', teal: '#0f766e',
  yellow: '#a16207', pink: '#be185d', indigo: '#4338ca', black: '#24292f',
});
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
    mods.push({
      id,
      name: text(metadata.name, id, 140),
      url: `https://windhawk.net/mods/${id}`,
      values: {
        users: formatNumber(count(details.users)),
        rating: rating === null ? 'not rated' : `${rating.toFixed(1)}/5`,
        votes: formatNumber(votes),
        reviews: formatNumber(count(details.reviews)),
        version: text(metadata.version, 'unknown', 40),
        author: text(metadata.author, 'unknown', 44),
        updated: dateLabel(details.updated),
        published: dateLabel(details.published),
        license: text(metadata.license, 'not specified', 40),
        architecture: text(architecture, 'not specified', 50),
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
  return PALETTE[value.toLowerCase()] || hexColor(value) || fallback;
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
function approximateWidth(value) {
  return Math.round([...value].reduce((sum, c) => sum + (/[MW@%]/.test(c) ? 8 : /[ilI .,:!|]/.test(c) ? 4 : /[0-9]/.test(c) ? 6.3 : 6.7), 0));
}
export function renderBadge(label, rawValue, color = PALETTE.blue, labelColor = DEFAULT_LABEL_COLOR) {
  const titleText = String(label).slice(0, 60);
  const valueText = String(rawValue).slice(0, 52);
  if (!hexColor(color) || !hexColor(labelColor)) throw new Error('Invalid badge color');
  const left = Math.max(45, approximateWidth(titleText) + 22);
  const right = Math.max(38, approximateWidth(valueText) + 22);
  const width = left + right;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" viewBox="0 0 ${width} 22" role="img" aria-label="${xmlEscape(titleText + ': ' + valueText)}">\n` +
    `  <title>${xmlEscape(titleText)}: ${xmlEscape(valueText)}</title>\n` +
    `  <rect width="${width}" height="22" rx="3" fill="${labelColor}"/>\n` +
    `  <path d="M${left} 0h${right}v22h-${right}z" fill="${color}"/>\n` +
    '  <g fill="#ffffff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">\n' +
    `    <text x="${left / 2}" y="15">${xmlEscape(titleText)}</text>\n` +
    `    <text x="${left + right / 2}" y="15">${xmlEscape(valueText)}</text>\n` +
    '  </g>\n</svg>\n';
}

async function loadCatalog(request, context) {
  // A cache entry holds normalized data, not thousands of pre-rendered SVGs.
  // The cache is regional; on a cold request the Windhawk JSON is fetched once.
  const cache = globalThis.caches?.default;
  const cacheKey = new Request(new URL('/__windhawk_internal/catalog-v1', request.url));
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
      const svg = renderBadge(BADGE_LABELS[info.kind], mod.values[info.kind], color, labelColor);
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
