(function(root){
  const audit = typeof module !== 'undefined' ? require('../domain/audit.js') : root.VaultAudit;
  const {validateProjects,validateState,event,nextState}=audit;
  const KEY='vault-ti.state.v2';
  const LEGACY_KEY='vault-ti.projects.v1';
  function initialize(storage,seed){
    const raw=storage.getItem(KEY);
    if(raw!==null)return {raw,state:validateState(JSON.parse(raw))};
    const legacy=storage.getItem(LEGACY_KEY);
    const projects=structuredClone(validateProjects(legacy===null?seed:JSON.parse(legacy)));
    const state={version:2,projects,audit:projects.map(p=>event('baseline',null,p))};
    const nextRaw=JSON.stringify(state);
    storage.setItem(KEY,nextRaw);
    return {raw:nextRaw,state};
  }
  function commit(storage,expectedRaw,next){
    const raw=storage.getItem(KEY);
    if(raw!==expectedRaw)throw Error('Os dados mudaram em outra aba. Feche a ficha e recarregue antes de tentar novamente.');
    const previous=validateState(JSON.parse(raw));
    const state=nextState(previous,next);
    if(state===previous)return {raw,state:previous};
    const nextRaw=JSON.stringify(state);
    // One atomic localStorage write: projects and history succeed or fail together.
    storage.setItem(KEY,nextRaw);
    return {raw:nextRaw,state};
  }
  function addExamples(storage,result){
    const edited={id:'demo-audit-edited-project',title:'Exemplo: integração de notas fiscais',description:'Integração entre o financeiro e a emissão de notas.',solution:'Importação manual de arquivos ao fim do dia.',owner:'Equipe demonstrativa',category:'Financeiro',status:'Em andamento',requested:'2026-10-01',completed:'',cost:180,url:'',alternatives:[{name:'Integrador fictício',cost:450,notes:'Suporte e conectores inclusos.'}]};
    const completed={...edited,status:'Concluído',completed:'2026-10-20',cost:90,solution:'Importação automática com validação de duplicidades e relatório diário.'};
    const deleted={id:'demo-audit-deleted-project',title:'Exemplo: controle de salas legado',description:'Reserva de salas de reunião por formulário interno.',solution:'Calendário de reservas com confirmação por e-mail. Projeto substituído pelo calendário corporativo.',owner:'Equipe demonstrativa',category:'Operações',status:'Concluído',requested:'2026-08-03',completed:'2026-09-01',cost:35,url:'',alternatives:[{name:'Agenda fictícia',cost:120,notes:'Gestão de salas e equipamentos.'}]};
    const samples=[
      {id:'demo-audit-deletion-v1',action:'deleted',at:'2026-10-21T14:00:00-03:00',actor:'Demonstração fictícia',projectId:deleted.id,before:deleted,after:null,demo:true},
      {id:'demo-audit-edit-v1',action:'updated',at:'2026-10-20T10:30:00-03:00',actor:'Demonstração fictícia',projectId:edited.id,before:edited,after:completed,demo:true}
    ];
    const missing=samples.filter(sample=>!result.state.audit.some(entry=>entry.id===sample.id));
    if(!missing.length)return result;
    if(storage.getItem(KEY)!==result.raw)throw Error('Os dados mudaram em outra aba. Recarregue para adicionar os exemplos.');
    const state=validateState({...result.state,audit:[...result.state.audit,...missing].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))});
    const raw=JSON.stringify(state);
    storage.setItem(KEY,raw);
    return {raw,state};
  }
  function read(storage){
    const raw=storage.getItem(KEY);
    if(raw===null)throw Error('Dados removidos');
    return {raw,state:validateState(JSON.parse(raw))};
  }
  const api={KEY,initialize,commit,read,addExamples};
  if(typeof module!=='undefined')module.exports=api;else root.VaultStorage=api;
})(globalThis);
