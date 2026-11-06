const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createServer}=require('../server/server.cjs');
const project={id:'public',title:'Portal de operações',description:'Resumo público',solution:'Solução pública',category:'Operações',status:'Planejado',requested:'2026-11-06',completed:'',owner:'Equipe sintética'};
async function fixture(t,options={}){
  const server=createServer({publicRepository:{listProjects:async()=>[project],getProject:async id=>id===project.id?project:null},...options});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
test('catálogo e página própria acessíveis sem sessão; gestão continua protegida',async t=>{
  const base=await fixture(t,{auth:{session:async()=>null},authRepository:{lookup:async()=>null}});
  const response=await fetch(base+'/catalogo');assert.equal(response.status,200);
  const html=await response.text();assert.match(html,/Portal de operações/);assert.match(html,/href="\/projetos\/~public"/);
  for(const asset of html.matchAll(/href="([^" ]+\.css)"/g))assert.equal((await fetch(base+asset[1])).status,200);
  assert.doesNotMatch(html,/local-storage.js|app.js|<dialog|Custo mensal|Economia|Auditoria/);
  assert.match(html,/<html lang="pt-BR"/);assert.match(html,/<label for="catalog-search"/);
  const detail=await fetch(base+'/projetos/~public');assert.equal(detail.status,200);
  assert.match(await detail.text(),/<title>Portal de operações — Vault TI<\/title>/);
  const root=await fetch(base+'/',{redirect:'manual'});assert.equal(root.headers.get('location'),'/catalogo');
  assert.equal((await fetch(base+'/api/projects')).status,401);
  assert.equal((await fetch(base+'/management',{redirect:'manual'})).headers.get('location'),'/auth');
  for(const route of ['/catalogo','/projetos/~public','/api/public/projects','/api/public/projects/~public']){
    const head=await fetch(base+route,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    assert.equal(head.headers.get('cache-control'),'no-store');
    for(const method of ['POST','DELETE','PATCH'])assert.equal((await fetch(base+route,{method})).status,405);
  }
  assert.deepEqual(await (await fetch(base+'/api/public/projects')).json(),[project]);
  assert.deepEqual(await (await fetch(base+'/api/public/projects/~public')).json(),project);
});
test('página e API respeitam a URL liberada e uma retirada de publicação na próxima consulta',async t=>{
  let current={...project};
  const base=await fixture(t,{publicRepository:{listProjects:async()=>current?[current]:[],getProject:async()=>current}});
  assert.doesNotMatch(await (await fetch(base+'/projetos/~public')).text(),/Acessar solução|https:\/\/example.invalid/);
  current={...project,url:'https://example.invalid/?a=1&b=2'};
  assert.match(await (await fetch(base+'/projetos/~public')).text(),/href="https:\/\/example.invalid\/\?a=1&amp;b=2"/);
  current=null;
  assert.equal((await fetch(base+'/projetos/~public')).status,404);
  assert.equal((await fetch(base+'/api/public/projects/~public')).status,404);
  assert.deepEqual(await (await fetch(base+'/api/public/projects')).json(),[]);
});
test('privado, arquivado e inexistente são indistinguíveis inclusive por URL direta e HEAD',async t=>{
  const base=await fixture(t);
  for(const prefix of ['/projetos/~','/api/public/projects/~']){
    let expected;
    for(const id of ['private','archived','absent','%E0%A4%A']){
      const response=await fetch(base+prefix+id);assert.equal(response.status,404);
      const text=await response.text();expected??=text;assert.equal(text,expected);
      assert.equal((await fetch(base+prefix+id,{method:'HEAD'})).status,404);
    }
  }
});
test('HTML escapa conteúdo e filtros; navegação preserva identificadores codificados',async t=>{
  const unsafe={...project,id:'a/b?#',title:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>',owner:'" onclick="alert(1)'};
  const base=await fixture(t,{publicRepository:{listProjects:async()=>[unsafe],getProject:async id=>id===unsafe.id?unsafe:null}});
  const html=await (await fetch(base+'/catalogo')).text();assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<img/);
  assert.match(html,/href="\/projetos\/~a%2Fb%3F%23"/);
  const detail=await fetch(base+'/projetos/~a%2Fb%3F%23');assert.equal(detail.status,200);assert.doesNotMatch(await detail.text(),/<script|<img/);
  const filtered=await (await fetch(base+'/catalogo?q=%22%3E%3Cscript%3E')).text();assert.doesNotMatch(filtered,/<script/);assert.match(filtered,/Nenhum projeto encontrado/);
});
test('busca sem acento e filtros funcionam sem JavaScript; estado vazio não inventa avaliações',async t=>{
  const base=await fixture(t);
  assert.match(await (await fetch(base+'/catalogo?q=operacoes&status=Planejado&area=Opera%C3%A7%C3%B5es')).text(),/Portal de operações/);
  assert.doesNotMatch(await (await fetch(base+'/catalogo?status=Conclu%C3%ADdo')).text(),/Portal de operações/);
  const empty=await fixture(t,{publicRepository:{listProjects:async()=>[]}});
  const html=await (await fetch(empty+'/catalogo')).text();assert.match(html,/Nenhum projeto publicado/);assert.doesNotMatch(html,/Sem avaliações|estrelas/);
});
test('falhas públicas retornam erro genérico sem vazar detalhes ou depender do Auth',async t=>{
  const base=await fixture(t,{publicRepository:{listProjects:async()=>{throw Object.assign(Error('secret database detail'),{status:400});},getProject:async()=>{throw Error('secret database detail');}}});
  for(const route of ['/catalogo','/projetos/~public','/api/public/projects','/api/public/projects/~public']){
    const response=await fetch(base+route);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/secret|database detail/);
  }
  const unavailable=await fixture(t,{publicRepository:undefined});assert.equal((await fetch(unavailable+'/catalogo')).status,503);
});
test('IDs legados de ponto e caracteres reservados mantêm navegação reversível',async t=>{
  const {publicProjectPath}=require('../src/domain/core.js');
  for(const id of ['.','..','~name','a/b?#','%2E','ação']){
    const item={...project,id};
    const base=await fixture(t,{publicRepository:{listProjects:async()=>[item],getProject:async value=>value===id?item:null}});
    const path=publicProjectPath(id);
    assert.equal(new URL(path,base).pathname,path);
    assert.equal((await fetch(base+path)).status,200);
    const api=base+'/api/public/projects/'+path.split('/').at(-1);
    assert.deepEqual(await (await fetch(api)).json(),item);
  }
});
