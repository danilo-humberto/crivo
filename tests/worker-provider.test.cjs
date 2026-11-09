const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createProviderCache}=require('../workers/provider-cache.cjs');
test('requisições Workers reutilizam limite do Auth sem compartilhar sessão',async t=>{
  const original=global.fetch;t.after(()=>global.fetch=original);
  let count=0;
  global.fetch=async()=>{count++;return new Response(new ReadableStream({start(){}}));};
  const get=createProviderCache();
  const config={baseUrl:'https://auth.example.invalid',origin:'https://vault.example.invalid',cookieSecret:'s'.repeat(32),timeoutMs:20};
  const results=await Promise.allSettled(Array.from({length:17},()=>get({...config}).session({headers:{}},{setHeader(){}})));
  assert.equal(count,16);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===503).length,17);
  assert.equal(get({...config}),get({...config}));
  assert.notEqual(get(config),get({...config,cookieSecret:'t'.repeat(32)}));
});
