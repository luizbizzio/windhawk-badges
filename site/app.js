'use strict';

const search = document.getElementById('search');
const results = document.getElementById('results');
const kind = document.getElementById('kind');
const colors = document.getElementById('colors');
const customToggle = document.getElementById('customToggle');
const customColors = document.getElementById('customColors');
const valueColor = document.getElementById('valueColor');
const labelColor = document.getElementById('labelColor');
const preview = document.getElementById('badgePreview');
const markdownBox = document.getElementById('markdown');
const copyMarkdown = document.getElementById('copyMarkdown');
const copyUrl = document.getElementById('copyUrl');
const downloadSvg = document.getElementById('downloadSvg');
const modInfo = document.getElementById('modInfo');
const status = document.getElementById('status');
const baseUrl = new URL('./', window.location.href);
let allMods = [];
let kinds = {};
let palette = {};
let currentMod = null;
let currentColor = 'blue';
let currentUrl = '';
let customObjectUrl = null;

function clearObjectUrl() {
  if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
  customObjectUrl = null;
}
function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}
function textWidth(s) {
  return Math.floor([...s].reduce((sum, c) => sum + ('MW@%'.includes(c) ? 7.9 : /[A-Z]/.test(c) ? 6.6 : /[0-9]/.test(c) ? 6.3 : 'ilI .,:!|'.includes(c) ? 5.8 : 6.6), 0) + 1);
}
function customSvg(label, text, fg, bg) {
  label = String(label).slice(0, 60);
  text = String(text).slice(0, 52);
  const left = Math.max(45, textWidth(label) + 22);
  const right = Math.max(38, textWidth(text) + 22);
  const width = left + right;
  const title = escapeXml(`${label}: ${text}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" viewBox="0 0 ${width} 22" role="img" aria-label="${title}">\n<title>${title}</title>\n<rect width="${width}" height="22" rx="3" fill="${bg}"/>\n<path d="M${left} 0h${right}v22h-${right}z" fill="${fg}"/>\n<g fill="#ffffff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${left/2}" y="15">${escapeXml(label)}</text><text x="${left+right/2}" y="15">${escapeXml(text)}</text></g>\n</svg>\n`;
}
function badgeUrl(modId, type, color) {
  return new URL(`badges/${encodeURIComponent(modId)}/${encodeURIComponent(type)}/${encodeURIComponent(color)}.svg`, baseUrl).href;
}
function closeSearch() {
  results.hidden = true;
  search.setAttribute('aria-expanded', 'false');
}
function selectMod(mod) {
  currentMod = mod;
  search.value = mod.name;
  closeSearch();
  modInfo.textContent = `Mod ID: ${mod.id}`;
  const pageUrl = new URL(window.location.href);
  pageUrl.searchParams.set('mod', mod.id);
  history.replaceState(null, '', pageUrl);
  updatePreview();
}
function searchMods() {
  const q = search.value.trim().toLowerCase();
  results.replaceChildren();
  if (!q) { closeSearch(); return; }
  const found = allMods.filter(mod => mod.name.toLowerCase().includes(q) || mod.id.includes(q)).slice(0, 12);
  if (!found.length) {
    const no = document.createElement('div');
    no.className = 'empty-search';
    no.textContent = 'No mods found';
    results.append(no);
  }
  for (const mod of found) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'result-item';
    item.setAttribute('role', 'option');
    const title = document.createElement('span');
    title.textContent = mod.name;
    const id = document.createElement('small');
    id.textContent = mod.id;
    item.append(title, id);
    item.addEventListener('click', () => selectMod(mod));
    results.append(item);
  }
  results.hidden = false;
  search.setAttribute('aria-expanded', 'true');
}
function setupColors() {
  colors.replaceChildren();
  for (const [name, hex] of Object.entries(palette)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.backgroundColor = hex;
    button.title = name.charAt(0).toUpperCase() + name.slice(1);
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(name === currentColor));
    button.addEventListener('click', () => {
      currentColor = name;
      customToggle.checked = false;
      customColors.hidden = true;
      setupColors();
      updatePreview();
    });
    colors.append(button);
  }
}
function updatePreview() {
  clearObjectUrl();
  if (!currentMod || !kinds[kind.value]) return;
  const type = kind.value;
  const label = kinds[type];
  const text = currentMod.values[type];
  const isCustom = customToggle.checked;
  if (isCustom) {
    const svg = customSvg(label, text, valueColor.value, labelColor.value);
    customObjectUrl = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
    currentUrl = customObjectUrl;
    preview.src = currentUrl;
    markdownBox.value = 'Custom-color badges must be downloaded and uploaded to your repository before they can be linked in a README.';
  } else {
    currentUrl = badgeUrl(currentMod.id, type, currentColor);
    preview.src = currentUrl;
    markdownBox.value = `[![${label}](${currentUrl})](${currentMod.url})`;
  }
  preview.hidden = false;
  copyMarkdown.disabled = isCustom;
  copyUrl.disabled = isCustom;
  downloadSvg.disabled = false;
  status.textContent = isCustom ? 'Custom colors: download the SVG to use it in a README.' : '';
}
async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    const previous = button.textContent;
    button.textContent = 'Copied';
    window.setTimeout(() => { button.textContent = previous; }, 1200);
  } catch {
    window.prompt('Copy:', value);
  }
}
async function saveSvg() {
  if (!currentMod) return;
  const fileName = `${currentMod.id}-${kind.value}-${customToggle.checked ? 'custom' : currentColor}.svg`;
  let svg;
  if (customToggle.checked) {
    svg = customSvg(kinds[kind.value], currentMod.values[kind.value], valueColor.value, labelColor.value);
  } else {
    try {
      const response = await fetch(currentUrl);
      if (!response.ok) throw new Error('Badge not available');
      svg = await response.text();
    } catch {
      status.textContent = 'Could not download this badge. Check the deployment and try again.';
      return;
    }
  }
  const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

search.addEventListener('input', searchMods);
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeSearch();
  if (event.key === 'Enter' && !results.hidden) {
    const first = results.querySelector('button');
    if (first) { event.preventDefault(); first.click(); }
  }
});
document.addEventListener('click', event => {
  if (!results.contains(event.target) && event.target !== search) closeSearch();
});
kind.addEventListener('change', updatePreview);
customToggle.addEventListener('change', () => {
  customColors.hidden = !customToggle.checked;
  updatePreview();
});
valueColor.addEventListener('input', updatePreview);
labelColor.addEventListener('input', updatePreview);
copyMarkdown.addEventListener('click', () => copyText(markdownBox.value, copyMarkdown));
copyUrl.addEventListener('click', () => copyText(currentUrl, copyUrl));
downloadSvg.addEventListener('click', saveSvg);

async function start() {
  try {
    const response = await fetch(new URL('data/catalog.json', baseUrl), {cache:'no-cache'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.mods) || !catalog.mods.length) throw new Error('Catalog is empty');
    allMods = catalog.mods;
    kinds = catalog.kinds;
    palette = catalog.palette;
    currentColor = catalog.defaultColor || 'blue';
    for (const [key, label] of Object.entries(kinds)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      kind.append(option);
    }
    kind.disabled = false;
    setupColors();
    document.getElementById('updated').textContent = `${allMods.length.toLocaleString()} mods · Updated ${new Date(catalog.generatedAt).toLocaleDateString()}`;
    const requested = new URL(location.href).searchParams.get('mod');
    selectMod(allMods.find(mod => mod.id === requested) || allMods.find(mod => mod.id === 'taskbar-zones') || allMods[0]);
  } catch (error) {
    modInfo.textContent = `Catalog unavailable: ${error.message}. Check the GitHub Actions deployment.`;
    status.textContent = 'The site needs a successful badge generation workflow.';
  }
}
start();
