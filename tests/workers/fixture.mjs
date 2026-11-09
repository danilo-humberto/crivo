import {serve} from '../../workers/bridge.mjs';
import {workerProtection} from '../../workers/protection.mjs';
export {ReviewLimiter} from '../../workers/review-limiter.mjs';

// Imported only by the local test entry. Never part of the publication bundle.
const projects=new Map(),reviews=[],audit=[];
const user={id:'synthetic-user',name:'Pessoa sintética',active:true};
const fail=status=>Object.assign(Error('Falha sintética'),{status});
const pub=p=>p?.public&&!p.archived?{id:p.id,title:p.title,description:p.description,solution:p.solution,category:p.category,status:p.status,owner:user.name,requested:'2026-11-09',completed:''}:null;
const auth={session:async req=>req.headers.cookie?.includes('synthetic_session=yes')?{user:{id:user.id,emailVerified:true},session:{expiresAt:'2099-01-01T00:00:00Z'}}:null,
  proxy:async(req,action)=>new Response(JSON.stringify({status:true}),{headers:{'Set-Cookie':action==='sign-out'?'synthetic_session=; Path=/; Max-Age=0':'synthetic_session=yes; Path=/; HttpOnly; SameSite=Strict'}})};
const options={auth,authRepository:{lookup:async()=>user,listUsers:async()=>[user]},
  publicRepository:{listProjects:async()=>[...projects.values()].map(pub).filter(Boolean),getProject:async id=>pub(projects.get(id))},
  reviewRepository:{listReviews:async id=>({items:reviews.filter(r=>r.projectId===id&&r.visible).map(({cpf,visible,projectId,...r})=>r),nextPage:null}),
    addReview:async(id,input)=>{if(reviews.some(r=>r.projectId===id&&r.cpf===input.cpf))throw fail(409);const r={...input,id:crypto.randomUUID(),projectId:id,visible:true,createdAt:new Date().toISOString(),photoUrl:null};reviews.push(r);return {id:r.id};}},
  repository:{listState:async()=>({projects:[...projects.values()],audit}),
    saveProject:async p=>{projects.set(p.id,p);audit.push({type:'saved',actorId:user.id,projectId:p.id});return p;},
    listProjectReviews:async id=>({items:reviews.filter(r=>r.projectId===id),nextPage:null}),
    setReviewVisibility:async(pid,rid,visible)=>{const r=reviews.find(r=>r.projectId===pid&&r.id===rid);if(!r)throw fail(404);r.visible=visible;audit.push({type:'visibility',actorId:user.id,projectId:pid});return r;},
    deleteProject:async id=>{if(reviews.some(r=>r.projectId===id)){projects.get(id).archived=true;}else projects.delete(id);audit.push({type:'removed',actorId:user.id,projectId:id});return {id};}}
};
export default {fetch(request,env,ctx){
  return serve(request,env,ctx,{...options,origin:new URL(request.url).origin,
    reviewProtection:workerProtection(env),clientIp:()=> request.headers.get('x-test-ip')||'127.0.0.1'});
}};
