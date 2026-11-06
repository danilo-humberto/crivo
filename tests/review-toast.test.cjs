const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('toast anuncia sucesso, limpa parâmetro da URL e fecha por tempo ou botão sem mudar foco',()=>{
  for(const native of [true,false]){
    const callbacks=[],events={},message={textContent:''};let replaced;
    const button={addEventListener:(name,fn)=>{events[name]=fn;}};
    const toast={hidden:true,dataset:{message:'Avaliação enviada.'},querySelector:selector=>selector==='[role="status"]'?message:button,removeAttribute(){this.fallback=true;},matches:()=>false};
    if(native){toast.showPopover=()=>{toast.open=true;};toast.hidePopover=()=>{toast.open=false;};}
    vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/scripts/review-toast.js'),'utf8'),{document:{querySelector:()=>toast},URL,window:{location:{href:'http://localhost/projetos/~p?page=2&enviada=1#avaliacoes'},history:{state:null,replaceState:(_state,_title,url)=>{replaced=url;}}},setTimeout:fn=>callbacks.push(fn)});
    assert.equal(message.textContent,'Avaliação enviada.');assert.equal(replaced,'/projetos/~p?page=2#avaliacoes');
    assert.equal(toast.hidden,false);if(native)assert.equal(toast.open,true);else assert.equal(toast.fallback,true);
    callbacks[0]();assert.equal(toast.hidden,true);
    toast.hidden=false;events.click();assert.equal(toast.hidden,true);
  }
});
