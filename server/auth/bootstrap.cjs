const {randomUUID}=require('node:crypto');
const {requireIdentity,validateAcceptance,createInviteToken,fail}=require('./policy.cjs');
const {transaction}=require('../persistence/database.cjs');
async function bootstrap(pool,session,input){
  const user=requireIdentity(session);
  if(typeof input.email!=='string'||user.email?.toLowerCase()!==input.email.toLowerCase()||user.id!==input.subject)throw fail(400,'Identidade diferente do destinatário confirmado.');
  const {name,cpf}=validateAcceptance({...input,token:createInviteToken()});
  return transaction(pool,async client=>{
    // One bootstrap, even when two administrative processes run concurrently.
    await client.query('LOCK TABLE vault.internal_users IN EXCLUSIVE MODE');
    if((await client.query('SELECT id FROM vault.internal_users LIMIT 1')).rows.length)throw fail(409,'Provisionamento inicial já realizado.');
    const id=randomUUID();
    await client.query('INSERT INTO vault.internal_users(id,auth_subject,name,cpf,active) VALUES ($1,$2,$3,$4,true)',[id,user.id,name,cpf]);
    return {id};
  });
}
module.exports={bootstrap};
