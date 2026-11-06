(function(root){
  async function request(path,method='GET',body){
    const headers={};
    if(method!=='GET'){
      const csrf=await fetch('/api/csrf',{cache:'no-store'});if(!csrf.ok)throw Error('Não foi possível preparar a solicitação.');
      headers['x-vault-csrf']=(await csrf.json()).token;headers['content-type']='application/json';
    }
    const response=await fetch(path,{method,headers,cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(response.status===401||response.status===403){location.assign('/auth');throw Error('Entre novamente para continuar.');}
    const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível salvar.');return data;
  }
  async function read(){const state=await request('/api/projects');return {raw:JSON.stringify(state),state};}
  const reviewsPath=id=>`/api/projects/~${encodeURIComponent(id)}/reviews`;
  root.VaultStorage={remote:true,KEY:null,initialize:read,read,listUsers:()=>request('/api/users'),
    listProjectReviews:(id,page=1)=>request(`${reviewsPath(id)}?page=${page}`),
    setReviewVisibility:(id,reviewId,visible,expectedVisible)=>request(`${reviewsPath(id)}/~${encodeURIComponent(reviewId)}`,'POST',{visible,expectedVisible}),
    async commit(_storage,raw,next){
    const previous=JSON.parse(raw).projects;
    const changes=next.filter(p=>!previous.some(old=>old.id===p.id)||root.VaultAudit.changedFields(previous.find(old=>old.id===p.id),p).length);
    const removed=previous.filter(p=>!next.some(item=>item.id===p.id));
    if(changes.length+removed.length>1)throw Error('Salve um projeto por vez.');
    if(changes.length){const p=changes[0],old=previous.find(item=>item.id===p.id);await request('/api/projects','POST',{project:p,expectedVersion:old?.version??null});}
    const removal=removed.length?await request(`/api/projects/${encodeURIComponent(removed[0].id)}`,'DELETE',{expectedVersion:removed[0].version}):null;
    return {...await read(),removal};
  }};
})(globalThis);
