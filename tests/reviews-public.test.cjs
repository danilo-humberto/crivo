const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createServer}=require('../server/server.cjs');
const {validateReview}=require('../server/persistence/reviews.cjs');
const {createReviewRepository}=require('../server/persistence/review-repository.cjs');
const {createReviewProtection}=require('../server/public/review-protection.cjs');
const project={id:'public',title:'Projeto sintético',description:'Resumo',solution:'Solução',category:'Operações',status:'Planejado',requested:'2026-11-06',completed:'',owner:'Equipe'};
const valid={name:'Pessoa sintética',cpf:'012.345.678-90',rating:5,comment:'Comentário sintético'};
async function fixture(t,options={}){
  const reviews=[];
  const reviewRepository={listReviews:async()=>({items:reviews,nextPage:null}),addReview:async(id,input)=>{
    if(id!=='public')throw Object.assign(Error(),{status:404});
    if(reviews.length)throw Object.assign(Error(),{status:409});
    reviews.push({id:'r1',name:input.name,rating:input.rating,comment:input.comment,createdAt:'2026-11-06T12:00:00.000Z',photoUrl:null});return {id:'r1'};
  }};
  const server=createServer({origin:'http://localhost',publicRepository:{getProject:async id=>id==='public'?project:null,listProjects:async()=>[project]},reviewRepository,...options});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const token=async()=> (await (await fetch(base+'/api/public/projects/~public/reviews')).json()).formToken;
  const post=async(body,headers={})=>fetch(base+'/api/public/projects/~public/reviews',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  return {base,token,post,reviews};
}
test('avaliações limitam tamanho e rejeitam estruturas inválidas antes de persistir',()=>{
  for(const change of [{name:'a'.repeat(121)},{comment:'a'.repeat(2001)},{rating:'5'},{cpf:123}])assert.throws(()=>validateReview({...valid,...change}));
  assert.equal(validateReview(valid).cpf,'01234567890');
});
test('envio público publica imediatamente, sem CPF na resposta; duplicidade e edição recusadas',async t=>{
  const f=await fixture(t);const formToken=await f.token();
  const response=await f.post({...valid,formToken});assert.equal(response.status,201);assert.deepEqual(await response.json(),{id:'r1'});
  const listed=await (await fetch(f.base+'/api/public/projects/~public/reviews')).json();assert.equal(listed.items.length,1);assert.equal(listed.items[0].name,valid.name);assert.doesNotMatch(JSON.stringify(listed),/cpf|012345/);
  assert.equal((await f.post({...valid,formToken})).status,409);
  const edit=await fetch(f.base+'/api/public/projects/~public/reviews',{method:'PATCH'});assert.equal(edit.status,405);
});
test('origem, token, tamanho, tipo e validação são conferidos no servidor',async t=>{
  const f=await fixture(t);const formToken=await f.token();
  assert.equal((await f.post({...valid,formToken},{Origin:'https://evil.invalid'})).status,403);
  assert.equal((await f.post({...valid,formToken},{Origin:''})).status,403);
  assert.equal((await f.post(valid)).status,403);
  assert.equal((await f.post({...valid,formToken:'invalid'})).status,403);
  assert.equal((await f.post({...valid,formToken,rating:1.5})).status,400);
  // Independent fixture prevents rate limiting from masking the payload checks.
  const g=await fixture(t);const token=await g.token();
  assert.equal((await g.post({...valid,formToken:token,comment:'a'.repeat(17000)})).status,413);
  assert.equal((await g.post({...valid,formToken:token},{'Content-Type':'text/plain'})).status,415);
  assert.equal(f.reviews.length,0);assert.equal(g.reviews.length,0);
});
test('formulário nativo, erros sem CPF, escape, paginação e redirecionamento após envio',async t=>{
  const f=await fixture(t);const html=await (await fetch(f.base+'/projetos/~public')).text();
  assert.match(html,/<meta name="referrer" content="same-origin">/);
  assert.equal((await fetch(f.base+'/projetos/~public')).headers.get('referrer-policy'),'same-origin');
  assert.match(html,/method="post"/);assert.match(html,/name="cpf"/);assert.match(html,/type="radio"/);assert.match(html,/Sem avaliações/);
  const pattern=new RegExp(`^(?:${html.match(/pattern="([^"]+)"/)[1]})$`,'v');
  assert.ok(pattern.test('01234567890'));assert.ok(pattern.test('012.345.678-90'));assert.ok(!pattern.test('abc'));
  const formToken=await f.token();
  const send=body=>fetch(f.base+'/projetos/~public/reviews',{method:'POST',headers:{Origin:'http://localhost'},body:new URLSearchParams(body),redirect:'manual'});
  const bad=await send({...valid,formToken,cpf:'01234567891',name:'<script>bad</script>'});assert.equal(bad.status,400);
  const error=await bad.text();assert.doesNotMatch(error,/01234567891|<script>bad/);assert.match(error,/&lt;script&gt;bad/);
  const ok=await send({...valid,formToken});assert.equal(ok.status,303);assert.equal(ok.headers.get('location'),'/projetos/~public?enviada=1#avaliacoes');
  const page=await (await fetch(f.base+'/projetos/~public?enviada=1')).text();assert.match(page,/Avaliação enviada/);assert.match(page,/Comentário sintético/);
});
test('privados e falhas não expõem dados; HEAD não retorna corpo',async t=>{
  const f=await fixture(t);
  for(const id of ['private','archived','missing'])assert.equal((await fetch(f.base+`/api/public/projects/~${id}/reviews`)).status,404);
  const head=await fetch(f.base+'/api/public/projects/~public/reviews',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  const g=await fixture(t,{reviewRepository:{listReviews:async()=>{throw Error('secret cpf');}}});
  const error=await fetch(g.base+'/api/public/projects/~public/reviews');assert.equal(error.status,503);assert.doesNotMatch(await error.text(),/secret|cpf/);
});
test('token vinculado ao projeto expira; limitação tem teto por IP e global e expira',()=>{
  let now=0;const guard=createReviewProtection({now:()=>now,perIp:2,total:3,windowMs:1000});
  const token=guard.token('a');assert.equal(guard.verify(token,'a'),true);assert.equal(guard.verify(token,'b'),false);
  assert.equal(guard.take('a'),0);assert.equal(guard.take('a'),0);assert.ok(guard.take('a')>0);
  assert.equal(guard.take('b'),0);assert.ok(guard.take('c')>0);
  now=1001;assert.equal(guard.take('a'),0);now=3600001;assert.equal(guard.verify(token,'a'),false);
});
test('SQL lista só avaliações visíveis de projeto público com paginação e projeção segura',async()=>{
  const calls=[];const row={id:'r',name:'Pessoa',cpf:'01234567890',rating:5,comment:'Teste',created_at:new Date('2026-11-06T12:00:00Z'),visible:true,project_id:'p',secret:'x',total:12};
  const repo=createReviewRepository({query:async(sql,args)=>{calls.push({sql,args});return {rows:Array.from({length:5},()=>row)};}},{photoBaseUrl:'https://example.invalid/{cpf}.jpeg'});
  const result=await repo.listReviews('p',2);assert.equal(result.items.length,5);assert.equal(result.nextPage,3);
  assert.equal(result.total,12);assert.equal(result.totalPages,3);
  assert.deepEqual(Object.keys(result.items[0]).sort(),['id','name','rating','comment','createdAt','photoUrl'].sort());
  assert.equal(result.items[0].photoUrl,'https://example.invalid/01234567890.jpeg');
  assert.match(calls[0].sql,/r.visible=true/);assert.match(calls[0].sql,/p.is_public=true/);assert.match(calls[0].sql,/p.archived_at IS NULL/);assert.match(calls[0].sql,/LIMIT 5 OFFSET/);assert.deepEqual(calls[0].args,['p',5]);
  const unsafe=createReviewRepository({query:async()=>({rows:[row]})},{photoBaseUrl:'javascript:{cpf}'});assert.equal((await unsafe.listReviews('p')).items[0].photoUrl,null);
});
test('total vazio, última página e cabeçalho com badge e navegação acessível',async()=>{
  const empty=createReviewRepository({query:async()=>({rows:[{total:0,id:null}]})});
  assert.deepEqual(await empty.listReviews('p'),{items:[],total:0,totalPages:1,page:1,nextPage:null});
  const {projectPage}=require('../server/public/pages.cjs');
  const html=projectPage(project,{items:[],total:12,totalPages:3,page:2,nextPage:3});
  assert.match(html,/class="review-count"[^>]*>12<\/span>/);
  assert.match(html,/Página 2 de 3/);assert.match(html,/rel="prev"/);assert.match(html,/rel="next"/);
});
test('limitação HTTP conta tentativas e ignora IP forjado nos cabeçalhos',async t=>{
  const f=await fixture(t);const formToken=await f.token();
  for(let i=0;i<10;i++)assert.equal((await f.post({...valid,formToken,rating:0},{'X-Forwarded-For':`192.0.2.${i}`})).status,400);
  const limited=await f.post({...valid,formToken},{'X-Forwarded-For':'198.51.100.1'});
  assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('retry-after'))>0);assert.equal(f.reviews.length,0);
});
test('erros de banco com status não publicam mensagens internas e paginação inválida é recusada',async t=>{
  const f=await fixture(t,{reviewRepository:{listReviews:async()=>{throw Object.assign(Error('private detail'),{status:400});}}});
  const response=await fetch(f.base+'/api/public/projects/~public/reviews');assert.doesNotMatch(await response.text(),/private detail/);
  const g=await fixture(t);
  for(const page of ['-1','0','x','10001','1.5'])assert.equal((await fetch(g.base+`/api/public/projects/~public/reviews?page=${page}`)).status,400);
});
test('foto permanece com avatar durante carregamento e falha; sucesso revela imagem',()=>{
  const vm=require('node:vm'),fs=require('node:fs');const listeners={};
  const image={hidden:true,naturalWidth:0,dataset:{reviewPhoto:'https://example.invalid/synthetic.jpeg'},addEventListener:(event,fn)=>{listeners[event]=fn;}};
  const context={document:{querySelectorAll:()=>[image],querySelector:()=>null}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/scripts/reviews.js'),'utf8'),context);
  assert.equal(image.hidden,true);assert.equal(image.src,image.dataset.reviewPhoto);
  listeners.error();assert.equal(image.hidden,true);image.naturalWidth=48;listeners.load();assert.equal(image.hidden,false);listeners.error();assert.equal(image.hidden,true);
});
test('corpo fragmentado é limitado sem depender de Content-Length e libera listeners',async()=>{
  const {PassThrough}=require('node:stream');const {readBody}=require('../server/public/review-http.cjs');
  const body=new PassThrough();const read=readBody(body);body.write('a'.repeat(8000));body.write('a'.repeat(9000));
  await assert.rejects(read,e=>e.status===413);body.end();assert.equal(body.listenerCount('data'),0);
});
