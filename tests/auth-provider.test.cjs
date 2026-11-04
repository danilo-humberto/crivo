const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createProvider}=require('../server/auth/provider.cjs');
test('adaptador consulta sessão sem cache, encaminha cookies e limita espera',async t=>{
  const original=global.fetch;t.after(()=>global.fetch=original);
  let request;
  global.fetch=async(url,opts)=>{request={url,opts};return Response.json({user:{id:'synthetic',emailVerified:true},session:{expiresAt:'2099-01-01'}});};
  const provider=createProvider({baseUrl:'https://auth.example.invalid',origin:'http://localhost',cookieSecret:'s'.repeat(32),timeoutMs:40});
  const {NEON_AUTH_SESSION_COOKIE_NAME}=await import('@neon/auth/server');
  const session=await provider.session({headers:{cookie:`${NEON_AUTH_SESSION_COOKIE_NAME}=synthetic`}},{setHeader(){}});
  assert.equal(session.user.id,'synthetic');assert.match(request.url,/get-session\?disableCookieCache=true/);
  assert.match(request.opts.headers.get('cookie'),/synthetic/);
  global.fetch=()=>new Promise(()=>{});
  await assert.rejects(provider.session({headers:{}},{setHeader(){}}),{status:503});
});
test('limite inclui corpo pendente e no máximo 16 chamadas upstream concorrentes',async t=>{
  const original=global.fetch;t.after(()=>global.fetch=original);
  let count=0;
  global.fetch=async()=>{count++;return new Response(new ReadableStream({start(){}}),{headers:{'content-type':'application/json'}});};
  const provider=createProvider({baseUrl:'https://auth.example.invalid',origin:'http://localhost',cookieSecret:'s'.repeat(32),timeoutMs:40});
  const results=await Promise.allSettled(Array.from({length:17},()=>provider.session({headers:{}},{setHeader(){}})));
  assert.equal(count,16);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===503).length,17);
});
