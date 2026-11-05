'use strict';

const search = document.getElementById('search');
const results = document.getElementById('results');
const colors = document.getElementById('colors');
const colorName = document.getElementById('colorName');
const badgeGrid = document.getElementById('badgeGrid');
const copyAll = document.getElementById('copyAll');
const status = document.getElementById('status');
const selectedMod = document.getElementById('selectedMod');
const baseUrl = new URL('./', window.location.href);
// Set in config.js after the Cloudflare Worker is deployed.
// Until then, preset badges use the existing GitHub Pages SVGs.
const workerSetting = (window.WINDHAWK_BADGES_WORKER_URL || '').trim().replace(/\/+$/, '');
const workerBase = /^https:\/\/[^/]+$/i.test(workerSetting) ? workerSetting : null;
const valueHex = document.getElementById('valueHex');
const valuePicker = document.getElementById('valuePicker');
const labelHex = document.getElementById('labelHex');
const labelPicker = document.getElementById('labelPicker');
let mods = [];
let kinds = {};
let palette = {};
let chosenMod = null;
let chosenColor = 'blue';
let chosenLabelColor = '#555555';

function badgeUrl(modId, kind, color) {
  const path = palette[color]
    ? `badges/${encodeURIComponent(modId)}/${encodeURIComponent(kind)}/${encodeURIComponent(color)}.svg`
    : `badges/${encodeURIComponent(modId)}/${encodeURIComponent(kind)}.svg`;
  if (!workerBase && (!palette[color] || chosenLabelColor !== '#555555')) return null;
  const url = new URL(path, workerBase ? workerBase + '/' : baseUrl);
  if (!palette[color]) url.searchParams.set('color', color.replace('#', ''));
  if (chosenLabelColor !== '#555555') url.searchParams.set('labelColor', chosenLabelColor.slice(1));
  return url.href;
}
function markdownFor(kind) {
  const link = badgeUrl(chosenMod.id, kind, chosenColor);
  return link ? `[![${kinds[kind]}](${link})](${chosenMod.url})` : '';
}
function closeResults() {
  results.hidden = true;
  search.setAttribute('aria-expanded', 'false');
}
function chooseMod(mod) {
  chosenMod = mod;
  search.value = mod.name;
  document.getElementById('selectedName').textContent = mod.name;
  document.getElementById('selectedId').textContent = mod.id;
  document.getElementById('modLink').href = mod.url;
  selectedMod.hidden = false;
  closeResults();
  const current = new URL(window.location.href);
  current.searchParams.set('mod', mod.id);
  history.replaceState(null, '', current);
  renderBadges();
}
function searchMods() {
  const q = search.value.trim().toLowerCase();
  results.replaceChildren();
  if (!q) { closeResults(); return; }
  const matching = mods.filter(mod => mod.name.toLowerCase().includes(q) || mod.id.includes(q)).slice(0, 14);
  if (!matching.length) {
    const message = document.createElement('div');
    message.className = 'empty-search';
    message.textContent = 'No mods found';
    results.append(message);
  }
  for (const mod of matching) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-item';
    button.setAttribute('role', 'option');
    const name = document.createElement('span');
    name.textContent = mod.name;
    const id = document.createElement('small');
    id.textContent = mod.id;
    button.append(name, id);
    button.addEventListener('click', () => chooseMod(mod));
    results.append(button);
  }
  results.hidden = false;
  search.setAttribute('aria-expanded', 'true');
}
function renderColors() {
  colors.replaceChildren();
  colorName.textContent = palette[chosenColor] ? chosenColor.charAt(0).toUpperCase() + chosenColor.slice(1) : `Custom ${chosenColor}`;
  valueHex.value = palette[chosenColor] || chosenColor;
  valuePicker.value = palette[chosenColor] || chosenColor;
  labelHex.value = chosenLabelColor;
  labelPicker.value = chosenLabelColor;
  for (const [name, hex] of Object.entries(palette)) {
    const button = document.createElement('button');
    button.className = 'swatch';
    button.type = 'button';
    button.style.background = hex;
    button.title = name.charAt(0).toUpperCase() + name.slice(1);
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(name === chosenColor));
    button.addEventListener('click', () => {
      chosenColor = name;
      renderColors();
      renderBadges();
    });
    colors.append(button);
  }
}
function validHex(raw) {
  const value = raw.trim();
  return /^#?[0-9a-f]{6}$/i.test(value) ? '#' + value.replace(/^#/, '').toLowerCase() : null;
}
function applyValueHex(raw) {
  const hex = validHex(raw);
  if (!hex) return;
  chosenColor = hex;
  renderColors();
  renderBadges();
}
function applyLabelHex(raw) {
  const hex = validHex(raw);
  if (!hex) return;
  chosenLabelColor = hex;
  renderColors();
  renderBadges();
}
valuePicker.addEventListener('input', () => applyValueHex(valuePicker.value));
valueHex.addEventListener('change', () => {
  if (validHex(valueHex.value)) applyValueHex(valueHex.value);
  else valueHex.value = palette[chosenColor] || chosenColor;
});
labelPicker.addEventListener('input', () => applyLabelHex(labelPicker.value));
labelHex.addEventListener('change', () => {
  if (validHex(labelHex.value)) applyLabelHex(labelHex.value);
  else labelHex.value = chosenLabelColor;
});
function button(label, action, isPrimary = false) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = isPrimary ? 'button button-primary' : 'button';
  element.textContent = label;
  element.addEventListener('click', () => copyText(action(), element));
  return element;
}
function renderBadges() {
  badgeGrid.replaceChildren();
  if (!chosenMod) return;
  for (const [kind, label] of Object.entries(kinds)) {
    const card = document.createElement('article');
    card.className = 'badge-card';
    const heading = document.createElement('span');
    heading.className = 'badge-heading';
    heading.textContent = label;
    const row = document.createElement('div');
    row.className = 'badge-row';
    const preview = document.createElement('img');
    preview.className = 'badge-image';
    const url = badgeUrl(chosenMod.id, kind, chosenColor);
    preview.alt = `${label}: ${chosenMod.values[kind] ?? 'unknown'}`;
    preview.loading = 'lazy';
    if (url) preview.src = url;
    const actions = document.createElement('div');
    actions.className = 'badge-actions';
    const md = button('Markdown', () => markdownFor(kind), true);
    const urlButton = button('URL', () => badgeUrl(chosenMod.id, kind, chosenColor));
    md.disabled = !url;
    urlButton.disabled = !url;
    actions.append(md, urlButton);
    if (url) {
      row.append(preview, actions);
    } else {
      const help = document.createElement('span');
      help.className = 'custom-unavailable';
      help.textContent = 'Custom HEX needs the Cloudflare Worker URL.';
      row.append(help, actions);
    }
    card.append(heading, row);
    badgeGrid.append(card);
  }
  copyAll.disabled = !badgeUrl(chosenMod.id, Object.keys(kinds)[0], chosenColor);
  status.textContent = copyAll.disabled ? 'Custom HEX badges will work after the Worker URL is configured.' : '';
}
async function copyText(value, element) {
  try {
    await navigator.clipboard.writeText(value);
    const old = element.textContent;
    element.textContent = 'Copied';
    window.setTimeout(() => { element.textContent = old; }, 1200);
  } catch {
    window.prompt('Copy:', value);
  }
}
search.addEventListener('input', searchMods);
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeResults();
  if (event.key === 'Enter' && !results.hidden) {
    const first = results.querySelector('button');
    if (first) { event.preventDefault(); first.click(); }
  }
});
document.addEventListener('click', event => {
  if (!results.contains(event.target) && event.target !== search) closeResults();
});
copyAll.addEventListener('click', () => {
  if (!chosenMod) return;
  const all = Object.keys(kinds).map(markdownFor).filter(Boolean).join(' ');
  if (all) copyText(all, copyAll);
});
async function start() {
  try {
    const response = await fetch(new URL('data/catalog.json', baseUrl), {cache:'default'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.mods) || !catalog.mods.length) throw new Error('No mods found');
    mods = catalog.mods;
    kinds = catalog.kinds;
    palette = catalog.palette;
    chosenColor = catalog.defaultColor || 'blue';
    if (!palette[chosenColor] || Object.keys(palette).length !== 12) throw new Error('Invalid palette');
    renderColors();
    document.getElementById('updated').textContent = `${mods.length.toLocaleString()} mods · Updated ${new Date(catalog.generatedAt).toLocaleDateString()}`;
    const requested = new URL(window.location.href).searchParams.get('mod');
    chooseMod(mods.find(mod => mod.id === requested) || mods.find(mod => mod.id === 'taskbar-zones') || mods[0]);
  } catch (error) {
    status.textContent = `Could not load the catalog: ${error.message}. Check the GitHub Pages deployment.`;
  }
}
start();
