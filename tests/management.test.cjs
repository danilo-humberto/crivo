const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRepository}=require('../server/persistence/repository.cjs');
const {changedFields}=require('../src/domain/audit.js');
const project=()=>({id:'synthetic',title:'Projeto',description:'Descrição',solution:'Solução',owner:'Legado',owner_id:null,is_public:false,show_solution_url:false,archived_at:null,version:1,category:'Operações',status:'Planejado',requested:'2026-11-04',completed:'',cost:10,url:'',alternatives:[]});
function fixture(initial,{reviews=false,ownerActive=true,auditFails=false}={}){
  let row=initial&&structuredClone(initial);const calls=[];
  const pool={connect:async()=>({release(){},async query(sql,params=[]){
    calls.push({sql,params});
    if(sql.startsWith('SELECT name FROM'))return {rows:params[0]==='actor'?[{name:'Autor'}]:ownerActive?[{name:'Selecionado'}]:[]};
    if(sql.startsWith('SELECT id FROM vault.reviews'))return {rows:reviews?[{id:'review'}]:[]};
    if(sql.startsWith('SELECT ')&&sql.includes('FROM vault.projects WHERE id='))return {rows:row?[structuredClone(row)]:[]};
    if(sql.startsWith('INSERT INTO vault.projects'))row={...project(),id:params[0],owner:params[4]};
    if(sql.startsWith('UPDATE vault.projects SET title='))row={...row,title:params[1],owner:params[4],version:row.version+1};
    if(sql.startsWith('UPDATE vault.projects SET owner_id='))row={...row,owner_id:params[1],is_public:params[2],show_solution_url:params[3]};
    if(sql.startsWith('UPDATE vault.projects SET archived_at='))row={...row,archived_at:'2026-11-04T12:00:00Z',version:row.version+1};
    if(sql.startsWith('INSERT INTO vault.audit')&&auditFails)throw Error('audit failure');
    return {rows:[]};
  }})};
  return {repository:createRepository(pool),calls,get row(){return row;}};
}
const options={actorId:'actor',expectedVersion:1};
test('auditoria detecta vínculo mesmo com nomes iguais e controles independentes',()=>{
  const p=project();assert.deepEqual(changedFields(p,{...p,owner_id:'user',is_public:true,show_solution_url:true}),['owner_id','is_public','show_solution_url']);
});
test('seleção explícita usa nome do usuário ativo no servidor e audita autor',async()=>{
  const f=fixture(project());const saved=await f.repository.saveProject({...project(),owner_id:'user',owner:'Forjado'},options);
  assert.equal(saved.owner_id,'user');assert.equal(saved.owner,'Selecionado');
  const audit=f.calls.find(c=>c.sql.startsWith('INSERT INTO vault.audit'));
  assert.equal(audit.params[4],'actor');assert.equal(audit.params[5],'Autor');
  assert.equal(JSON.parse(audit.params[6]).owner,'Legado');assert.equal(JSON.parse(audit.params[7]).owner_id,'user');
});
test('responsável inexistente ou inativo não pode receber nova atribuição',async()=>{
  const f=fixture(project(),{ownerActive:false});
  await assert.rejects(f.repository.saveProject({...project(),owner_id:'missing'},options),/Responsável/);
  assert.ok(!f.calls.some(c=>c.sql.startsWith('UPDATE')));
});
test('legado é preservado sem associação automática ou renomeação livre',async()=>{
  const f=fixture(project());const saved=await f.repository.saveProject({...project(),title:'Alterado',owner:'Outro'},options);
  assert.equal(saved.owner,'Legado');assert.equal(saved.owner_id,null);
});
test('vínculo inativo existente é preservado mas não pode ser removido',async()=>{
  const p={...project(),owner_id:'inactive'};const f=fixture(p,{ownerActive:false});
  const saved=await f.repository.saveProject({...p,title:'Alterado'},options);assert.equal(saved.owner_id,'inactive');
  await assert.rejects(f.repository.saveProject({...p,owner_id:null},{...options,expectedVersion:2}),/Responsável/);
});
test('novo projeto exige responsável e começa privado mesmo com publicação enviada',async()=>{
  const f=fixture(null);
  await assert.rejects(f.repository.saveProject(project(),{actorId:'actor'}),/Responsável/);
  const saved=await f.repository.saveProject({...project(),owner_id:'user',is_public:true,show_solution_url:true},{actorId:'actor'});
  assert.equal(saved.is_public,false);assert.equal(saved.show_solution_url,false);
});
test('visibilidade pode mudar isoladamente e exige booleanos',async()=>{
  const f=fixture(project());const saved=await f.repository.saveProject({...project(),is_public:true},options);
  assert.equal(saved.is_public,true);assert.equal(saved.show_solution_url,false);assert.equal(saved.version,2);
  assert.ok(f.calls.some(c=>c.sql.startsWith('INSERT INTO vault.audit')));
  await assert.rejects(f.repository.saveProject({...project(),is_public:'false'},{...options,expectedVersion:2}),/Visibilidade/);
});
test('sem alterações não cria evento nem incrementa versão',async()=>{
  const f=fixture(project());await f.repository.saveProject(project(),options);
  assert.ok(!f.calls.some(c=>c.sql.startsWith('UPDATE')||c.sql.startsWith('INSERT')));
});
test('projeto com qualquer avaliação é arquivado com snapshots e sem exclusões',async()=>{
  const f=fixture(project(),{reviews:true});const result=await f.repository.deleteProject('synthetic',options);
  assert.equal(result.action,'archived');assert.ok(f.row.archived_at);
  assert.ok(!f.calls.some(c=>c.sql.startsWith('DELETE')));
  const audit=f.calls.find(c=>c.sql.startsWith('INSERT INTO vault.audit'));
  assert.equal(audit.params[2],'archived');assert.equal(JSON.parse(audit.params[6]).archived_at,null);
  assert.ok(JSON.parse(audit.params[7]).archived_at);
  assert.ok(f.calls.some(c=>c.sql.includes('FOR UPDATE')));
  assert.ok(!f.calls.find(c=>c.sql.startsWith('SELECT id FROM vault.reviews')).sql.includes('visible'));
});
test('sem avaliações mantém exclusão; arquivado ou versão antiga recusa nova remoção',async()=>{
  const f=fixture(project());assert.equal((await f.repository.deleteProject('synthetic',options)).action,'deleted');
  assert.ok(f.calls.some(c=>c.sql.startsWith('DELETE FROM vault.projects')));
  for(const p of [{...project(),version:2},{...project(),archived_at:'2026-11-04'}]){
    const other=fixture(p);await assert.rejects(other.repository.deleteProject(p.id,options));
    assert.ok(!other.calls.some(c=>c.sql.startsWith('DELETE')||c.sql.startsWith('UPDATE')));
  }
});
test('falha de auditoria no arquivamento reverte transação',async()=>{
  const f=fixture(project(),{reviews:true,auditFails:true});
  await assert.rejects(f.repository.deleteProject('synthetic',options),/audit failure/);
  assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.ok(!f.calls.some(c=>c.sql==='COMMIT'));
});

test('arquivamento é aceito no histórico somente com snapshots antes e depois',()=>{
  const {validateState}=require('../src/domain/audit.js');
  const before=project(),after={...before,archived_at:'2026-11-04T12:00:00Z'};
  const entry={id:'event',projectId:before.id,action:'archived',at:after.archived_at,actor:'Autor',before,after};
  assert.doesNotThrow(()=>validateState({version:2,projects:[],audit:[entry]}));
  assert.throws(()=>validateState({version:2,projects:[],audit:[{...entry,after:null}]}),/arquivamento/);
});
