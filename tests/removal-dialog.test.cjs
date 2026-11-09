const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(){
  const source=fs.readFileSync('src/web/scripts/app.js','utf8');
  const start=source.indexOf('function confirmProjectRemoval(');
  assert.ok(start>=0,'confirmação personalizada deve existir');
  const end=source.indexOf('\nfunction ',start+1);
  const fields=new Map();const get=id=>{if(!fields.has(id))fields.set(id,{textContent:''});return fields.get(id);};
  const dialog=get('#remove-dialog');dialog.returnValue='remove';dialog.addEventListener=(_type,fn)=>{dialog.onclose=fn;};dialog.showModal=()=>{dialog.open=true;};
  const context={$:get,VaultStorage:{remote:true}};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  return {get,dialog,open:title=>context.confirmProjectRemoval(title),close:value=>{dialog.returnValue=value;dialog.open=false;dialog.onclose();}};
}
test('remoção aguarda decisão explícita e não reutiliza confirmação anterior',async()=>{
  const ui=setup();const result=ui.open('Projeto <sintético>');assert.equal(ui.dialog.returnValue,'');assert.equal(ui.get('#remove-project-name').textContent,'Projeto <sintético>');
  let settled=false;result.then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);
  ui.close('remove');assert.equal(await result,true);assert.equal(ui.dialog.returnValue,'');
  const dismissed=ui.open('Outro projeto');ui.close('');assert.equal(await dismissed,false);
});
test('cancelamento não autoriza remoção e markup prioriza ação segura',async()=>{
  const ui=setup(),result=ui.open('Projeto');ui.close('cancel');assert.equal(await result,false);
  const html=fs.readFileSync('src/web/pages/index.html','utf8');
  assert.match(html,/<dialog id="remove-dialog" aria-labelledby="remove-title" aria-describedby="remove-explanation"/);
  assert.match(html,/<button[^>]*value="cancel"[^>]*autofocus/);
  assert.doesNotMatch(fs.readFileSync('src/web/scripts/app.js','utf8'),/if\(!confirm\('Remover/);
});
