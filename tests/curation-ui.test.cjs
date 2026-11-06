const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('curadoria renderiza estado, ações, paginação e conteúdo escapado sem campos sensíveis',()=>{
  const {render}=require('../src/web/scripts/curation.js');
  const html=render({items:[{id:'r"',name:'<img src=x>',comment:'<script>x</script>',rating:3,visible:false,createdAt:'2026-11-06T12:00:00Z',cpf:'secret'}],page:2,total:11,totalPages:2});
  assert.match(html,/Oculta/);assert.match(html,/Reexibir/);assert.match(html,/Página 2 de 2/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<img|secret/);
  assert.match(render({items:[],page:1,total:0,totalPages:1}),/Sem avaliações/);
});
test('transporte da curadoria codifica IDs e envia visibilidade/estado original com CSRF',async()=>{
  const calls=[];const context=vm.createContext({location:{assign(){}},fetch:async(path,options)=>{calls.push({path,options});return Response.json(path==='/api/csrf'?{token:'synthetic'}:{});}});
  vm.runInContext(fs.readFileSync(require.resolve('../src/infrastructure/remote-storage.js'),'utf8'),context);
  await context.VaultStorage.listProjectReviews('..',2);assert.equal(calls.at(-1).path,'/api/projects/~../reviews?page=2');
  await context.VaultStorage.setReviewVisibility('a/b','r/#',false,true);
  const call=calls.at(-1);assert.equal(call.path,'/api/projects/~a%2Fb/reviews/~r%2F%23');
  assert.deepEqual(JSON.parse(call.options.body),{visible:false,expectedVisible:true});assert.equal(call.options.headers['x-vault-csrf'],'synthetic');
});
test('controlador bloqueia clique duplo, mantém confirmação após falha de leitura e oferece fallback',async()=>{
  const handlers={},error={textContent:''},status={textContent:''},list={innerHTML:'',querySelectorAll:()=>[]};
  const notice={hidden:true,querySelector:()=>status,contains:()=>false};
  const root={isConnected:true,innerHTML:'',contains:()=>true,querySelector:s=>({'[data-list]':list,'[role="alert"]':error,'.curation-toast':notice}[s]),addEventListener:(name,handler)=>handlers[name]=handler};
  const context=vm.createContext({HTMLButtonElement:function(){},document:{activeElement:null},setTimeout:()=>1,clearTimeout(){}});
  vm.runInContext(fs.readFileSync(require.resolve('../src/web/scripts/curation.js'),'utf8'),context);
  let calls=0,finish,readFails=false;
  const storage={listProjectReviews:async()=>{if(readFails)throw Error('read failed');return {items:[],page:1,total:0,totalPages:1};},setReviewVisibility:()=>{calls++;return new Promise(resolve=>finish=resolve);}};
  await context.VaultCuration.mount(root,{storage,projectId:'p',onChanged:async()=>{}});
  const button={dataset:{review:'r',visible:'true'},disabled:false,hasAttribute:name=>name==='command',setAttribute(){},removeAttribute(){}};
  const event={target:{closest:()=>button}};
  handlers.click(event);handlers.click(event);assert.equal(calls,1);
  readFails=true;finish();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(notice.hidden,false);assert.equal(status.textContent,'Avaliação ocultada.');assert.match(error.textContent,/Alteração salva/);
  assert.doesNotMatch(error.textContent,/read failed/);
});
