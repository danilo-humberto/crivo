const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPublicRepository}=require('../server/persistence/public-repository.cjs');

const row={id:'public',title:'Projeto',description:'Resumo',solution:'Solução',category:'Operações',status:'Planejado',requested:'2026-11-06',completed:'',owner:'Equipe',url:null};
test('consulta pública seleciona somente campos permitidos e filtra privados/arquivados no SQL',async()=>{
  const calls=[];
  const repo=createPublicRepository({query:async(sql,params)=>{calls.push({sql,params});return {rows:[{...row,cost:999,cpf:'sensitive',owner_id:'internal',audit:[],alternatives:[]}]};}});
  assert.deepEqual(await repo.listProjects(),[Object.fromEntries(Object.entries(row).filter(([key])=>key!=='url'))]);
  assert.deepEqual(await repo.getProject("id' OR true --"),Object.fromEntries(Object.entries(row).filter(([key])=>key!=='url')));
  for(const {sql} of calls){
    assert.match(sql,/is_public\s*=\s*true/i);assert.match(sql,/archived_at IS NULL/i);
    assert.match(sql,/CASE WHEN show_solution_url THEN solution_url ELSE NULL END/i);
    assert.doesNotMatch(sql,/SELECT\s+\*|\bcost\b|\bcpf\b|\bowner_id\b|vault\.(audit|alternatives|internal_users)/i);
    assert.doesNotMatch(sql,/status\s*=/i);
  }
  assert.deepEqual(calls[1].params,["id' OR true --"]);
  assert.ok(!calls[1].sql.includes("id' OR true --"));
});
test('consulta individual ausente retorna null; URL só sai quando segura e selecionada',async()=>{
  let rows=[];
  const repo=createPublicRepository({query:async()=>({rows})});
  assert.equal(await repo.getProject('absent'),null);
  for(const url of [null,'','javascript:alert(1)','data:text/html,test']){
    rows=[{...row,url}];assert.ok(!Object.hasOwn(await repo.getProject('public'),'url'));
  }
  rows=[{...row,url:'https://example.invalid/solution'}];
  assert.equal((await repo.getProject('public')).url,'https://example.invalid/solution');
});
