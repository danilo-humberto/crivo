const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup({signed=false,sendError=false,signupError=false,refreshError=false}={}){
  const elements=new Map(),calls=[];let focused='',user=signed?{email:'test@example.invalid',emailVerified:false}:null;
  function el(id){if(!elements.has(id))elements.set(id,{id,value:'',hidden:false,disabled:false,textContent:'',listeners:{},style:{setProperty(){}},classList:{toggle(){}},addEventListener(k,fn){this.listeners[k]=fn;},setAttribute(){},removeAttribute(){},getAttribute(k){return k==='aria-controls'?id.replace('tab-','panel-'):null;},focus(){focused=id;},reportValidity(){return true;},querySelector(){return el(id+'-submit');},replaceChildren(){}});return elements.get(id);}
  const tabs=['login','signup','recovery','verify'].map(id=>el('auth-tab-'+id));
  const auth={getSession:async()=>refreshError&&user?{error:{message:'Sessão indisponível'}}:{data:{user}},signUp:{email:async data=>{calls.push(['signup',data.email]);if(signupError)return {error:{message:'Cadastro recusado'}};user={email:data.email,emailVerified:false};return {data:{user}};}},emailOtp:{sendVerificationOtp:async data=>{calls.push(['send',data.email,data.type]);return sendError?{error:{message:'Limite de envio'}}:{data:{}};},verifyEmail:async data=>{calls.push(['verify',data.email,data.otp]);return {data:{}};}}};
  const context={createAuthClient:()=>auth,location:{origin:'http://localhost',hash:'',search:''},URLSearchParams,ResizeObserver:class{observe(){}},VaultProfile:{render(){}},document:{getElementById:el,querySelector:()=>el('tabs'),querySelectorAll:q=>q.includes('.auth-tabs')?tabs:[]},fetch:async path=>({ok:path==='/api/csrf',json:async()=>path==='/api/csrf'?{token:'synthetic'}:{error:'Verifique seu e-mail'}}),FormData:class{constructor(form){return Object.entries(form.data||{});}}};
  vm.runInNewContext(fs.readFileSync('src/web/scripts/auth.js','utf8').replace(/^import .*\n/,''),context);
  return {el,calls,focus:()=>focused,settle:()=>new Promise(setImmediate),submit:async(id,data)=>{el(id).data=data;await el(id).listeners.submit({preventDefault(){},currentTarget:el(id)});},click:async id=>el(id).listeners.click()};
}
test('cadastro envia OTP e leva ao código sem repetir e-mail',async()=>{
  const ui=setup();await ui.settle();await ui.submit('signup',{name:'Sintético',email:'test@example.invalid',password:'synthetic-only'});
  assert.deepEqual(ui.calls,[['signup','test@example.invalid'],['send','test@example.invalid','email-verification']]);
  assert.equal(ui.el('code-email').value,'test@example.invalid');assert.equal(ui.el('verification-email-field').hidden,true);assert.equal(ui.focus(),'verify-otp');
  assert.equal(ui.el('send-code').disabled,false);
});
test('falha de envio preserva conta criada e permite reenviar sem novo cadastro',async()=>{
  const ui=setup({sendError:true});await ui.settle();await ui.submit('signup',{email:'test@example.invalid'});
  assert.match(ui.el('auth-message').textContent,/Conta criada.*não foi possível enviar/i);
  assert.equal(ui.el('code-email').value,'test@example.invalid');await ui.click('send-code');
  assert.equal(ui.calls.filter(c=>c[0]==='signup').length,1);assert.equal(ui.calls.filter(c=>c[0]==='send').length,2);
});
test('sessão não verificada restaura e-mail sem disparar mensagem ao recarregar',async()=>{
  const ui=setup({signed:true});await ui.settle();assert.equal(ui.el('code-email').value,'test@example.invalid');assert.equal(ui.el('verification-email-field').hidden,true);assert.equal(ui.calls.length,0);
  await ui.click('send-code');assert.deepEqual(ui.calls,[['send','test@example.invalid','email-verification']]);
});
test('cadastro recusado não envia código',async()=>{
  const ui=setup({signupError:true});await ui.settle();await ui.submit('signup',{email:'test@example.invalid'});assert.deepEqual(ui.calls,[['signup','test@example.invalid']]);
});
test('falha da consulta de sessão preserva confirmação do cadastro e do envio',async()=>{
  const ui=setup({refreshError:true});await ui.settle();await ui.submit('signup',{email:'test@example.invalid'});
  assert.match(ui.el('auth-message').textContent,/Conta criada. Código enviado/);
  assert.match(ui.el('auth-message').textContent,/sessão/i);
  assert.equal(ui.focus(),'verify-otp');assert.equal(ui.el('code-email').value,'test@example.invalid');
});
test('falhas de envio e sessão não sugerem repetir cadastro',async()=>{
  const ui=setup({refreshError:true,sendError:true});await ui.settle();await ui.submit('signup',{email:'test@example.invalid'});
  assert.match(ui.el('auth-message').textContent,/Conta criada, mas não foi possível enviar/);
  assert.match(ui.el('auth-message').textContent,/Reenviar código/);
  assert.equal(ui.el('send-code').disabled,false);assert.equal(ui.calls.filter(c=>c[0]==='signup').length,1);
});
