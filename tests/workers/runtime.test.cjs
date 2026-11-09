const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV='false';
process.env.WRANGLER_SEND_METRICS='false';
const {unstable_dev}=require('wrangler');

test('Workers local: assets, sessão, CSRF, projeto, avaliação, curadoria, arquivo e limite persistente', {timeout:120000},async t=>{
  const persistTo=await fs.mkdtemp(path.join(os.tmpdir(),'vault-worker-test-'));
  const start=()=>unstable_dev('tests/workers/fixture.mjs',{config:'tests/workers/wrangler.jsonc',local:true,ip:'127.0.0.1',port:0,persistTo,logLevel:'error',experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
  let worker=await start();t.after(()=>worker.stop());
  let base=`http://127.0.0.1:${worker.port}`;
  const get=(url,options={})=>fetch(base+url,options);
  const root=await get('/',{redirect:'manual'});assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/catalogo');
  for(const route of ['/auth','/auth.js','/styles.css','/catalogo'])assert.equal((await get(route)).status,200,route);
  for(const route of ['/.env','/server/server.cjs','/src/web/pages/index.html','/dist/auth.js'])assert.equal((await get(route)).status,404,route);
  assert.equal((await get('/styles.css',{method:'HEAD'})).headers.get('content-type'),'text/css; charset=utf-8');
  assert.equal((await get('/api/projects')).status,401);
  const isolated=await Promise.all(Array.from({length:12},(_,i)=>get('/api/me',{headers:{cookie:i%2?'synthetic_session=yes':''}})));
  assert.deepEqual(isolated.map(r=>r.status),Array.from({length:12},(_,i)=>i%2?200:401));
  assert.equal((await get('/management',{redirect:'manual'})).headers.get('location'),'/auth');
  const csrf=await get('/api/csrf');const {token}=await csrf.json();
  const cookie=csrf.headers.get('set-cookie').split(';')[0]+'; synthetic_session=yes';
  const headers={'content-type':'application/json',origin:base,cookie,'x-vault-csrf':token};
  const mutate=(url,data,method='POST')=>get(url,{method,headers,body:JSON.stringify(data)});
  const login=await mutate('/api/auth/sign-in/email',{email:'synthetic@example.invalid',password:'fake'});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/synthetic_session=yes/);
  assert.equal((await get('/api/projects',{method:'POST',headers:{...headers,'x-vault-csrf':'wrong'},body:'{}'})).status,403);
  const management=await get('/management',{headers:{cookie}});assert.equal(management.status,200);assert.match(await management.text(),/src="remote-storage.js"/);
  const project={id:'worker-project',title:'Projeto sintético Workers',description:'Resumo sintético',solution:'Solução sintética',category:'Operações',status:'Planejado',public:true};
  assert.equal((await mutate('/api/projects',{project})).status,200);
  assert.match(await (await get('/catalogo')).text(),/Projeto sintético Workers/);
  const route='/api/public/projects/~worker-project/reviews';
  const formToken=(await (await get(route)).json()).formToken;
  const review={name:'Pessoa sintética',cpf:'01234567890',rating:5,comment:'Teste local',formToken};
  const post=(data=review,ip='flow')=>get(route,{method:'POST',headers:{'content-type':'application/json',origin:base,'x-test-ip':ip},body:JSON.stringify(data)});
  const added=await post();assert.equal(added.status,201);const {id}=await added.json();
  let listing=await (await get(route)).json();assert.equal(listing.items.length,1);assert.doesNotMatch(JSON.stringify(listing),/cpf|01234567890/);
  assert.equal((await post()).status,409);
  assert.equal((await mutate(`/api/projects/~worker-project/reviews/~${id}`,{visible:false,expectedVisible:true})).status,200);
  assert.equal((await (await get(route)).json()).items.length,0);
  assert.doesNotMatch(await (await get('/projetos/~worker-project')).text(),/Teste local/);
  assert.equal((await mutate(`/api/projects/~worker-project/reviews/~${id}`,{visible:true,expectedVisible:false})).status,200);
  assert.match(await (await get('/projetos/~worker-project')).text(),/Teste local/);
  assert.equal((await mutate('/api/projects/worker-project',{},'DELETE')).status,200);
  assert.equal((await get('/projetos/~worker-project')).status,404);
  const state=await (await get('/api/projects',{headers:{cookie}})).json();assert.equal(state.projects[0].archived,true);assert.equal(state.audit.length,4);assert.ok(state.audit.every(e=>e.actorId==='synthetic-user'));
  assert.equal((await (await get('/api/projects/~worker-project/reviews',{headers:{cookie}})).json()).items.length,1);
  const logout=await mutate('/api/auth/sign-out',{});assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
  // Concurrent requests share a Durable Object and cannot exceed ten per IP.
  const attempts=await Promise.all(Array.from({length:12},()=>post({},'limited')));
  assert.equal(attempts.filter(r=>r.status===429).length,2);
  assert.equal(attempts.filter(r=>r.status===403).length,10);
  assert.ok(Number(attempts.find(r=>r.status===429).headers.get('retry-after'))>0);
  await worker.stop();worker=await start();base=`http://127.0.0.1:${worker.port}`;
  assert.equal((await post({},'limited')).status,429,'limite sobrevive ao reinício');
  // Token from the previous isolate remains valid after recreating synthetic data.
  const newCsrf=await get('/api/csrf');const fresh=await newCsrf.json();
  const newHeaders={...headers,origin:base,cookie:newCsrf.headers.get('set-cookie').split(';')[0]+'; synthetic_session=yes','x-vault-csrf':fresh.token};
  assert.equal((await get('/api/projects',{method:'POST',headers:newHeaders,body:JSON.stringify({project})})).status,200);
  assert.equal((await post(review,'after-restart')).status,201,'token sobrevive ao reinício');
});

test('Workers local: teto global é compartilhado entre IPs concorrentes',{timeout:60000},async t=>{
  const persistTo=await fs.mkdtemp(path.join(os.tmpdir(),'vault-worker-global-'));
  const worker=await unstable_dev('tests/workers/fixture.mjs',{config:'tests/workers/wrangler.jsonc',local:true,ip:'127.0.0.1',port:0,persistTo,logLevel:'error',experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
  t.after(()=>worker.stop());const base=`http://127.0.0.1:${worker.port}`;
  const codes=[];
  for(let batch=0;batch<21;batch++){
    const results=await Promise.all(Array.from({length:10},(_,i)=>fetch(base+'/api/public/projects/~absent/reviews',{
      method:'POST',headers:{origin:base,'content-type':'application/json','x-test-ip':`synthetic-${batch*10+i}`},body:'{}'
    })));
    codes.push(...results.map(r=>r.status));
  }
  assert.equal(codes.filter(c=>c===403).length,200);
  assert.equal(codes.filter(c=>c===429).length,10);
});

test('Worker de publicação falha fechado sem configuração e não inclui conta sintética',{timeout:60000},async t=>{
  const worker=await unstable_dev('workers/index.mjs',{config:'workers/wrangler.jsonc',local:true,ip:'127.0.0.1',port:0,persist:false,logLevel:'error',experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
  t.after(()=>worker.stop());
  for(const route of ['/auth','/api/projects']){
    const response=await fetch(`http://127.0.0.1:${worker.port}${route}`,{headers:{cookie:'synthetic_session=yes'}});
    assert.equal(response.status,503);assert.equal(await response.text(),'Serviço indisponível.');
  }
});

test('entrada de publicação: SDK Auth real com I/O simulado, identidades isoladas e pool encerrado por requisição',{timeout:60000},async t=>{
  const {NEON_AUTH_SESSION_COOKIE_NAME}=await import('@neon/auth/server');
  const worker=await unstable_dev('tests/workers/production-fixture.mjs',{config:'tests/workers/production-fixture.jsonc',local:true,ip:'127.0.0.1',port:0,persist:false,logLevel:'error',experimental:{disableExperimentalWarning:true,disableDevRegistry:true,watch:false}});
  t.after(()=>worker.stop());const base=`http://127.0.0.1:${worker.port}`;
  const account=await fetch(base+'/auth',{redirect:'manual'});assert.equal(account.status,302);assert.equal(account.headers.get('location'),'https://vault.example.invalid/auth');
  const style=await fetch(base+'/auth.css');assert.equal(style.status,200);await style.text();
  const results=await Promise.all(Array.from({length:12},async(_,i)=>{
    const id=i%2?'account-b':'account-a';
    const response=await fetch(base+'/api/me',{headers:{cookie:`${NEON_AUTH_SESSION_COOKIE_NAME}=${id}`}});
    assert.equal(response.status,200);const user=await response.json();assert.equal(user.id,id);
    assert.match(response.headers.get('set-cookie'),/Secure/);
  }));
  assert.equal(results.length,12);
  const counts=await (await fetch(base+'/__test_counts')).json();
  assert.equal(counts.created,14);assert.equal(counts.ended,14);assert.equal(counts.queries,12);
});
