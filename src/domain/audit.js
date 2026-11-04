(function(root){
  const core = typeof module !== 'undefined' ? require('./core.js') : root.VaultCore;
  const fields=['title','description','solution','owner','category','status','requested','completed','cost','url','alternatives'];
  function validateProjects(projects){
    if(!Array.isArray(projects))throw Error('Lista de projetos inválida.');
    projects.forEach(core.validateProject);
    if(new Set(projects.map(p=>p.id)).size!==projects.length)throw Error('Projetos duplicados.');
    return projects;
  }
  const canonical=value=>JSON.stringify(value,(_key,v)=>v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
  function changedFields(before,after){return fields.filter(field=>canonical(before?.[field]??'')!==canonical(after?.[field]??''));}
  function event(action,before,after){return {id:crypto.randomUUID(),action,at:new Date().toISOString(),actor:'Não identificado',projectId:(after||before).id,before:before?structuredClone(before):null,after:after?structuredClone(after):null};}
  function validateState(state){
    if(!state || state.version!==2 || !Array.isArray(state.audit))throw Error('Histórico inválido.');
    validateProjects(state.projects);
    const ids=new Set();
    for(const e of state.audit){
      if(!e || typeof e.id!=='string' || ids.has(e.id) || typeof e.projectId!=='string' || typeof e.actor!=='string' || typeof e.at!=='string' || !Number.isFinite(Date.parse(e.at)) || !['baseline','created','updated','deleted'].includes(e.action))throw Error('Registro de auditoria inválido.');
      ids.add(e.id);
      if(e.before!==null)core.validateProject(e.before);
      if(e.after!==null)core.validateProject(e.after);
      if((e.before && e.before.id!==e.projectId)||(e.after && e.after.id!==e.projectId))throw Error('Projeto do histórico inválido.');
      if(['baseline','created'].includes(e.action) && (e.before!==null || !e.after) || e.action==='updated' && (!e.before||!e.after) || e.action==='deleted' && (!e.before||e.after!==null))throw Error('Versão de auditoria inválida.');
    }
    return state;
  }
  function nextState(previous,next){
    validateState(previous);
    validateProjects(next);
    const oldById=new Map(previous.projects.map(p=>[p.id,p]));
    const newById=new Map(next.map(p=>[p.id,p]));
    const entries=[];
    for(const p of next){const before=oldById.get(p.id);if(!before)entries.push(event('created',null,p));else if(changedFields(before,p).length)entries.push(event('updated',before,p));}
    for(const p of previous.projects)if(!newById.has(p.id))entries.push(event('deleted',p,null));
    if(!entries.length)return previous;
    const state={version:2,projects:structuredClone(next),audit:[...entries,...previous.audit]};
    return state;
  }
  const api={validateProjects,validateState,changedFields,fields,event,nextState};
  if(typeof module!=='undefined')module.exports=api;else root.VaultAudit=api;
})(globalThis);
