const {randomBytes,createHash}=require('node:crypto');
const {normalizeCpf}=require('../persistence/reviews.cjs');
function fail(status,message){return Object.assign(new Error(message),{status});}
function requireIdentity(value){
  if(!value?.user?.id||!value.session||!Number.isFinite(Date.parse(value.session.expiresAt))||Date.parse(value.session.expiresAt)<=Date.now())throw fail(401,'Entre novamente.');
  if(value.user.emailVerified!==true)throw fail(403,'Verifique seu e-mail antes de continuar.');
  return value.user;
}
async function requireInternal(session,lookup){
  const identity=requireIdentity(session),user=await lookup(identity.id);
  if(!user?.active)throw fail(403,'Acesso interno não autorizado.');
  return {id:user.id,name:user.name,...(user.photoUrl!==undefined?{photoUrl:user.photoUrl}:{})};
}
const createInviteToken=()=>randomBytes(32).toString('base64url');
function hashToken(token){
  if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))throw fail(400,'Convite inválido.');
  return createHash('sha256').update(token).digest('hex');
}
function validateAcceptance(input){
  const hash=hashToken(input?.token);
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw fail(400,'Nome inválido.');
  let cpf;try{cpf=normalizeCpf(input.cpf);}catch{throw fail(400,'CPF inválido.');}
  return {hash,name:input.name.trim(),cpf};
}
module.exports={fail,requireIdentity,requireInternal,createInviteToken,hashToken,validateAcceptance};
