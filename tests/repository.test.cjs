const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRepository}=require('../server/persistence/repository.cjs');
const {prepareImport}=require('../server/persistence/import.cjs');
const project=()=>({id:'synthetic',title:'Projeto',description:'Descrição',solution:'Solução',owner:'Equipe',category:'Operações',status:'Planejado',requested:'2026-11-04',completed:'',cost:10,url:'',alternatives:[]});
function database(respond) {
  const calls=[];
  return {calls,connect:async()=>({query:async(sql,params=[])=>{
    calls.push({sql,params});return respond(sql,params)??{rows:[]};
  },release:()=>calls.push({sql:'release'})})};
}
test('repetir importação igual não tenta inserir projetos ou histórico',async()=>{
  const input={version:2,projects:[project()],audit:[]},options={source:'test',examples:'keep'};
  const plan=prepareImport(input,options);
  const pool=database(sql=>sql.startsWith('SELECT digest')?{rows:[{digest:plan.digest,counts:plan.counts}]}:undefined);
  assert.deepEqual(await createRepository(pool).importState(input,options),{repeated:true,counts:plan.counts});
  assert.ok(!pool.calls.some(c=>c.sql.includes('INSERT INTO vault.projects')));
});
test('origem alterada recusa importação e reverte transação',async()=>{
  const pool=database(sql=>sql.startsWith('SELECT digest')?{rows:[{digest:'different'}]}:undefined);
  await assert.rejects(createRepository(pool).importState({version:2,projects:[],audit:[]},{source:'test',examples:'keep'}),/Reconciliação/);
  assert.deepEqual(pool.calls.slice(-2).map(c=>c.sql),['ROLLBACK','release']);
});
test('importação preserva evento legado e não confia em actorId fornecido no arquivo',async()=>{
  const p=project();
  const event={id:'synthetic-event',projectId:p.id,action:'created',at:'2026-11-04T12:00:00Z',actor:'Não identificado',actorId:'forged',before:null,after:p};
  const pool=database(sql=>sql.includes('RETURNING source')?{rows:[{source:'test'}]}:undefined);
  await createRepository(pool).importState({version:2,projects:[p],audit:[event]},{source:'test',examples:'keep'});
  const entry=pool.calls.find(c=>c.sql.startsWith('INSERT INTO vault.audit'));
  assert.equal(entry.params[4],null);
  assert.deepEqual(JSON.parse(entry.params[8]),event);
});
test('falha de auditoria solicita rollback após gravar projeto e alternativas',async()=>{
  const p={...project(),owner_id:'test'}; let reads=0;
  const pool=database(sql=>{
    if(sql.startsWith('SELECT name FROM'))return {rows:[{name:'Usuário sintético'}]};
    if(sql.includes('FROM vault.projects'))return {rows:reads++?[{...p,version:1}]:[]};
    if(sql.startsWith('INSERT INTO vault.audit'))throw Error('audit failure');
  });
  await assert.rejects(createRepository(pool).saveProject(p,{actorId:'test'}),/audit failure/);
  assert.ok(pool.calls.some(c=>c.sql.startsWith('INSERT INTO vault.projects')));
  assert.ok(!pool.calls.some(c=>c.sql==='COMMIT'));
  assert.deepEqual(pool.calls.slice(-2).map(c=>c.sql),['ROLLBACK','release']);
});
test('versão desatualizada não escreve projeto',async()=>{
  const pool=database(sql=>{
    if(sql.startsWith('SELECT name FROM'))return {rows:[{name:'Usuário sintético'}]};
    if(sql.includes('FROM vault.projects'))return {rows:[{...project(),version:2}]};
  });
  await assert.rejects(createRepository(pool).saveProject(project(),{actorId:'test',expectedVersion:1}),/Conflito/);
  assert.ok(!pool.calls.some(c=>c.sql.startsWith('UPDATE')));
});
test('duplicidade de avaliação não propaga detalhes sensíveis do banco',async()=>{
  const pool=database(sql=>{
    if(sql.startsWith('SELECT id'))return {rows:[{id:'synthetic'}]};
    if(sql.startsWith('INSERT INTO vault.reviews'))throw Object.assign(Error('sensitive detail'),{code:'23505'});
  });
  await assert.rejects(createRepository(pool).addReview('synthetic',{name:'Pessoa',cpf:'01234567890',rating:5,comment:'Teste'}),error=>{
    assert.equal(error.message,'Avaliação já registrada neste projeto.');return true;
  });
});
test('projeto privado ou ausente não aceita avaliação',async()=>{
  const pool=database(()=>undefined);
  await assert.rejects(createRepository(pool).addReview('synthetic',{name:'Pessoa',cpf:'01234567890',rating:5,comment:'Teste'}),/indisponível/);
  assert.ok(!pool.calls.some(c=>c.sql.startsWith('INSERT')));
});
