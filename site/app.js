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
const workerSetting = (window.WINDHAWK_BADGES_WORKER_URL || '').trim().replace(/\/+$/, '');
const workerBase = /^https:\/\/[^/]+$/i.test(workerSetting) ? workerSetting : null;
const styleSelect = document.getElementById('badgeStyle');
const sizeSelect = document.getElementById('badgeSize');
const labelsSelect = document.getElementById('badgeLabels');
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
let chosenStyle = 'classic';
let chosenSize = 'normal';
let chosenLabelMode = 'full';

function badgeUrl(modId, kind, color) {
  const path = palette[color]
    ? `badges/${encodeURIComponent(modId)}/${encodeURIComponent(kind)}/${encodeURIComponent(color)}.svg`
    : `badges/${encodeURIComponent(modId)}/${encodeURIComponent(kind)}.svg`;
  // Pages has legacy static badges, but all custom appearance features need the Worker.
  if (!workerBase && (kind === 'mod' || !palette[color] || chosenLabelColor !== '#555555' ||
      chosenStyle !== 'classic' || chosenSize !== 'normal' || chosenLabelMode !== 'full')) return null;
  const url = new URL(path, workerBase ? workerBase + '/' : baseUrl);
  if (!palette[color]) url.searchParams.set('color', color.replace('#', ''));
  if (chosenLabelColor !== '#555555' && kind !== 'mod') url.searchParams.set('labelColor', chosenLabelColor.slice(1));
  if (chosenStyle !== 'classic') url.searchParams.set('style', chosenStyle);
  if (chosenSize !== 'normal') url.searchParams.set('size', chosenSize);
  if (chosenLabelMode !== 'full' && kind !== 'mod') url.searchParams.set('labelMode', chosenLabelMode);
  if (kind === 'github') url.searchParams.set('v', '2');
  return url.href;
}
function markdownFor(kind) {
  const link = badgeUrl(chosenMod.id, kind, chosenColor);
  const alt = kind === 'mod' ? chosenMod.name : kinds[kind];
  const destination = kind === 'github' ? chosenMod.githubUrl : chosenMod.url;
  return link && destination ? `[![${alt.replaceAll('[', '\[').replaceAll(']', '\]')}](${link})](${destination})` : '';
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
for (const [element, key] of [[styleSelect, 'style'], [sizeSelect, 'size'], [labelsSelect, 'labels']]) {
  element.addEventListener('change', () => {
    if (key === 'style') chosenStyle = styleSelect.value;
    else if (key === 'size') chosenSize = sizeSelect.value;
    else chosenLabelMode = labelsSelect.value;
    renderBadges();
  });
}
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
  let availableCount = 0;
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
    preview.alt = kind === 'mod' ? chosenMod.name : `${label}: ${chosenMod.values?.[kind] ?? 'not specified'}`;
    preview.loading = 'lazy';
    if (url) preview.src = url;
    const actions = document.createElement('div');
    actions.className = 'badge-actions';
    const md = button('Markdown', () => markdownFor(kind), true);
    const urlButton = button('URL', () => badgeUrl(chosenMod.id, kind, chosenColor));
    md.disabled = !url || (kind === 'github' && !chosenMod.githubUrl);
    if (kind === 'github' && !chosenMod.githubUrl) md.title = 'No GitHub link in the Windhawk catalog';
    urlButton.disabled = !url;
    actions.append(md, urlButton);
    if (url) {
      availableCount++;
      const destination = kind === 'github' ? chosenMod.githubUrl : (kind === 'mod' ? chosenMod.url : null);
      if (destination) {
        const clickableBadge = document.createElement('a');
        clickableBadge.href = destination;
        clickableBadge.target = '_blank';
        clickableBadge.rel = 'noopener noreferrer';
        clickableBadge.className = 'badge-preview-link';
        clickableBadge.title = kind === 'github' ? 'Open the GitHub link from the Windhawk catalog' : 'Open mod on Windhawk';
        clickableBadge.append(preview);
        row.append(clickableBadge, actions);
      } else {
        row.append(preview, actions);
      }
    } else {
      const help = document.createElement('span');
      help.className = 'custom-unavailable';
      help.textContent = 'Requires a configured Worker URL.';
      row.append(help, actions);
    }
    card.append(heading, row);
    badgeGrid.append(card);
  }
  copyAll.disabled = availableCount === 0;
  status.textContent = availableCount === 0 ? 'This appearance needs the Cloudflare Worker.' : '';
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
    kinds = { ...catalog.kinds };
    delete kinds.mod;
    delete kinds.github;
    kinds.mod = 'Mod name';
    kinds.github = 'GitHub';
    palette = catalog.palette;
    chosenColor = catalog.defaultColor || 'blue';
    if (!palette[chosenColor] || Object.keys(palette).length !== 10) throw new Error('Invalid palette');
    renderColors();
    document.getElementById('updated').textContent = `${mods.length.toLocaleString()} mods · Updated ${new Date(catalog.generatedAt).toLocaleDateString()}`;
    const requested = new URL(window.location.href).searchParams.get('mod');
    chooseMod(mods.find(mod => mod.id === requested) || mods.find(mod => mod.id === 'taskbar-zones') || mods[0]);
  } catch (error) {
    status.textContent = `Could not load the catalog: ${error.message}. Check the GitHub Pages deployment.`;
  }
}
start();
