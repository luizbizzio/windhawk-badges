import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalizeCatalog, resolveColor, renderBadge, parseBadgePath } from '../worker/index.js';

const catalog = {
  mods: {
    'taskbar-zones': {
      details: {
        users: 150, ratingBreakdown: [0, 0, 1, 0, 9], ratingUsers: 10,
        reviews: 4, published: 1776098177000, updated: 1776098177000,
      },
      metadata: { name: 'Taskbar Zones', author: 'Luiz Bizzio', version: '1.0.0', license: 'GPL-3.0' },
    },
    malicious: { details: { users: 0 }, metadata: { name: 'test', author: '<script>x</script>', license: '<script>' } },
  },
};

test('normalizes all supported statistics', () => {
  const normalized = normalizeCatalog(catalog, '2026-11-05T10:00:00Z');
  const mod = normalized.mods.find(x => x.id === 'taskbar-zones');
  assert.equal(mod.values.users, '150');
  assert.equal(mod.values.rating, '4.8/5');
  assert.equal(mod.values.votes, '10');
  assert.equal(mod.values.reviews, '4');
  assert.equal(mod.values.version, '1.0.0');
  assert.equal(mod.values.license, 'GPL-3.0');
  assert.equal(mod.values.published, '2026-04-13');
  assert.equal(normalized.kinds.users, 'Windhawk users');
});

test('validates custom HEX colors and badge paths', () => {
  assert.equal(resolveColor('blue'), '#2563eb');
  assert.equal(resolveColor('ff5733'), '#ff5733');
  assert.equal(resolveColor('#AbCdEf'), '#abcdef');
  assert.equal(resolveColor('red<script>'), null);
  assert.deepEqual(parseBadgePath('/badges/taskbar-zones/users/green.svg'), { id:'taskbar-zones', kind:'users', preset:'green' });
  assert.deepEqual(parseBadgePath('/badges/taskbar-zones/users.svg'), { id:'taskbar-zones', kind:'users', preset:'blue' });
  assert.equal(parseBadgePath('/badges/taskbar-zones/foo.svg'), null);
  assert.equal(parseBadgePath('/badges/../../bad.svg'), null);
});

test('renders valid SVG and escapes metadata safely', () => {
  const svg = renderBadge('Author', '<script>evil</script>', '#ff5733', '#123456');
  assert.match(svg, /&lt;script&gt;/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /fill="#ff5733"/);
  assert.match(svg, /fill="#123456"/);
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
