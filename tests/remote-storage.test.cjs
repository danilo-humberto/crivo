const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('gestão remota envia versão original e não usa localStorage como fallback',async()=>{
  const requests=[],state={version:2,projects:[{id:'p',title:'Antes',version:7}],audit:[]};
  let failed=false;
  const context=vm.createContext({
    VaultAudit:{changedFields:(a,b)=>a.title===b.title?[]:['title']},location:{assign(){}},
    fetch:async(path,options)=>{requests.push({path,options});if(failed)return Response.json({error:'Indisponível'},{status:503});return Response.json(path==='/api/csrf'?{token:'synthetic'}:state);}
  });
  vm.runInContext(fs.readFileSync(require.resolve('../src/infrastructure/remote-storage.js'),'utf8'),context);
  const loaded=await context.VaultStorage.initialize();
  await context.VaultStorage.commit(null,loaded.raw,[{id:'p',title:'Depois'}]);
  const mutation=requests.find(r=>r.options.method==='POST');
  assert.equal(JSON.parse(mutation.options.body).expectedVersion,7);
  assert.equal(mutation.options.headers['x-vault-csrf'],'synthetic');
  failed=true;await assert.rejects(context.VaultStorage.read(),/Indisponível/);
});

test('alterações isoladas de visibilidade e vínculo são enviadas; arquivamento retorna ação',async()=>{
  const requests=[],state={version:2,projects:[{id:'p',owner:'Mesmo nome',owner_id:'first',is_public:false,show_solution_url:false,version:3}],audit:[]};
  const context=vm.createContext({VaultAudit:require('../src/domain/audit.js'),location:{assign(){}},fetch:async(path,options)=>{
    requests.push({path,options});return Response.json(path==='/api/csrf'?{token:'synthetic'}:options.method==='DELETE'?{id:'p',action:'archived'}:state);
  }});
  vm.runInContext(fs.readFileSync(require.resolve('../src/infrastructure/remote-storage.js'),'utf8'),context);
  const loaded=await context.VaultStorage.initialize();
  for(const change of [{is_public:true},{show_solution_url:true},{owner_id:'second'}]){
    await context.VaultStorage.commit(null,loaded.raw,[{...state.projects[0],...change}]);
    const posted=JSON.parse(requests.findLast(r=>r.options.method==='POST').options.body);
    assert.equal(posted.expectedVersion,3);for(const [key,value] of Object.entries(change))assert.equal(posted.project[key],value);
  }
  const removed=await context.VaultStorage.commit(null,loaded.raw,[]);
  assert.equal(removed.removal.action,'archived');
  assert.equal(JSON.parse(requests.find(r=>r.options.method==='DELETE').options.body).expectedVersion,3);
  await context.VaultStorage.listUsers();assert.equal(requests.at(-1).path,'/api/users');
});
