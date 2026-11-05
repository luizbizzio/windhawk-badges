import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalizeCatalog, resolveColor, renderBadge, parseBadgePath, githubLink } from '../worker/index.js';
import { renderPreviewBadge } from '../site/badge-preview.js';
import { readFileSync } from 'node:fs';

const catalog = {
  mods: {
    'taskbar-zones': {
      details: {
        users: 150, ratingBreakdown: [0, 0, 1, 0, 9], ratingUsers: 10,
        reviews: 4, published: 1776098177000, updated: 1776098177000,
      },
      metadata: { name: 'Taskbar Zones', author: 'Luiz Bizzio', version: '1.0.0', license: 'GPL-3.0', github: 'https://github.com/luizbizzio/taskbar-zones' },
    },
    malicious: { details: { users: 0 }, metadata: { name: 'test', author: '<script>x</script>', license: '<script>', github: 'https://github.com.evil.test/fake' } },
  },
};

test('normalizes all supported statistics', () => {
  const normalized = normalizeCatalog(catalog, '2026-11-05T10:00:00Z');
  const mod = normalized.mods.find(x => x.id === 'taskbar-zones');
  assert.equal(mod.values.users, '150');
  assert.equal(mod.values.rating, '4.8/5.0');
  const perfect = normalizeCatalog({ mods: { perfect: { metadata: { name: 'Perfect' }, details: { ratingBreakdown: [0, 0, 0, 0, 2] } } } });
  assert.equal(perfect.mods[0].values.rating, '5.0/5.0');
  assert.equal(mod.values.votes, '10');
  assert.equal(mod.values.reviews, '4');
  assert.equal(mod.values.version, '1.0.0');
  assert.equal(mod.values.license, 'GPL-3.0');
  assert.equal(mod.values.published, '2026-04-13');
  assert.equal(normalized.kinds.users, 'Windhawk users');
  assert.equal(normalized.kinds.github, 'GitHub');
  assert.equal(mod.values.github, 'luizbizzio');
  assert.equal(mod.githubUrl, 'https://github.com/luizbizzio');
  assert.equal(normalized.mods.find(x => x.id === 'malicious').githubUrl, null);
  assert.equal(Object.keys(normalized.palette).length, 10);
  assert.equal(normalized.palette.indigo, undefined);
  assert.equal(normalized.palette.teal, undefined);
});

test('validates custom HEX colors and badge paths', () => {
  assert.equal(resolveColor('blue'), '#2563eb');
  assert.equal(resolveColor('indigo'), '#4338ca'); // legacy links
  assert.equal(resolveColor('teal'), '#0f766e'); // legacy links
  assert.equal(resolveColor('ff5733'), '#ff5733');
  assert.equal(resolveColor('#AbCdEf'), '#abcdef');
  assert.equal(resolveColor('red<script>'), null);
  assert.deepEqual(parseBadgePath('/badges/taskbar-zones/users/green.svg'), { id:'taskbar-zones', kind:'users', preset:'green' });
  assert.deepEqual(parseBadgePath('/badges/taskbar-zones/users.svg'), { id:'taskbar-zones', kind:'users', preset:'blue' });
  assert.deepEqual(parseBadgePath('/badges/taskbar-zones/github.svg'), { id:'taskbar-zones', kind:'github', preset:'blue' });
  assert.equal(githubLink('https://github.com/luizbizzio').label, 'luizbizzio');
  assert.equal(githubLink('https://www.github.com/luizbizzio/taskbar-zones/').url, 'https://github.com/luizbizzio');
  assert.equal(githubLink('https://github.com/luizbizzio/taskbar-zones').label, 'luizbizzio');
  assert.equal(githubLink('https://github.com.evil.test/luizbizzio'), null);
  assert.equal(githubLink('javascript:alert(1)'), null);
  assert.equal(githubLink('https://github.com@evil.test/luizbizzio'), null);
  assert.equal(parseBadgePath('/badges/taskbar-zones/foo.svg'), null);
  assert.equal(parseBadgePath('/badges/../../bad.svg'), null);
});

test('renders valid SVG and escapes metadata safely', () => {
  // This checks the actual XML escaping, not an HTML-tag filtering regex.
  // Cover lowercase, uppercase, mixed case, and attribute quotes.
  const cases = [
    ['<script>evil</script>', '&lt;script&gt;evil&lt;/script&gt;'],
    ['<SCRIPT SRC="bad.js">evil</SCRIPT>', '&lt;SCRIPT SRC=&quot;bad.js&quot;&gt;evil&lt;/SCRIPT&gt;'],
    ["<ScRiPt data-x='1'>evil</ScRiPt>", '&lt;ScRiPt data-x=&apos;1&apos;&gt;evil&lt;/ScRiPt&gt;'],
  ];
  for (const [value, escaped] of cases) {
    const svg = renderBadge('Author', value, '#ff5733', '#123456');
    assert.ok(svg.includes(escaped), 'Metadata is XML-escaped');
    assert.equal(svg.toLowerCase().includes('<script'), false, 'No executable script tag is emitted');
    assert.match(svg, /fill="#ff5733"/);
    assert.match(svg, /fill="#123456"/);
  }
  assert.throws(() => renderBadge('Test', '1', 'javascript:alert(1)'));
});

test('serves same origin API and dynamic badge URLs', async () => {
  const savedFetch = globalThis.fetch;
  const savedCache = globalThis.caches;
  globalThis.fetch = async () => new Response(JSON.stringify(catalog), { status: 200 });
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  const context = { waitUntil: promise => promise.catch(() => {}) };
  try {
    const result = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/users.svg?color=ff5733&labelColor=202020'), {}, context);
    assert.equal(result.status, 200);
    const svg = await result.text();
    assert.match(svg, /Windhawk users/);
    assert.match(svg, /ff5733/);
    assert.match(svg, /202020/);
    const response = await worker.fetch(new Request('https://example.workers.dev/api/catalog'), {}, context);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.totalMods, 2);
    const invalid = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/users.svg?color=NOPE'), {}, context);
    assert.equal(invalid.status, 400);
  } finally {
    globalThis.fetch = savedFetch;
    globalThis.caches = savedCache;
  }
});

test('supports five separate visual styles and compact density', () => {
  const variants = [
    ['classic', 'rx="3"'],
    ['flat', 'rx="2"'],
    ['flat-square', 'rx="0"'],
    ['rounded', 'rx="7"'],
    ['pill', 'rx="11"'],
  ];
  const appearances = new Set();
  for (const [style, expectedRadius] of variants) {
    const svg = renderBadge('Users', '150', '#ff5733', '#24292f', { style, size: 'normal' });
    assert.match(svg, new RegExp(expectedRadius));
    assert.match(svg, /width="\d+" height="22"/);
    assert.match(svg, /<text[^>]+>Users<\/text>/);
    appearances.add(svg);
  }
  assert.equal(appearances.size, 5);
  const compact = renderBadge('Users', '150', '#ff5733', '#24292f', { style: 'pill', size: 'compact' });
  assert.match(compact, /height="18"/);
  assert.match(compact, /font-size="10"/);
  assert.match(compact, /rx="9"/);
  assert.throws(() => renderBadge('Users', '10', '#ff5733', '#24292f', { style: 'nope' }));
  assert.throws(() => renderBadge('Users', '10', '#ff5733', '#24292f', { icon: 'other' }));
  assert.throws(() => renderBadge('Users', '10', '#ff5733', '#24292f', { labelTextColor: '<script>' }));
  assert.throws(() => renderBadge('Users', '10', '#ff5733', '#24292f', { valueTextColor: 'invalid' }));
  assert.throws(() => renderBadge('Users', '10', '#ff5733', '#24292f', { iconBgColor: '#xyzxyz' }));
  assert.throws(() => renderBadge('Users', '10', '#ff5733', '#24292f', { iconColor: 'invalid' }));
  const customized = renderBadge('Users', '150', '#112233', '#445566', {
    icon: 'windhawk', iconBgColor: '#778899', iconColor: '#ffdd00', labelTextColor: '#aabbcc', valueTextColor: '#ddeeff',
  });
  assert.match(customized, /<rect width="27" height="22" fill="#778899"\/>/);
  assert.match(customized, /data-windhawk-icon="true"[^>]*><path fill="#ffdd00"/);
  assert.match(customized, /<text[^>]+fill="#aabbcc">Users<\/text>/);
  assert.match(customized, /<text[^>]+fill="#ddeeff">150<\/text>/);
  const single = renderBadge('Mod name', 'Taskbar Zones', '#112233', '#445566', {
    single: true, icon: 'windhawk', iconBgColor: '#778899', valueTextColor: '#ddeeff',
  });
  assert.match(single, /fill="#778899"/);
  const defaultIcon = renderBadge('Users', '150', '#112233', '#445566', { icon: 'windhawk' });
  assert.match(defaultIcon, /<rect width="27" height="22" fill="#000000"\/>/);
  assert.match(defaultIcon, /data-windhawk-icon="true"[^>]*><path fill="#ffffff"/);
  assert.match(single, /fill="#ddeeff"/);
  assert.doesNotMatch(single, /fill="#aabbcc"/);
});

test('mod name is a single-part SVG with escaped text', () => {
  const svg = renderBadge('Mod name', 'Archive & Preview <Beta>', '#ff5733', '#555555', { single: true, style: 'pill' });
  assert.match(svg, /Archive &amp; Preview &lt;Beta&gt;/);
  assert.doesNotMatch(svg, /<text[^>]*>Mod name<\/text>/);
  assert.doesNotMatch(svg, /M0 0h/);
  assert.match(svg, /fill="#ff5733"/);
});

test('handles appearance, short labels, and mod badge in dynamic URLs', async () => {
  const savedFetch = globalThis.fetch;
  const savedCache = globalThis.caches;
  globalThis.fetch = async () => new Response(JSON.stringify(catalog), { status: 200 });
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  const context = { waitUntil: promise => promise.catch(() => {}) };
  try {
    const url = 'https://example.workers.dev/badges/taskbar-zones/users.svg?style=pill&size=compact&labelMode=short&color=ff5733';
    const response = await worker.fetch(new Request(url), {}, context);
    assert.equal(response.status, 200);
    const svg = await response.text();
    assert.match(svg, />Users<\/text>/);
    assert.doesNotMatch(svg, /Windhawk users/);
    assert.match(svg, /height="18"/);
    assert.match(svg, /rx="9"/);
    const decorated = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/rating.svg?style=pill&icon=windhawk'), {}, context);
    assert.equal(decorated.status, 200);
    const decoratedSVG = await decorated.text();
    assert.match(decoratedSVG, /data-windhawk-icon="true"/);
    assert.match(decoratedSVG, /4\.8\/5\.0/);
    assert.doesNotMatch(svg, /data-windhawk-icon/); // default remains unchanged
    const customColors = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/users.svg?icon=windhawk&iconBgColor=102030&iconColor=deca10&labelTextColor=abcdef&valueTextColor=334455'), {}, context);
    assert.equal(customColors.status, 200);
    const customSVG = await customColors.text();
    assert.match(customSVG, /<rect width="27" height="22" fill="#102030"\/>/);
    assert.match(customSVG, /data-windhawk-icon="true"[^>]*><path fill="#deca10"/);
    assert.match(customSVG, /fill="#abcdef"/);
    assert.match(customSVG, /fill="#334455"/);
    const modWithIcon = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/mod.svg?icon=windhawk'), {}, context);
    assert.equal(modWithIcon.status, 200);
    assert.match(await modWithIcon.text(), /data-windhawk-icon="true"/);
    const mod = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/mod.svg?style=rounded'), {}, context);
    assert.equal(mod.status, 200);
    const modSVG = await mod.text();
    assert.match(modSVG, />Taskbar Zones<\/text>/);
    assert.doesNotMatch(modSVG, /Mod name<\/text>/);
    const gitHub = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/github.svg?size=compact&color=ff5733'), {}, context);
    assert.equal(gitHub.status, 200);
    const gitHubSvg = await gitHub.text();
    assert.match(gitHubSvg, />GitHub<\/text>/);
    assert.match(gitHubSvg, />luizbizzio<\/text>/);
    assert.doesNotMatch(gitHubSvg, /luizbizzio\/taskbar-zones|undefined/);
    const missingGithub = await worker.fetch(new Request('https://example.workers.dev/badges/malicious/github.svg'), {}, context);
    assert.equal(missingGithub.status, 200);
    const missingGithubSvg = await missingGithub.text();
    assert.match(missingGithubSvg, /not specified/);
    assert.doesNotMatch(missingGithubSvg, /undefined/);
    const wrongKind = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/unknown.svg'), {}, context);
    assert.equal(wrongKind.status, 404);
    for (const bad of ['style=invalid', 'size=huge', 'labelMode=bad', 'icon=unexpected', 'iconBgColor=nope', 'iconColor=xyz', 'labelTextColor=javascript:alert(1)', 'valueTextColor=bad']) {
      const error = await worker.fetch(new Request(`https://example.workers.dev/badges/taskbar-zones/users.svg?${bad}`), {}, context);
      assert.equal(error.status, 400);
    }
    const head = await worker.fetch(new Request('https://example.workers.dev/badges/taskbar-zones/mod.svg', { method: 'HEAD' }), {}, context);
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const api = await worker.fetch(new Request('https://example.workers.dev/api/catalog'), {}, context);
    const normalized = await api.json();
    assert.equal(normalized.kinds.mod, 'Mod name');
    assert.equal(normalized.mods.find(x => x.id === 'taskbar-zones').values.mod, 'Taskbar Zones');
  } finally {
    globalThis.fetch = savedFetch;
    globalThis.caches = savedCache;
  }
});

test('browser preview renderer matches Worker without sending badge requests', () => {
  const styles = ['classic', 'flat', 'flat-square', 'rounded', 'pill'];
  const sizes = ['normal', 'compact'];
  const examples = [
    ['Windhawk users', '10,123', false],
    ['Users', '10,123', false],
    ['GitHub', 'luizbizzio', false],
    ['Mod name', 'Archive & <Preview> "β" 🚀', true],
  ];
  for (const style of styles) {
    for (const size of sizes) {
      for (const [label, value, single] of examples) {
        for (const icon of ['none', 'windhawk']) {
          const args = [label, value, '#ff5733', '#555555', {
            style, size, single, icon,
            iconBgColor: '#172839', iconColor: '#fa1020', labelTextColor: '#aabbcc', valueTextColor: '#ddeeff',
          }];
          assert.equal(renderPreviewBadge(...args), renderBadge(...args));
          const output = renderPreviewBadge(...args);
          if (icon === 'windhawk') assert.match(output, /data-windhawk-icon="true"/);
          else assert.doesNotMatch(output, /data-windhawk-icon/);
        }
      }
    }
  }
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
  assert.match(html, /type="module" src="\.\/app\.js"/);
  assert.match(app, /preview\.src = previewDataUrl\(kind, label\)/);
  assert.match(app, /data:image\/svg\+xml;charset=utf-8/);
  assert.doesNotMatch(app, /preview\.src = (url|badgeUrl\()/);
  assert.match(app, /function badgeUrl\(/); // copied Markdown still uses dynamic Worker links
  assert.match(html, /id="badgeIcon"/);
  assert.match(app, /url\.searchParams\.set\('icon', 'windhawk'\)/);
  assert.match(app, /icon: chosenIcon/);
  assert.match(app, /chosenIcon = 'windhawk'/);
  assert.match(html, /value="windhawk" selected/);
  assert.match(html, /id="iconBgHex"[^>]*value="#000000"/);
  const cssSource = readFileSync(new URL('../site/style.css', import.meta.url), 'utf8');
assert.match(cssSource, /\.hex-customization\s*\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(app, /let chosenIconBgColor = '#000000'/);
  assert.match(html, /<option value="full">Full<\/option>/);
  assert.match(html, /<option value="short">Short<\/option>/);
  for (const field of ['iconBgHex', 'iconColorHex', 'labelTextHex', 'valueTextHex']) {
    assert.ok(html.includes(`id="${field}"`));
  }
  for (const param of ['iconBgColor', 'iconColor', 'labelTextColor', 'valueTextColor']) {
    assert.ok(app.includes(`url.searchParams.set('${param}'`));
  }
});

test('catalog size limit rejects oversized upstream responses', async () => {
  const savedFetch = globalThis.fetch;
  const savedCache = globalThis.caches;
  globalThis.caches = undefined;
  globalThis.fetch = async () => new Response('{"mods":{}}', {
    status: 200,
    headers: { 'Content-Length': '15000001' },
  });
  try {
    const response = await worker.fetch(new Request('https://example.workers.dev/api/catalog'), {}, {});
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  } finally {
    globalThis.fetch = savedFetch;
    globalThis.caches = savedCache;
  }
});

test('client Markdown escaping and multi-line copy are preserved', () => {
  const appSource = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /function escapeMarkdownAlt/);
  assert.match(appSource, /escapeMarkdownAlt\(alt\)/);
  assert.match(appSource, /\.map\(markdownFor\)\.filter\(Boolean\)\.join\('\\n'\)/);
});

test('default site example is Windows 11 Taskbar Styler with URL override preserved', () => {
  const app = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
  assert.match(app, /const requested = new URL\(window\.location\.href\)\.searchParams\.get\('mod'\)/);
  assert.match(app, /chooseMod\(mods\.find\(mod => mod\.id === requested\) \|\| mods\.find\(mod => mod\.id === 'windows-11-taskbar-styler'\) \|\| mods\[0\]\)/);
  assert.doesNotMatch(app, /mod\.id === 'taskbar-zones'\) \|\| mods\[0\]/);
});

test('site uses the official Windhawk logo and accessible footer links', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../site/style.css', import.meta.url), 'utf8');
  const logo = readFileSync(new URL('../site/assets/windhawk-logo.svg', import.meta.url), 'utf8');
  assert.match(html, /class="brand-mark page-logo" aria-hidden="true"><img src="\.\/assets\/windhawk-logo\.svg"/);
  assert.equal(html.includes('brand-mark" aria-hidden="true">W</span>'), false);
  assert.match(logo, /<svg /);
  assert.match(logo, /<path fill="#ffffff"/);
  assert.match(html, /<nav class="footer-links" aria-label="Footer links">/);
  assert.match(html, /href="https:\/\/github\.com\/luizbizzio\/windhawk-badges\/issues"/);
  assert.match(html, /id="updated" class="footer-updated"/);
  assert.match(styles, /\.footer-bottom\s*\{/);
});

test('site header and favicon use the official Windhawk SVG', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../site/style.css', import.meta.url), 'utf8');
  const favicon = readFileSync(new URL('../site/assets/favicon.svg', import.meta.url), 'utf8');
  const logo = readFileSync(new URL('../site/assets/windhawk-logo.svg', import.meta.url), 'utf8');
  const pathMatch = logo.match(/<path fill="#ffffff" stroke-width="0" d="([^"]+)"/);
  assert.ok(pathMatch, 'Official logo path should be present');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\.\/assets\/favicon\.svg" sizes="any">/);
  assert.ok(favicon.includes(pathMatch[1]), 'Favicon should use the official logo vector');
  assert.match(favicon, /<rect x="1" y="1" width="62" height="62" rx="13"/);
  assert.match(html, /class="page-title-row"/);
  assert.match(html, /class="page-heading-meta"/);
  assert.match(html, /<nav class="page-links" aria-label="Project links">/);
  assert.match(css, /@media\(max-width:600px\)/);
});

test('catalog summary is visible at the top and shares the footer data', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../site/style.css', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(html, /id="catalogSummary" class="catalog-summary"/);
  assert.match(app, /const catalogStatus =/);
  assert.match(app, /getElementById\('catalogSummary'\)\.textContent = catalogStatus/);
  assert.match(app, /getElementById\('updated'\)\.textContent = catalogStatus/);
  assert.match(css, /\.catalog-summary\s*\{/);
  assert.match(css, /\.page-heading\s*\{display:flex/);
  assert.match(html, /class="footer-brand"/);
  assert.match(html, /class="footer-brand"[\s\S]*?src="\.\/assets\/windhawk-logo\.svg"/);
  assert.match(readme, /<div align="center">\s*<img src="site\/assets\/favicon\.svg" alt="Windhawk Badges logo"/);
});

test('Windhawk-style layout places project links above catalog status on the right', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../site/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<header class="topbar">/);
  assert.match(html, /class="page-heading-meta"[\s\S]*?<nav class="page-links"[\s\S]*?Windhawk[\s\S]*?GitHub[\s\S]*?id="catalogSummary"/);
  assert.match(styles, /\.page-heading-meta\s*\{display:flex;flex-direction:column;align-items:flex-end/);
  assert.match(html, /<h1>Windhawk Badges<\/h1>/);
  for (const id of ['search', 'colors', 'badgeGrid', 'copyAll', 'badgeIcon', 'updated']) {
    assert.ok(html.includes('id="' + id + '"'));
  }
});
