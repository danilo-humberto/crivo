(async function(){
const {validateProject,filterProjects,savings,safeUrl,statuses,categories} = VaultCore;
const $ = s => document.querySelector(s);
const KEY = VaultStorage.KEY;
const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
const date = s => s ? new Intl.DateTimeFormat('pt-BR').format(new Date(s+'T12:00:00')) : 'Não concluído';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = name => name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
let displayTransitions;
function supportsTopLayerExit() {
  if (!window.CSS?.supports?.('overlay','auto') || !CSS.supports('transition-behavior','allow-discrete')) return false;
  if (displayTransitions === undefined) {
    const probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.append(probe);
    getComputedStyle(probe).display;
    probe.style.display = 'none';
    displayTransitions = getComputedStyle(probe).display === 'block';
    probe.remove();
  }
  return displayTransitions;
}
async function closeTopLayer(dialog) {
  if (dialog.hasAttribute('data-closing')) return;
  if (!supportsTopLayerExit() && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dialog.setAttribute('data-closing','');
    const animations = dialog.getAnimations({subtree:true});
    if (animations.length) await Promise.race([
      Promise.allSettled(animations.map(animation=>animation.finished)),
      new Promise(resolve=>setTimeout(resolve,400))
    ]);
    dialog.removeAttribute('data-closing');
  }
  dialog.close();
}
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{
  event.preventDefault();
  closeTopLayer(dialog);
}));
const seed = [
  {id:'mock-1',title:'Portal de chamados',description:'Um ponto de encontro entre a equipe e o suporte. Menos e-mails, mais soluções.',solution:'Portal interno para abertura, triagem e acompanhamento de chamados, com histórico e indicadores de atendimento. Reduziu a dispersão das solicitações em canais diferentes.',owner:'Lucas Martins',category:'Operações',status:'Concluído',requested:'2026-08-10',completed:'2026-10-15',cost:150,url:'',alternatives:[{name:'Service Desk Pro (fictício)',cost:1200,notes:'SLA e relatórios avançados; cobrança por equipe.'},{name:'Help Central (fictício)',cost:850,notes:'Implantação rápida; personalização limitada.'}]},
  {id:'mock-2',title:'Dashboard financeiro',description:'Os números certos, na hora certa. Visibilidade para decisões mais inteligentes.',solution:'Painel que consolida dados de planilhas em indicadores de receitas, despesas e centros de custo. Atualização diária e filtros por período.',owner:'Mariana Costa',category:'Financeiro',status:'Concluído',requested:'2026-07-05',completed:'2026-09-22',cost:100,url:'https://example.com',alternatives:[{name:'Finance BI (fictício)',cost:700,notes:'Conectores prontos; exige assinatura por usuário.'}]},
  {id:'mock-3',title:'Onboarding digital',description:'Uma boa chegada faz toda a diferença. A jornada do novo colaborador em um só fluxo.',solution:'Checklist para RH, gestores e TI acompanharem a entrega de equipamentos, acessos e treinamentos de cada novo colaborador.',owner:'Rafael Souza',category:'Pessoas',status:'Em andamento',requested:'2026-06-18',completed:'',cost:80,url:'',alternatives:[{name:'People Start (fictício)',cost:450,notes:'Assinaturas eletrônicas inclusas; fluxo menos flexível.'}]},
  {id:'mock-4',title:'Inventário de ativos',description:'Cada equipamento tem uma história. Controle de patrimônio, manutenção e responsáveis.',solution:'Cadastro central de equipamentos com identificação, localização, responsável atual e histórico de manutenção. Facilita auditorias e o planejamento de substituições.',owner:'Lucas Martins',category:'Infraestrutura',status:'Concluído',requested:'2026-05-12',completed:'2026-08-03',cost:50,url:'',alternatives:[{name:'Asset Cloud (fictício)',cost:600,notes:'Descoberta automática; preço para até 500 ativos.'}]},
  {id:'mock-5',title:'Automação de relatórios',description:'O trabalho repetitivo fica com a tecnologia. Mais tempo para analisar o que importa.',solution:'Rotina de consolidação e geração de relatórios comerciais semanais, com verificações de consistência e modelos padronizados.',owner:'Beatriz Lima',category:'Comercial',status:'Concluído',requested:'2026-04-02',completed:'2026-06-20',cost:0,url:'',alternatives:[{name:'Report Flow (fictício)',cost:350,notes:'Editor visual e agendamento; integração sob demanda.'}]},
  {id:'mock-6',title:'Base de conhecimento',description:'O que a gente aprende não se perde. Respostas, processos e boas práticas sempre à mão.',solution:'Biblioteca pesquisável de procedimentos e dúvidas frequentes, organizada por área, para apoiar a equipe e preservar o conhecimento da empresa.',owner:'Mariana Costa',category:'Operações',status:'Planejado',requested:'2026-03-25',completed:'',cost:60,url:'',alternatives:[{name:'Team Wiki (fictício)',cost:400,notes:'Histórico de versões e colaboração simultânea.'}]}
];
let projects = [], auditEntries = [], storedRaw = null, editingId = null, editingRaw = null, storageBlocked = false, auditLimit = 30;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6000);}
function adopt(result){storedRaw=result.raw;projects=result.state.projects;auditEntries=result.state.audit;}
async function persist(next, expectedRaw=storedRaw){
  if(storageBlocked){toast('Armazenamento indisponível ou inválido. Recarregue após revisar o armazenamento do navegador.');return false;}
  try {
    const save=()=>VaultStorage.commit(VaultStorage.remote?null:localStorage,expectedRaw,next);
    const result=navigator.locks ? await navigator.locks.request('vault-ti-write',save) : await save();
    adopt(result);render();renderAudit();return result;
  }catch(error){if($('#form-dialog').open)$('#form-error').textContent=error.message;toast(VaultStorage.remote||error.message.includes('outra aba')?error.message:'Não foi possível salvar o projeto e seu histórico. O armazenamento pode estar cheio ou bloqueado.');return false;}
}
try {adopt(await VaultStorage.initialize(VaultStorage.remote?null:localStorage,seed));} catch {storageBlocked=true;toast('Não foi possível carregar os dados. Os registros existentes foram preservados.');}
if(!storageBlocked&&!VaultStorage.remote){try{adopt(VaultStorage.addExamples(localStorage,{raw:storedRaw,state:{version:2,projects,audit:auditEntries}}));}catch{toast('Não foi possível adicionar os exemplos de auditoria. Seus dados foram preservados.');}}
function badge(p){return `<span class="badge ${p.status==='Em andamento'?'progress':p.status==='Planejado'?'planned':''}">${esc(p.status)}</span>${VaultStorage.remote?` <span class="badge">${p.is_public?'Público':'Privado'}</span>`:''}`;}
const statIcons = ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h7l2 2h9v11H3z"/><path d="M3 7V4h7l2 3h7v2"/></svg>', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6M12 3v18"/></svg>'];
function render(){
  const done=projects.filter(p=>p.status==='Concluído');
  const metrics=[['No acervo',projects.length,'Soluções e conhecimento preservados','▧'],['Concluídos',done.length,'Entregas que já fazem a diferença','✓'],['Em andamento',projects.filter(p=>p.status==='Em andamento').length,'Novas soluções tomando forma','◷'],['Economia mensal estimada',money(done.reduce((s,p)=>s+savings(p),0)),'Projetos concluídos comparados à alternativa mais barata','↗']];
  $('#stats').innerHTML=metrics.map((m,i)=>`<div class="stat"><div class="stat-top">${m[0]}<span class="stat-symbol" aria-hidden="true">${statIcons[i]}</span></div><strong>${m[1]}</strong><small>${m[2]}</small></div>`).join('');

  const filtered=filterProjects(projects,$('#search').value,$('#status-filter').value,$('#category-filter').value).sort((a,b)=>$('#sort').value==='name'?a.title.localeCompare(b.title,'pt-BR'):b.requested.localeCompare(a.requested));
  $('#results-count').textContent=`${filtered.length} de ${projects.length} projetos`;

  $('#projects').innerHTML=filtered.length?filtered.map(p=>`<article class="card"><div class="card-top"><span class="project-area">${esc(p.category)}</span>${badge(p)}</div><h3>${esc(p.title)}</h3><p class="card-description">${esc(p.description)}</p><div class="card-meta"><span class="avatar">${esc(initials(p.owner))}</span><span>${esc(p.owner)}</span><time datetime="${esc(p.completed||p.requested)}">${p.completed ? 'Concluído' : 'Solicitado'} em ${date(p.completed||p.requested)}</time></div><div class="card-bottom"><span>${p.status==='Concluído'?`${money(savings(p))}/mês de economia estimada`:(p.status==='Planejado'?'Aguardando início':'Solução em desenvolvimento')}</span><button class="detail-button" data-detail="${esc(p.id)}" aria-label="Ver detalhes de ${esc(p.title)}">Abrir ficha</button></div></article>`).join(''):'<div class="empty"><h3>Nenhum projeto por aqui.</h3><p>Ajuste os filtros ou cadastre uma nova solução da equipe.</p><button class="secondary" id="clear-filters">Limpar filtros</button></div>';
}
function showDetail(id){const p=projects.find(p=>p.id===id);if(!p)return;const detailRaw=storedRaw;
  $('#detail-content').innerHTML=`<div class="dialog-heading"><div><p class="eyebrow">${esc(p.category)}</p><h2 id="detail-title">${esc(p.title)}</h2></div><button class="icon-button" data-close aria-label="Fechar">×</button></div>${badge(p)}<h3>O que é o sistema</h3><p class="detail-description">${esc(p.description)}</p><h3>A solução</h3><p class="detail-description">${esc(p.solution)}</p><dl class="detail-facts"><div><dt>Responsável / equipe</dt><dd>${esc(p.owner)}</dd></div><div><dt>Custo mensal</dt><dd>${money(p.cost)}</dd></div><div><dt>Solicitado em</dt><dd>${date(p.requested)}</dd></div><div><dt>Concluído em</dt><dd>${date(p.completed)}</dd></div></dl>${safeUrl(p.url)?`<a class="primary detail-link" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener noreferrer">Acessar solução</a>`:'<p class="detail-description">Nenhum link cadastrado.</p>'}<h3>Comparação de soluções</h3><p class="detail-description">Valores mensais em reais. Os exemplos e preços iniciais são fictícios.</p><div class="table-wrap"><table><thead><tr><th>Solução</th><th>Custo mensal</th><th>Características / observações</th></tr></thead><tbody><tr class="own-row"><td>${esc(p.title)} · TI</td><td>${money(p.cost)}</td><td>Solução interna, adaptada à empresa.</td></tr>${p.alternatives.map(a=>`<tr><td>${esc(a.name)}</td><td>${money(a.cost)}</td><td>${esc(a.notes)}</td></tr>`).join('')}</tbody></table></div><p class="detail-description">${p.alternatives.length?`Economia potencial: ${money(savings(p))}/mês frente à alternativa mais barata. Não inclui custos de implantação e desenvolvimento.`:'Nenhuma alternativa cadastrada para comparação.'}</p><div class="dialog-actions"><button class="secondary danger" id="delete-project">Remover projeto</button><button class="primary" id="edit-project">Editar projeto</button></div>`;
  $('#edit-project').onclick=()=>{$('#detail-dialog').close();openForm(p,detailRaw);};
  $('#delete-project').onclick=async ()=>{
    const explanation=VaultStorage.remote?'Se houver avaliações, o projeto será arquivado e elas serão preservadas. Sem avaliações, será excluído. O histórico permanece disponível.':'O projeto sairá do acervo, mas uma cópia completa ficará na auditoria.';
    if(!confirm('Remover “'+p.title+'”? '+explanation))return;
    const button=$('#delete-project');button.disabled=true;
    try{const result=await persist(projects.filter(x=>x.id!==id),detailRaw);
      if(result){$('#detail-dialog').close();toast(result.removal?.action==='archived'?'Projeto arquivado. Avaliações e histórico preservados.':'Projeto excluído.');}
    }finally{button.disabled=false;}
  };
  $('#detail-dialog').showModal();
}
function alternativeRow(a={name:'',cost:0,notes:''}){const row=document.createElement('div');row.className='alternative';row.innerHTML=`<label>Nome da alternativa *<input data-field="name" required maxlength="120" value="${esc(a.name)}"></label><label>R$ / mês *<input data-field="cost" type="number" min="0" step="0.01" required value="${esc(a.cost)}"></label><button type="button" class="icon-button" aria-label="Remover alternativa">×</button><label class="full">Recursos, vantagens e limitações<textarea data-field="notes" maxlength="2000">${esc(a.notes)}</textarea></label>`;row.querySelector('button').onclick=()=>row.remove();$('#alternatives').append(row);}
let ownerChoices=[],ownersReady=false,formGeneration=0;
const richOwners=CSS.supports('appearance','base-select');
function resetOwnerOptions(select,...options){
  select.replaceChildren();
  if(richOwners){
    const button=document.createElement('button');button.type='button';
    button.append(document.createElement('selectedcontent'));select.append(button);
  }
  select.append(...options);
}
function ownerOption(user){
  const option=new Option(user.name,user.id);
  if(!richOwners)return option;
  option.setAttribute('aria-label',user.name);
  const avatar=document.createElement('span');avatar.className='owner-avatar';avatar.setAttribute('aria-hidden','true');
  const fallback=document.createElement('span');fallback.textContent=initials(user.name);avatar.append(fallback);
  if(user.photoUrl){
    const img=document.createElement('img');img.alt='';img.width=28;img.height=28;img.referrerPolicy='no-referrer';img.src=user.photoUrl;avatar.append(img);
  }
  const name=document.createElement('span');name.textContent=user.name;
  option.replaceChildren(avatar,name);return option;
}
$('#project-owner-id').addEventListener('error',event=>{if(event.target.tagName==='IMG')event.target.hidden=true;},true);
async function openForm(p,expectedRaw=storedRaw){
  const generation=++formGeneration;
  editingRaw=expectedRaw;editingId=p?.id||null;
  const form=$('#project-form');
  form.reset();$('#form-error').textContent='';$('#alternatives').replaceChildren();
  $('#form-title').textContent=p?'Editar projeto':'Novo projeto';
  if(p){
    for(const key of ['title','category','status','description','solution','owner','url','requested','completed','cost'])form.elements[key].value=p[key]??(key==='cost'?0:'');
    p.alternatives.forEach(alternativeRow);
  }else form.elements.status.value='Planejado';
  const remote=!!VaultStorage.remote,select=form.elements.owner_id;
  $('#legacy-owner-field').hidden=remote;form.elements.owner.disabled=remote;
  $('#managed-owner-field').hidden=!remote;select.disabled=!remote;select.required=remote&&!p;
  $('#project-visibility').hidden=!remote;$('#project-visibility').disabled=!remote||!p;
  form.elements.is_public.checked=!!p?.is_public;form.elements.show_solution_url.checked=!!p?.show_solution_url;
  $('#visibility-help').textContent=p?'O catálogo público estará disponível na próxima etapa. Custos, alternativas e auditoria permanecem internos.':'Novos projetos começam privados. Salve e edite o projeto para escolher sua visibilidade.';
  ownersReady=!remote;ownerChoices=[];
  resetOwnerOptions(select,new Option('Carregando responsáveis…',''));
  $('#owner-help').textContent='';
  $('#form-dialog').showModal();
  if(!remote)return;
  try{
    const users=await VaultStorage.listUsers();
    if(generation!==formGeneration)return;
    ownerChoices=users;
    resetOwnerOptions(select);
    if(!p)select.add(new Option('Selecione um usuário',''));
    else if(!p.owner_id)select.add(new Option('Manter responsável antigo: '+p.owner,''));
    else if(!users.some(u=>u.id===p.owner_id))select.add(new Option(p.owner+' (inativo — manter vínculo)',p.owner_id));
    for(const user of users)select.add(ownerOption(user));
    select.value=p?.owner_id||'';
    $('#owner-help').textContent=p&&!p.owner_id?'Nome antigo preservado. Selecione uma conta para associá-lo explicitamente.':'Selecione um usuário interno ativo.';
    ownersReady=true;
  }catch{
    if(generation!==formGeneration)return;
    resetOwnerOptions(select,new Option('Não foi possível carregar',''));
    $('#form-error').textContent='Não foi possível carregar os responsáveis. Feche e reabra o formulário para tentar novamente.';
  }
}
$('#project-form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type="submit"]');
  if(button.disabled)return;
  $('#form-error').textContent='';
  try{
    if(!ownersReady)throw Error('A lista de responsáveis não está disponível. Feche e reabra o formulário.');
    const p=Object.fromEntries(new FormData(form));p.id=editingId||crypto.randomUUID();p.cost=Number(p.cost);
    if(VaultStorage.remote){
      const before=JSON.parse(editingRaw).projects.find(item=>item.id===editingId);
      p.owner_id=form.elements.owner_id.value||null;
      p.owner=ownerChoices.find(u=>u.id===p.owner_id)?.name||before?.owner||'';
      p.is_public=!!editingId&&form.elements.is_public.checked;
      p.show_solution_url=!!editingId&&form.elements.show_solution_url.checked;
    }
    p.alternatives=[...$('#alternatives').children].map(row=>({name:row.querySelector('[data-field="name"]').value.trim(),cost:Number(row.querySelector('[data-field="cost"]').value),notes:row.querySelector('[data-field="notes"]').value.trim()}));
    for(const k of ['title','description','solution','owner','url'])p[k]=p[k].trim();
    validateProject(p);button.disabled=true;
    if(await persist(editingId?projects.map(x=>x.id===editingId?p:x):[p,...projects],editingRaw)){
      $('#form-dialog').close();toast(VaultStorage.remote?'Projeto salvo no servidor.':'Projeto salvo neste navegador.');
    }
  }catch(err){$('#form-error').textContent=err.message;}
  finally{button.disabled=false;}
};
for(const [selector,values] of [['#status-filter',statuses],['#category-filter',categories],['select[name="status"]',statuses],['select[name="category"]',categories]])for(const value of values){const option=document.createElement('option');option.value=option.textContent=value;$(selector).append(option);}
$('#new-project').onclick=()=>openForm();$('#add-alternative').onclick=()=>alternativeRow();
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close)closeTopLayer(close.closest('dialog'));const detail=e.target.closest('[data-detail]');if(detail)showDetail(detail.dataset.detail);if(e.target.id==='clear-filters'){$('#search').value='';$('#status-filter').value='';$('#category-filter').value='';render();}});
for(const id of ['search','status-filter','category-filter','sort'])$('#'+id).addEventListener(id==='search'?'input':'change',render);
window.addEventListener('storage',e=>{if(!VaultStorage.remote&&(e.key===KEY||e.key===null)){try{adopt(VaultStorage.read(localStorage));render();renderAudit();toast('Projetos e histórico atualizados por outra aba.');}catch{storageBlocked=true;toast('Os dados foram removidos ou alterados fora desta aba. Recarregue antes de continuar.');}}});
const fieldLabels={title:'Nome do projeto',description:'O que é o sistema',solution:'Solução',owner:'Responsável / equipe',category:'Área',status:'Status',requested:'Data da solicitação',completed:'Data da conclusão',cost:'Custo mensal',url:'Link',alternatives:'Alternativas de mercado',owner_id:'Vínculo do responsável',is_public:'Projeto público',show_solution_url:'Link público',archived_at:'Arquivado em'};
const actionLabels={baseline:'Registro inicial',created:'Criação',updated:'Alteração',deleted:'Exclusão',archived:'Arquivamento'};
const timestamp=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date(value));
function auditValue(project,field){
  if(!project)return 'Não existia';
  const value=project[field];
  if(field==='is_public'||field==='show_solution_url')return value?'Sim':'Não';
  if(field==='owner_id')return value?project.owner+' (conta vinculada: '+value+')':'Nome antigo, sem vínculo';
  if(field==='archived_at')return value?timestamp(value):'Não arquivado';
  if(field==='cost')return money(value);
  if(field==='requested'||field==='completed')return value?date(value):'Não informada';
  if(field==='alternatives')return value.length?value.map(a=>`${a.name}: ${money(a.cost)}/mês\n${a.notes||'Sem observações'}`).join('\n\n'):'Nenhuma alternativa';
  return value||'Não informado';
}
function renderAudit(){
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const query=normalize($('#audit-search').value),action=$('#audit-filter').value;
  const entries=auditEntries.filter(e=>(!action||e.action===action)&&normalize([e.before?.title,e.after?.title,e.before?.owner,e.after?.owner].filter(Boolean).join(' ')).includes(query));
  $('#audit-count').textContent=`${entries.length} ${entries.length===1?'registro':'registros'}`;
  $('#download-audit').disabled=storageBlocked||!auditEntries.length;
  $('#audit-more').hidden=entries.length<=auditLimit;
  $('#audit-list').innerHTML=entries.length?entries.slice(0,auditLimit).map(e=>{
    const project=e.after||e.before,changed=VaultAudit.changedFields(e.before,e.after);
    const description=e.action==='updated'?changed.map(f=>fieldLabels[f]).join(', '):e.action==='archived'?'Projeto arquivado; avaliações e histórico preservados.':e.action==='baseline'?'Cópia do projeto ao iniciar o histórico.':e.action==='deleted'?'Versão completa preservada antes da exclusão.':'Primeira versão do projeto.';
    return `<li class="audit-entry"><div class="audit-event"><span class="audit-action ${e.action}">${actionLabels[e.action]}${e.demo ? ' · Exemplo' : ''}</span><time datetime="${esc(e.at)}">${timestamp(e.at)}</time></div><div class="audit-description"><h2>${esc(project.title)}</h2><p>${esc(description)}</p><small>Responsável pelo projeto: ${esc(project.owner)} · Autor da ação: ${esc(e.actor)}</small></div><button type="button" class="detail-button" data-audit="${esc(e.id)}" aria-label="Ver registro de ${esc(project.title)} em ${timestamp(e.at)}">Ver registro</button></li>`;
  }).join(''):'<li class="empty"><h2>Nenhum registro encontrado</h2><p>Ajuste a busca ou os filtros. Novas alterações serão registradas automaticamente.</p></li>';
}
function downloadJSON(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function showAudit(id){
  const entry=auditEntries.find(e=>e.id===id);if(!entry)return;
  const project=entry.after||entry.before,changed=VaultAudit.changedFields(entry.before,entry.after);
  $('#audit-content').innerHTML=`<div class="dialog-heading"><div><p class="eyebrow">${actionLabels[entry.action]} em ${timestamp(entry.at)}</p><h2 id="audit-title">${esc(project.title)}</h2></div><button type="button" class="icon-button" data-close aria-label="Fechar">×</button></div>${entry.demo?'<p class="audit-note">Exemplo fictício para demonstração. Nenhum projeto do seu acervo foi alterado ou excluído por este registro.</p>':''}<p class="audit-note">Autor da ação: ${esc(entry.actor)}. Responsável e autor da alteração são informações distintas.</p>${entry.action==='baseline'?'<p class="detail-description">Registro inicial: esta cópia marca o início do histórico, não a data de criação do projeto.</p>':''}<div class="table-wrap audit-comparison" tabindex="0" role="region" aria-label="Comparação das versões"><table><caption>${entry.action==='updated'?'Comparação completa: campos alterados destacados':entry.action==='deleted'?'Cópia preservada antes da exclusão':'Cópia completa do projeto'}</caption><thead><tr><th scope="col">Campo</th>${entry.before?'<th scope="col">Antes</th>':''}${entry.after?'<th scope="col">'+(entry.before?'Depois':'Dados registrados')+'</th>':''}</tr></thead><tbody>${VaultAudit.fields.map(field=>`<tr class="${entry.action==='updated'&&changed.includes(field)?'changed-field':''}"><th scope="row">${fieldLabels[field]}${entry.action==='updated'&&changed.includes(field)?'<small>Alterado</small>':''}</th>${entry.before?`<td>${esc(auditValue(entry.before,field))}</td>`:''}${entry.after?`<td>${esc(auditValue(entry.after,field))}</td>`:''}</tr>`).join('')}</tbody></table></div><div class="dialog-actions">${entry.before?'<button type="button" class="secondary" id="download-before">Baixar versão anterior</button>':''}${entry.after?'<button type="button" class="secondary" id="download-after">Baixar versão registrada</button>':''}<button type="button" class="primary" data-close>Fechar</button></div>`;
  if(entry.before)$('#download-before').onclick=()=>downloadJSON(entry.before,'vault-ti-versao-anterior.json');
  if(entry.after)$('#download-after').onclick=()=>downloadJSON(entry.after,'vault-ti-versao-registrada.json');
  $('#audit-dialog').showModal();
}
const tabs=[...document.querySelectorAll('[role="tab"]')];
const viewTabBar=$('.view-tabs');
function updateViewIndicator(){
  const label=viewTabBar.querySelector('[aria-selected="true"] > span');
  if(!label)return;
  const bounds=label.getBoundingClientRect(),bar=viewTabBar.getBoundingClientRect();
  viewTabBar.style.setProperty('--view-left',(bounds.left-bar.left)+'px');
  viewTabBar.style.setProperty('--view-width',bounds.width+'px');
}
new ResizeObserver(updateViewIndicator).observe(viewTabBar);
document.fonts?.ready.then(updateViewIndicator);
function activateTab(tab){for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}const context=$('.topbar strong');if(context)context.textContent=tab.id==='tab-audit'?'Auditoria':'Cofre de projetos';updateViewIndicator();if(tab.id==='tab-audit')renderAudit();}
for(const tab of tabs){tab.addEventListener('click',()=>activateTab(tab));tab.addEventListener('keydown',event=>{let index=tabs.indexOf(tab);if(event.key==='ArrowRight')index=(index+1)%tabs.length;else if(event.key==='ArrowLeft')index=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;event.preventDefault();activateTab(tabs[index]);tabs[index].focus();});}
$('#audit-search').addEventListener('input',()=>{auditLimit=30;renderAudit();});
$('#audit-filter').addEventListener('change',()=>{auditLimit=30;renderAudit();});
$('#audit-more').addEventListener('click',()=>{auditLimit+=30;renderAudit();});
$('#audit-list').addEventListener('click',event=>{const button=event.target.closest('[data-audit]');if(button)showAudit(button.dataset.audit);});
$('#download-audit').addEventListener('click',()=>{downloadJSON({version:2,exportedAt:new Date().toISOString(),projects,audit:auditEntries},'vault-ti-historico.json');});
render();
renderAudit();

})();
