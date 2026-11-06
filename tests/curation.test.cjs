const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createRepository}=require('../server/persistence/repository.cjs');
const {createPublicRepository}=require('../server/persistence/public-repository.cjs');
const {createServer}=require('../server/server.cjs');
const {catalogPage}=require('../server/public/pages.cjs');
const {validateState}=require('../src/domain/audit.js');
const project={id:'p',title:'Projeto sintético',owner:'Equipe',description:'Resumo',category:'Operações',status:'Planejado',requested:'2026-11-06',completed:''};
const review={id:'r',name:'Pessoa sintética',rating:4,comment:'Comentário sintético',visible:true,created_at:'2026-11-06T12:00:00Z'};
function fixture({active=true,exists=true,reviewExists=true,visible=true,auditFails=false}={}){
  const calls=[];let row={...review,visible};
  const client={release(){},async query(sql,params=[]){
    calls.push({sql,params});
    if(sql.startsWith('SELECT name FROM vault.internal_users'))return {rows:active?[{name:'Autor real'}]:[]};
    if(sql.startsWith('SELECT id,title,owner_legacy'))return {rows:exists?[project]:[]};
    if(sql.startsWith('SELECT id,name,rating,comment,visible,created_at'))return {rows:reviewExists?[{...row}]:[]};
    if(sql.startsWith('UPDATE vault.reviews'))row.visible=params[2];
    if(sql.startsWith('INSERT INTO vault.audit')&&auditFails)throw Error('audit failure');
    return {rows:[]};
  }};
  return {calls,repo:createRepository({connect:async()=>client})};
}
const opts={actorId:'actor',expectedVisible:true};
test('auditoria de curadoria preserva exportação/importação e recusa snapshots ou transições adulterados',()=>{
  const {prepareImport}=require('../server/persistence/import.cjs');
  const before={id:'p',title:project.title,owner:project.owner,review:{id:'r',name:'Pessoa',rating:4,comment:'Comentário',visible:true}};
  const after={...before,review:{...before.review,visible:false}};
  const event={id:'event',projectId:'p',action:'review_hidden',actor:'Autor',at:review.created_at,before,after};
  const state={version:2,projects:[],audit:[event]};
  assert.deepEqual(prepareImport(state,{source:'synthetic',examples:'keep'}).state.audit,[event]);
  for(const bad of [{...after,review:{...after.review,cpf:'private'}},{...after,review:{...after.review,rating:'<img>'}},{...after,review:{...after.review,visible:true}},{...after,review:{...after.review,id:'other'}}]){
    assert.throws(()=>validateState({...state,audit:[{...event,after:bad}]}),/curadoria/);
  }
});
test('listagem interna inclui ocultas, pagina com snapshot consistente e não seleciona CPF',async()=>{
  const calls=[];const repo=createRepository({connect:async()=>({release(){},query:async(sql,params=[])=>{
    calls.push({sql,params});
    if(sql.startsWith('SELECT id,title'))return {rows:[project]};
    if(sql.startsWith('SELECT count'))return {rows:[{total:11}]};
    if(sql.startsWith('SELECT id,name'))return {rows:[{...review,visible:false,cpf:'private',photoUrl:'private'}]};
    return {rows:[]};
  }})});
  const result=await repo.listProjectReviews('p',100);
  assert.equal(result.page,2);assert.equal(result.totalPages,2);assert.equal(result.total,11);
  assert.equal(result.items[0].visible,false);assert.deepEqual(Object.keys(result.items[0]).sort(),['id','name','rating','comment','visible','createdAt'].sort());
  assert.ok(calls.some(c=>c.sql==='SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'));
  const list=calls.find(c=>c.sql.startsWith('SELECT id,name'));assert.deepEqual(list.params,['p',10]);assert.doesNotMatch(list.sql,/cpf|visible\s*=/i);
  await assert.rejects(repo.listProjectReviews('p',0),{status:400});
  const missing=fixture({exists:false});await assert.rejects(missing.repo.listProjectReviews('p'),{status:404});
});
test('curadoria altera somente visibilidade e audita autor/snapshots sem CPF na mesma transação',async()=>{
  const f=fixture();assert.deepEqual(await f.repo.setReviewVisibility('p','r',false,opts),{id:'r',visible:false});
  const write=f.calls.find(c=>c.sql.startsWith('UPDATE vault.reviews'));
  assert.deepEqual(write.params,['p','r',false]);assert.doesNotMatch(write.sql,/cpf|DELETE|rating\s*=/i);
  const audit=f.calls.find(c=>c.sql.startsWith('INSERT INTO vault.audit'));
  assert.equal(audit.params[2],'review_hidden');assert.equal(audit.params[4],'actor');assert.equal(audit.params[5],'Autor real');
  const before=JSON.parse(audit.params[6]),after=JSON.parse(audit.params[7]);
  assert.equal(before.review.visible,true);assert.equal(after.review.visible,false);assert.equal(after.review.id,'r');
  assert.doesNotMatch(JSON.stringify(audit.params),/cpf|photoUrl/);
  assert.equal(f.calls.at(-1).sql,'COMMIT');
  assert.ok(f.calls.some(c=>c.sql.includes('FOR UPDATE')));
  validateState({version:2,projects:[],audit:[{id:'event',projectId:'p',action:'review_hidden',actor:'Autor real',at:review.created_at,before,after}]});
});
test('reexibição audita, repetição não duplica evento e estado concorrente é recusado',async()=>{
  const f=fixture({visible:false});await f.repo.setReviewVisibility('p','r',true,{...opts,expectedVisible:false});
  assert.equal(f.calls.find(c=>c.sql.startsWith('INSERT INTO vault.audit')).params[2],'review_shown');
  const same=fixture();await same.repo.setReviewVisibility('p','r',true,opts);
  assert.ok(!same.calls.some(c=>/^(UPDATE|INSERT)/.test(c.sql)));
  const conflict=fixture({visible:false});await assert.rejects(conflict.repo.setReviewVisibility('p','r',true,opts),{status:409});
  assert.ok(!conflict.calls.some(c=>/^(UPDATE|INSERT)/.test(c.sql)));
});
test('curadoria recusa dados inválidos, autor inativo, projeto/avaliação ausentes e reverte falha de auditoria',async()=>{
  for(const value of ['false',null,0]){const f=fixture();await assert.rejects(f.repo.setReviewVisibility('p','r',value,opts),{status:400});assert.equal(f.calls.length,0);}
  for(const [settings,status] of [[{active:false},403],[{exists:false},404],[{reviewExists:false},404]]){
    const f=fixture(settings);await assert.rejects(f.repo.setReviewVisibility('p','r',false,opts),{status});
    assert.ok(!f.calls.some(c=>/^(UPDATE|INSERT)/.test(c.sql)));
  }
  const f=fixture({auditFails:true});await assert.rejects(f.repo.setReviewVisibility('p','r',false,opts),/audit failure/);
  assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.ok(!f.calls.some(c=>c.sql==='COMMIT'));
});
test('indicadores SQL usam apenas visíveis, não vazam dados e cards levam aos comentários',async()=>{
  const calls=[];const repo=createPublicRepository({query:async sql=>{calls.push(sql);return {rows:[{...project,review_count:2,review_average:4.5,cpf:'private',visible:false}]};}});
  const [p]=await repo.listProjects();assert.equal(p.reviewCount,2);assert.equal(p.reviewAverage,4.5);
  assert.equal((await repo.getProject('p')).reviewAverage,4.5);
  for(const sql of calls){assert.match(sql,/count\(\*\)/i);assert.match(sql,/avg\(rating\)/i);assert.match(sql,/visible=true/);assert.doesNotMatch(sql,/cpf|comment|SELECT\s+\*/i);}
  assert.ok(!('cpf' in p));
  const html=catalogPage([p]);assert.match(html,/href="\/projetos\/~p#avaliacoes"/);assert.match(html,/4,5 de 5/);assert.match(html,/2 avaliações/);
  assert.match(catalogPage([{...project,reviewCount:0,reviewAverage:null}]),/Sem avaliações/);
});
test('rotas de curadoria exigem usuário interno, origem e CSRF; autor vem da sessão',async t=>{
  let session=null,user=null,saved;
  const server=createServer({origin:'http://localhost',auth:{session:async()=>session},authRepository:{lookup:async()=>user},repository:{
    listProjectReviews:async(id,page)=>({items:[{...review}],page,total:1,totalPages:1}),
    setReviewVisibility:async(...args)=>{saved=args;return {id:'r',visible:false};}
  }});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`,path='/api/projects/~p/reviews';
  assert.equal((await fetch(base+path)).status,401);
  session={user:{id:'external',emailVerified:true},session:{expiresAt:'2099-01-01'}};
  assert.equal((await fetch(base+path)).status,403);
  user={id:'internal',active:true,name:'Autor'};
  assert.equal((await fetch(base+path)).status,200);
  assert.equal((await fetch(base+path+'/~r',{method:'POST',body:'{}'})).status,403);
  const csrf=await fetch(base+'/api/csrf'),token=(await csrf.json()).token;
  const headers={origin:'http://localhost','content-type':'application/json','x-vault-csrf':token,cookie:csrf.headers.get('set-cookie').split(';')[0]};
  const response=await fetch(base+path+'/~r',{method:'POST',headers,body:JSON.stringify({visible:false,expectedVisible:true,actorId:'forged'})});
  assert.equal(response.status,200);assert.deepEqual(saved,['p','r',false,{expectedVisible:true,actorId:'internal'}]);
  for(const query of ['0','-1','abc','1.5','10001'])assert.equal((await fetch(base+path+'?page='+query)).status,400);
  user.active=false;assert.equal((await fetch(base+path+'/~r',{method:'POST',headers,body:'{}'})).status,403);
});
