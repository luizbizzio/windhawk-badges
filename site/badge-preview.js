// Copyright 2026 Luiz Bizzio
// SPDX-License-Identifier: Apache-2.0

/**
 * Local SVG previews used by GitHub Pages.
 * Keep the renderer in sync with worker/index.js; tests compare exact SVG output.
 * No HTTP requests are issued to Cloudflare when selecting mods, colors or styles.
 */
const STYLES = new Set(['classic', 'flat', 'flat-square', 'rounded', 'pill']);
const SIZES = new Set(['normal', 'compact']);
// Official Windhawk logo vector, from ramensoftware/windhawk (logo-white.svg).
// The shape is embedded in SVGs so no extra image request is required.
const WINDHAWK_LOGO_PATH = 'm208.00003,254.6l3.6,-0.6c-20.9,9.9 -49,30.4 -67.8,44.9c-30.4,23.3 -54.1,57.9 -74,92.9c84.1,-45.7 161.8,-52.4 178.5,-48.2c0.2,0.1 -7.7,45.5 -36.7,83.6c-30.5,39.9 -82.2,72.4 -82.2,72.4c18.9,2.2 37.9,2.6 56.7,0.8c32.2,-3 65.3,-12.4 91.5,-34.7c11.6,-9.9 32.8,-39 30.5,-34.8c-12.5,31.2 -14.3,66.7 -12.3,100.6c1.1,19.9 3.2,39.6 9.1,58.4c5,16.1 12.3,31.2 20.6,45.3l8.2,6.5c0.1,-0.7 -7.9,-111.8 48.5,-166.7c102.6,-99.8 216,-4.9 216,-4.9s-4.5,-75.2 -89.6,-111.7c203.8,-18.8 159.7,102 159.7,102s69.8,-29.8 59.1,-114.9c-9.7,-77 -85,-95.3 -100.7,-98.3c-13.2,-21.7 -113.2,-186.8 -279.8,-121.9c-180.6,70.3 -326.9,53.6 -326.9,53.6c21.5,24.7 46.7,44.6 74.1,58.7c35.6,18.4 75.3,23.8 113.9,17zm314,-15.9c6.3,2.1 12.7,4.2 19.1,6.2c-0.5,6.1 -4.8,10.9 -10,10.9c-5.5,0 -10.1,-5.4 -10.1,-12.1c0.1,-1.8 0.4,-3.5 1,-5zm-40.1,2.4c0,-5.1 0.9,-9.9 2.6,-14.4c3.8,0.9 7.6,1.8 11.2,3c3.8,1.2 7.5,2.5 11.3,3.8c-1.1,3.1 -1.8,6.5 -1.8,10.1c0,15.4 11.6,27.9 25.9,27.9c12.6,0 23,-9.7 25.4,-22.5c2.7,0.6 5.3,1.3 8,1.8c-4.4,18.5 -20.9,32.3 -40.7,32.3c-23.2,0 -41.9,-18.8 -41.9,-42z';
const ICONS = new Set(['none', 'windhawk']);

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

