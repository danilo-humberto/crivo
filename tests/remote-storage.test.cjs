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
