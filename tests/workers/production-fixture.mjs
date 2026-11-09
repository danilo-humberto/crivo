// Exercises the publication entry and real Neon Auth SDK, replacing external I/O only.
import worker from '../../workers/index.mjs';
import database from '../../server/persistence/database.cjs';
import {NEON_AUTH_SESSION_COOKIE_NAME} from '@neon/auth/server';
export {ReviewLimiter} from '../../workers/review-limiter.mjs';
let created=0,ended=0,queries=0;
database.createPool=()=>{
  created++;let closed=false;
  return {async query(sql,params){
    if(closed)throw Error('Pool reused after close');
    queries++;
    if(!sql.includes('WHERE auth_subject=$1'))throw Error('Unexpected synthetic SQL');
    return {rows:[{id:params[0],name:`Pessoa ${params[0]}`,active:true,cpf:null}]};
  },async end(){if(closed)throw Error('Double close');closed=true;ended++;}};
};
globalThis.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://auth.example.invalid/'))throw Error('External network disabled in tests');
  const cookie=new Headers(options.headers).get('cookie')||'';
  const id=cookie.includes('account-b')?'account-b':'account-a';
  const dates={createdAt:'2026-11-09T00:00:00Z',updatedAt:'2026-11-09T00:00:00Z'};
  return Response.json({user:{...dates,id,emailVerified:true},session:{...dates,expiresAt:'2099-01-01T00:00:00Z'}},{headers:{'Set-Cookie':`${NEON_AUTH_SESSION_COOKIE_NAME}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax`}});
};
export default {fetch(request,env,ctx){
  if(new URL(request.url).pathname==='/__test_counts')return Response.json({created,ended,queries});
  return worker.fetch(request,{...env,APP_ORIGIN:'https://vault.example.invalid',DATABASE_URL:'postgres://synthetic:synthetic@database.invalid/synthetic',
    NEON_AUTH_BASE_URL:'https://auth.example.invalid',NEON_AUTH_COOKIE_SECRET:'synthetic-cookie-secret-at-least-32-bytes',
    REVIEW_SIGNING_SECRET:'synthetic-signing-secret-local-tests-only',EMPLOYEE_PHOTO_BASE_URL:'https://example.invalid/{cpf}.jpeg'},ctx);
}};
