// Synthetic in-memory preview only. Never load environment credentials or a database.
const {randomUUID}=require('node:crypto');
const {createServer}=require('../../server/server.cjs');
const {projects,reviews,publicRepository,reviewRepository}=require('./public-preview.cjs');
const audit=[];
const internalProject=p=>({...p,cost:0,url:p.url||'',alternatives:[],version:1,owner_id:'preview-user',is_public:true,show_solution_url:!!p.url,archived_at:null});
function createPreviewServer(origin){
  const repository={
    listState:async()=>({version:2,projects:projects.map(internalProject),audit}),
    listProjectReviews:async(id,page=1)=>{
      const items=reviews.get(id)||[],total=items.length,totalPages=Math.max(1,Math.ceil(total/10));page=Math.min(page,totalPages);
      return {items:items.slice((page-1)*10,page*10).map(({id,name,rating,comment,createdAt,visible=true})=>({id,name,rating,comment,createdAt,visible})),total,totalPages,page};
    },
    setReviewVisibility:async(projectId,id,visible,{expectedVisible})=>{
      const p=projects.find(p=>p.id===projectId),r=(reviews.get(projectId)||[]).find(r=>r.id===id);
      if(!p||!r)throw Object.assign(Error('Indisponível.'),{status:404});
      if((r.visible!==false)!==expectedVisible)throw Object.assign(Error('A avaliação mudou. Atualize a lista.'),{status:409});
      if(expectedVisible===visible)return {id,visible};
      const before={id:p.id,title:p.title,owner:p.owner,review:{id:r.id,name:r.name,rating:r.rating,comment:r.comment,visible:expectedVisible}};
      r.visible=visible;
      audit.unshift({id:randomUUID(),projectId,action:visible?'review_shown':'review_hidden',actor:'Pessoa interna sintética',at:new Date().toISOString(),before,after:{...before,review:{...before.review,visible}}});
      return {id,visible};
    }
  };
  return createServer({origin,publicRepository,reviewRepository,repository,
    auth:{session:async()=>({user:{id:'preview-subject',emailVerified:true},session:{expiresAt:'2099-01-01'}})},
    authRepository:{lookup:async()=>({id:'preview-user',active:true,name:'Pessoa interna sintética'}),listUsers:async()=>[{id:'preview-user',name:'Pessoa interna sintética'}]}
  });
}
if(require.main===module){
  const port=Number(process.env.VAULT_PREVIEW_PORT||4188),origin=`http://127.0.0.1:${port}`;
  createPreviewServer(origin).listen(port,'127.0.0.1',()=>console.log(`Prévia sintética de curadoria: ${origin}/management`));
}
module.exports={createPreviewServer};
