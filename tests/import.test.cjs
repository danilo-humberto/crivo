const {test}=require('node:test');
const assert=require('node:assert/strict');
const {prepareImport}=require('../server/persistence/import.cjs');
const project={id:'synthetic-project',title:'Teste',description:'Descrição',solution:'Solução',owner:'Equipe sintética',category:'Operações',status:'Planejado',requested:'2026-11-04',completed:'',cost:0,url:'',alternatives:[{name:'Alternativa',cost:10.123,notes:''}]};
const state=()=>({version:2,projects:[structuredClone(project)],audit:[{id:'event-1',projectId:project.id,action:'deleted',at:'2026-11-04T12:00:00Z',actor:'Não identificado',before:structuredClone(project),after:null}]});
test('importação preserva histórico, alternativas e responsável sem inventar usuário',()=>{
  const input=state(), result=prepareImport(input,{source:'synthetic',examples:'keep'});
  assert.deepEqual(result.state,input);
  assert.deepEqual(result.counts,{projects:1,alternatives:1,audit:1});
  assert.deepEqual(result.unmappedOwners,['Equipe sintética']);
  input.projects[0].title='Alterado'; assert.equal(result.state.projects[0].title,'Teste');
});
test('digest ignora data da exportação e ordem das chaves, mas detecta conteúdo diferente',()=>{
  const a=state(), b={exportedAt:'2026-11-05',audit:a.audit,projects:a.projects,version:2};
  assert.equal(prepareImport(a,{source:'s',examples:'keep'}).digest,prepareImport(b,{source:'s',examples:'keep'}).digest);
  b.projects=structuredClone(b.projects); b.projects[0].cost=1;
  assert.notEqual(prepareImport(a,{source:'s',examples:'keep'}).digest,prepareImport(b,{source:'s',examples:'keep'}).digest);
});
test('importação exige decisão de exemplos e recusa dados inválidos',()=>{
  assert.throws(()=>prepareImport(state(),{source:'s'}),/exemplos/);
  const invalid=state(); invalid.projects.push(invalid.projects[0]);
  assert.throws(()=>prepareImport(invalid,{source:'s',examples:'keep'}),/duplicados/);
});
test('exclusão explícita remove projeto e seu histórico, mantendo exclusões antigas independentes',()=>{
  const input=state(); input.audit.push({...input.audit[0],id:'demo',demo:true});
  const result=prepareImport(input,{source:'s',examples:'exclude',excludeProjectIds:[project.id]});
  assert.deepEqual(result.counts,{projects:0,alternatives:0,audit:0});
  assert.deepEqual(state().projects[0],project);
  assert.throws(()=>prepareImport(state(),{source:'s',examples:'exclude',excludeProjectIds:['unknown']}),/desconhecido/);
});
