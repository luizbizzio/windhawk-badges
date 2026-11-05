'use strict';

const KINDS = ['users', 'rating', 'version', 'license'];
const LABELS = {users: 'Users', rating: 'Rating', version: 'Version', license: 'License'};
const search = document.getElementById('search');
const results = document.getElementById('results');
const status = document.getElementById('status');
const selected = document.getElementById('selected');
const badgeGrid = document.getElementById('badgeGrid');
const baseUrl = new URL('./', window.location.href);
let allMods = [];
let selectedMod = null;

function badgeUrl(modId, kind) {
  return new URL(`badges/${encodeURIComponent(modId)}/${kind}.svg`, baseUrl).href;
}

function closeResults() {
  results.hidden = true;
  search.setAttribute('aria-expanded', 'false');
}

function chooseMod(mod) {
  selectedMod = mod;
  search.value = mod.name;
  closeResults();
  status.textContent = '';
  selected.hidden = false;
  document.getElementById('selectedName').textContent = mod.name;
  document.getElementById('selectedId').textContent = mod.id;
  document.getElementById('windhawkLink').href = mod.url;
  badgeGrid.replaceChildren();
  for (const kind of KINDS) {
    const imgUrl = badgeUrl(mod.id, kind);
    const markdown = `[![${LABELS[kind]}](${imgUrl})](${mod.url})`;
    const card = document.createElement('article');
    card.className = 'badge-card';
    const top = document.createElement('div');
    top.className = 'badge-top';
    const title = document.createElement('span');
    title.className = 'badge-title';
    title.textContent = LABELS[kind];
    top.append(title);
    const image = document.createElement('img');
    image.src = imgUrl;
    image.alt = `${LABELS[kind]} badge for ${mod.name}`;
    image.loading = 'lazy';
    const link = document.createElement('div');
    link.className = 'badge-link';
    link.textContent = imgUrl;
    link.title = imgUrl;
    const actions = document.createElement('div');
    actions.className = 'badge-actions';
    const copyMd = document.createElement('button');
    copyMd.className = 'btn btn-primary';
    copyMd.textContent = 'Copy Markdown';
    copyMd.addEventListener('click', () => copyText(markdown, copyMd));
    const copyUrl = document.createElement('button');
    copyUrl.className = 'btn';
    copyUrl.textContent = 'Copy URL';
    copyUrl.addEventListener('click', () => copyText(imgUrl, copyUrl));
    actions.append(copyMd, copyUrl);
    card.append(top, image, link, actions);
    badgeGrid.append(card);
  }
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const previous = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = previous; }, 1400);
  } catch {
    // Clipboard writes may be blocked by browser permissions.
    window.prompt('Copy this text:', text);
  }
}

function showSearchResults() {
  const query = search.value.trim().toLowerCase();
  results.replaceChildren();
  if (!query) {
    closeResults();
    return;
  }
  const matching = allMods.filter(mod => mod.name.toLowerCase().includes(query) || mod.id.includes(query)).slice(0, 12);
  if (!matching.length) {
    const none = document.createElement('p');
    none.className = 'status';
    none.style.padding = '0 12px';
    none.textContent = 'No matching mods found.';
    results.append(none);
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

search.addEventListener('input', showSearchResults);
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeResults();
  else if (event.key === 'Enter' && !results.hidden) {
    const first = results.querySelector('button');
    if (first) { event.preventDefault(); first.click(); }
  }
});
document.addEventListener('click', event => {
  if (!results.contains(event.target) && event.target !== search) closeResults();
});

async function start() {
  try {
    const response = await fetch(new URL('data/catalog.json', baseUrl), {cache: 'no-cache'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.mods) || !catalog.mods.length) throw new Error('No mods were found');
    allMods = catalog.mods;
    document.getElementById('modCount').textContent = `${allMods.length.toLocaleString()} supported mods`;
    document.getElementById('updated').textContent = 'Generated: ' + new Date(catalog.generatedAt).toLocaleString();
    const urlModId = new URL(window.location.href).searchParams.get('mod');
    const firstMod = allMods.find(mod => mod.id === urlModId) || allMods.find(mod => mod.id === 'taskbar-zones') || allMods[0];
    chooseMod(firstMod);
  } catch (error) {
    status.textContent = `Could not load the catalog. Please refresh or check the GitHub Actions deployment. (${error.message})`;
    document.getElementById('modCount').textContent = 'Catalog unavailable';
  }
}

start();
