const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAuthRepository}=require('../server/auth/repository.cjs');
const {requireInternal}=require('../server/auth/policy.cjs');
const fs=require('node:fs');
const vm=require('node:vm');
const session={user:{id:'subject',emailVerified:true},session:{expiresAt:'2099-01-01'}};

test('lista de responsáveis fornece foto e nome sem devolver CPF',async()=>{
  const repository=createAuthRepository({query:async()=>({rows:[{id:'u',name:'Pessoa',cpf:'01234567890'},{id:'v',name:'Sem foto',cpf:null}]})},{photoBaseUrl:'https://example.invalid/{cpf}.jpeg'});
  assert.deepEqual(await repository.listUsers(),[{id:'u',name:'Pessoa',photoUrl:'https://example.invalid/01234567890.jpeg'},{id:'v',name:'Sem foto',photoUrl:null}]);
});
test('perfil compõe foto com CPF salvo, sem devolver campo de CPF',async()=>{
  const pool={query:async()=>({rows:[{id:'local',name:'Pessoa Teste',active:true,cpf:'01234567890'}]})};
  const repository=createAuthRepository(pool,{photoBaseUrl:'https://example.invalid/photos/{cpf}.jpeg'});
  const user=await requireInternal(session,repository.lookup);
  assert.deepEqual(user,{id:'local',name:'Pessoa Teste',photoUrl:'https://example.invalid/photos/01234567890.jpeg'});
  assert.equal('cpf' in user,false);
});
test('avatar mantém iniciais sem foto, no erro e até concluir carregamento',()=>{
  function element(){return {children:[],hidden:false,events:{},setAttribute(){},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.events[name]=fn;},remove(){this.removed=true;}};}
  const context={document:{createElement:element,querySelector:()=>null}};
  vm.runInNewContext(fs.readFileSync('src/web/scripts/profile.js','utf8'),context);
  const container=element();
  context.VaultProfile.render(container,{name:'Pessoa Teste'});
  assert.equal(container.children[0].children[0].textContent,'PT');
  assert.equal(container.children[0].children.length,1);
  context.VaultProfile.render(container,{name:'Pessoa Teste',photoUrl:'https://example.invalid/photo.jpeg'});
  let [initials,img]=container.children[0].children;
  assert.equal(img.hidden,true);assert.equal(initials.hidden,false);
  img.events.error();assert.equal(img.removed,true);assert.equal(initials.hidden,false);
  context.VaultProfile.render(container,{name:'Pessoa Teste',photoUrl:'https://example.invalid/photo.jpeg'});
  [initials,img]=container.children[0].children;img.events.load();
  assert.equal(img.hidden,false);assert.equal(initials.hidden,true);
  context.VaultProfile.render(container,null);assert.equal(container.hidden,true);assert.equal(container.children.length,0);
});
test('perfil sem CPF ou configuração segura fornece fallback',async()=>{
  for(const cpf of [null,'invalid']){
    const repository=createAuthRepository({query:async()=>({rows:[{id:'local',name:'Teste',active:true,cpf}]})});
    assert.equal((await repository.lookup('subject')).photoUrl,null);
  }
  const repository=createAuthRepository({query:async()=>({rows:[{cpf:'01234567890'}]})},{photoBaseUrl:'javascript:{cpf}'});
  assert.equal((await repository.lookup('subject')).photoUrl,null);
});
