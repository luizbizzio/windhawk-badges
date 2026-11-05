/**
 * Local SVG previews used by GitHub Pages.
 * Keep the renderer in sync with worker/index.js; tests compare exact SVG output.
 * No HTTP requests are issued to Cloudflare when selecting mods, colors or styles.
 */
const STYLES = new Set(['classic', 'flat', 'flat-square', 'rounded', 'pill']);
const SIZES = new Set(['normal', 'compact']);
const PALETTE = Object.freeze({ blue: '#2563eb' });
const DEFAULT_LABEL_COLOR = '#555555';
const HEX = /^#?[a-fA-F0-9]{6}$/;

function hexColor(value) {
  return typeof value === 'string' && HEX.test(value) ? `#${value.replace(/^#/, '').toLowerCase()}` : null;
}
function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function approximateWidth(value, scale = 1) {
  return Math.round([...value].reduce((sum, c) => sum + (/[MW@%]/.test(c) ? 8 : /[ilI .,:!|]/.test(c) ? 4 : /[0-9]/.test(c) ? 6.3 : 6.7), 0) * scale);
}

/** Render the original two-part badge by default; mod badges use a single segment. */
export function renderPreviewBadge(label, rawValue, color = PALETTE.blue, labelColor = DEFAULT_LABEL_COLOR, options = {}) {
  const style = options.style ?? 'classic';
  const size = options.size ?? 'normal';
  const single = options.single === true;
  if (!STYLES.has(style) || !SIZES.has(size)) throw new Error('Invalid appearance');
  if (!hexColor(color) || !hexColor(labelColor)) throw new Error('Invalid badge color');

  const compact = size === 'compact';
  const height = compact ? 18 : 22;
  const fontSize = compact ? 10 : 11;
  const baseline = compact ? 13 : 15;
  const horizontalPadding = compact ? 7 : 11;
  const scale = fontSize / 11;
  const titleText = String(label).slice(0, 60);
  const maxLength = single ? 72 : 52;
  const rawText = String(rawValue);
  const valueText = [...rawText].length > maxLength ? [...rawText].slice(0, maxLength - 1).join('') + '…' : rawText;
  const left = single ? 0 : Math.max(compact ? 32 : 45, approximateWidth(titleText, scale) + 2 * horizontalPadding);
  const right = Math.max(compact ? 26 : 38, approximateWidth(valueText, scale) + 2 * horizontalPadding);
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
  parts.push(`  <g fill="#ffffff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="${fontSize}" text-anchor="middle">`);
  if (!single) parts.push(`    <text x="${left / 2}" y="${baseline}">${xmlEscape(titleText)}</text>`);
  parts.push(`    <text x="${left + right / 2}" y="${baseline}">${xmlEscape(valueText)}</text>`);
  parts.push('  </g>', '</svg>', '');
  return parts.join('\n');
}

