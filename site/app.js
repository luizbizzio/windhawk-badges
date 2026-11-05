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
let mods = [];
let kinds = {};
let palette = {};
let chosenMod = null;
let chosenColor = 'blue';

function badgeUrl(modId, kind, color) {
  return new URL(`badges/${encodeURIComponent(modId)}/${encodeURIComponent(kind)}/${encodeURIComponent(color)}.svg`, baseUrl).href;
}
function markdownFor(kind) {
  const link = badgeUrl(chosenMod.id, kind, chosenColor);
  return `[![${kinds[kind]}](${link})](${chosenMod.url})`;
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
  colorName.textContent = chosenColor.charAt(0).toUpperCase() + chosenColor.slice(1);
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
    preview.src = badgeUrl(chosenMod.id, kind, chosenColor);
    preview.alt = `${label}: ${chosenMod.values[kind] ?? 'unknown'}`;
    preview.loading = 'lazy';
    const actions = document.createElement('div');
    actions.className = 'badge-actions';
    actions.append(button('Markdown', () => markdownFor(kind), true), button('URL', () => badgeUrl(chosenMod.id, kind, chosenColor)));
    row.append(preview, actions);
    card.append(heading, row);
    badgeGrid.append(card);
  }
  copyAll.disabled = false;
  status.textContent = '';
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
  const all = Object.keys(kinds).map(markdownFor).join(' ');
  copyText(all, copyAll);
});
async function start() {
  try {
    const response = await fetch(new URL('data/catalog.json', baseUrl), {cache:'no-cache'});
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
    status.textContent = `Could not load the catalog: ${error.message}. Check the latest GitHub Actions deployment.`;
  }
}
start();
