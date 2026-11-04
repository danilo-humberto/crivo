const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAuthRepository}=require('../server/auth/repository.cjs');
const {bootstrap}=require('../server/auth/bootstrap.cjs');
const {createInviteToken}=require('../server/auth/policy.cjs');
function database(answer){const calls=[];const client={query:async(sql,params)=>{calls.push({sql,params});return answer(sql,params);},release(){calls.push({sql:'release'});}};return {calls,pool:{connect:async()=>client,query:client.query}};}
test('aceite usa hash e transação; convite indisponível reverte o usuário inserido',async()=>{
  const db=database(sql=>({rows:sql.startsWith('SELECT id,issuer_id')?[{id:'invite',issuer_id:'issuer'}]:sql.includes('active=true')?[{id:'issuer'}]:[]}));
  const token=createInviteToken();await assert.rejects(createAuthRepository(db.pool).accept('subject',{token,name:'Teste',cpf:'01234567890'}),{status:409});
  assert.ok(db.calls.some(c=>c.sql.startsWith('INSERT INTO vault.internal_users')));
  const update=db.calls.find(c=>c.sql.startsWith('UPDATE vault.invitations'));assert.match(update.sql,/expires_at>clock_timestamp/);assert.match(update.sql,/revoked_at IS NULL/);assert.match(update.sql,/consumed_at IS NULL/);
  assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));assert.ok(!db.calls.some(c=>c.sql==='COMMIT'));
  assert.ok(!JSON.stringify(db.calls).includes(token));
});
test('CPF inválido não inicia transação e usuário existente não é reativado',async()=>{
  const db=database(sql=>({rows:sql.startsWith('SELECT id,issuer_id')?[{id:'invite',issuer_id:'issuer'}]:sql.includes('active=true')?[{id:'issuer'}]:sql.includes('auth_subject')?[{id:'existing'}]:[]}));
  const repository=createAuthRepository(db.pool),input={token:createInviteToken(),name:'Teste',cpf:'invalid'};
  await assert.rejects(repository.accept('subject',input),{status:400});assert.equal(db.calls.length,0);
  await assert.rejects(repository.accept('subject',{...input,cpf:'01234567890'}),{status:409});
  assert.ok(!db.calls.some(c=>c.sql.startsWith('INSERT')));
});
test('revogação exige emissor ativo e não altera convite consumido',async()=>{
  const db=database(sql=>({rows:sql.includes('active=true')?[{id:'issuer'}]:[]}));
  await assert.rejects(createAuthRepository(db.pool).revoke('invite','issuer'),{status:409});
  const update=db.calls.find(c=>c.sql.startsWith('UPDATE'));assert.match(update.sql,/issuer_id=\$2/);assert.match(update.sql,/consumed_at IS NULL/);
});
test('bootstrap confere identidade e impede segundo provisionamento',async()=>{
  const session={user:{id:'subject',email:'test@example.invalid',emailVerified:true},session:{expiresAt:'2099-01-01'}};
  const input={subject:'subject',email:'test@example.invalid',name:'Teste',cpf:'01234567890'};
  const db=database(sql=>({rows:sql.startsWith('SELECT id')?[{id:'existing'}]:[]}));
  await assert.rejects(bootstrap(db.pool,session,{...input,subject:'forged'}),{status:400});assert.equal(db.calls.length,0);
  await assert.rejects(bootstrap(db.pool,session,input),{status:409});assert.ok(db.calls.some(c=>c.sql.startsWith('LOCK TABLE')));assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));
});
