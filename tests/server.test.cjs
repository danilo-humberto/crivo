const {test} = require('node:test');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {createServer} = require('../server/server.cjs');

test('serve página e recursos, integra os módulos do navegador e não expõe documentos internos', async t => {
  const server = createServer({mode:'local'});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const html = await response.text();
  assert.equal(await (await fetch(`${base}/index.html`)).text(), html);
  const context = vm.createContext({crypto: webcrypto, structuredClone});
  for (const match of html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)) {
    const resource = await fetch(new URL(match[1], `${base}/`));
    assert.equal(resource.status, 200, match[1]);
    assert.match(resource.headers.get('content-type'), match[1].endsWith('.css') ? /text\/css/ : /text\/javascript/);
    const source = await resource.text();
    if (match[1].endsWith('.js')) {
      new vm.Script(source, {filename: match[1]});
      if (match[1] !== 'app.js') vm.runInContext(source, context);
    }
  }
  const map = new Map();
  const storage = {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value)};
  const result = context.VaultStorage.initialize(storage, []);
  assert.equal(result.state.version, 2);
  assert.equal(context.VaultStorage.read(storage).raw, result.raw);
  assert.equal(typeof context.VaultAudit.nextState, 'function');
  for (const route of ['/README.md','/AGENTS.md','/docs/plano-avaliacoes.md','/server/server.cjs','/tests/core.test.cjs','/server/persistence/repository.cjs','/server/migrations/001-persistence.sql','/.env','/package-lock.json','/constructor','/missing']) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
});
