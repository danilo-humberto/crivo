const {test}=require('node:test');
const assert=require('node:assert/strict');
const {requireIdentity,requireInternal,createInviteToken,hashToken,validateAcceptance}=require('../server/auth/policy.cjs');
const session={user:{id:'synthetic-user',emailVerified:true},session:{expiresAt:'2099-01-01T00:00:00Z'}};
test('identidade exige sessão válida, não expirada e e-mail verificado',()=>{
  for(const value of [null,{}, {...session,user:{...session.user,emailVerified:false}}, {...session,session:{expiresAt:'2000-01-01'}}, {...session,session:{}}])assert.throws(()=>requireIdentity(value));
  assert.equal(requireIdentity(session).id,'synthetic-user');
});
test('conta do provedor não concede autorização interna',async()=>{
  for(const user of [null,{id:'local',active:false}])await assert.rejects(requireInternal(session,async()=>user));
  assert.deepEqual(await requireInternal(session,async()=>({id:'local',name:'Teste',active:true,cpf:'secret'})),{id:'local',name:'Teste'});
});
test('convite usa entropia aleatória e hash; aceite valida CPF antes de persistir',()=>{
  const first=createInviteToken(),second=createInviteToken();
  assert.notEqual(first,second);assert.equal(first.length,43);assert.equal(hashToken(first).length,64);
  assert.throws(()=>hashToken('invalid'));assert.throws(()=>validateAcceptance({token:first,name:'Teste',cpf:'00000000000'}));
  assert.equal(validateAcceptance({token:first,name:' Teste ',cpf:'012.345.678-90'}).cpf,'01234567890');
});
