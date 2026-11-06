const {safeUrl,statuses,categories,publicProjectPath}=require('../../src/domain/core.js');
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>value?value.split('-').reverse().join('/'):'Não concluído';
const badge=project=>`<span class="badge ${project.status==='Planejado'?'planned':project.status==='Em andamento'?'progress':''}">${escape(project.status)}</span>`;

function layout(title,content){
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(title)} — Vault TI</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/catalog.css"></head>
<body class="public-page"><a class="skip-link" href="#content">Ir para o conteúdo</a>
<header class="public-header"><a href="/catalogo" class="brand" aria-label="Vault TI, catálogo"><span class="brand-icon" aria-hidden="true">▧</span> vault<span class="brand-ti">TI</span></a><nav aria-label="Principal"><a href="/catalogo">Catálogo</a><a href="/auth">Área interna</a></nav></header>
<main class="public-main">${content}<footer class="public-footer"><span>Vault TI</span><span>Projetos e soluções da equipe.</span></footer></main></body></html>`;
}

function card(project){
  return `<li><article class="catalog-card">
<header><div class="catalog-card-meta"><span class="project-area">${escape(project.category)}</span>${badge(project)}</div><h2><a href="${escape(publicProjectPath(project.id))}">${escape(project.title)}</a></h2></header>
<p class="catalog-summary">${escape(project.description)}</p>
<dl class="catalog-card-facts"><div><dt>Responsável</dt><dd>${escape(project.owner)}</dd></div><div><dt>${project.completed?'Concluído':'Solicitado'} em</dt><dd><time datetime="${escape(project.completed||project.requested)}">${date(project.completed||project.requested)}</time></dd></div></dl>
</article></li>`;
}
const options=(values,selected)=>values.map(value=>`<option value="${escape(value)}"${value===selected?' selected':''}>${escape(value)}</option>`).join('');
function catalogPage(projects,{q='',status='',area=''}={},total=projects.length){
  const filtered=Boolean(q||status||area);
  return layout('Catálogo de projetos',`<section class="catalog-heading"><h1 id="content" tabindex="-1">Soluções que fazem <br>parte do nosso trabalho.</h1><p>Conheça os projetos de TI, acompanhe as entregas e encontre as soluções da equipe.</p></section>
<form class="catalog-filters" role="search" action="/catalogo" method="get" aria-label="Buscar projetos"><div class="catalog-search"><label for="catalog-search">Buscar projetos</label><input id="catalog-search" name="q" type="search" maxlength="200" value="${escape(q)}" placeholder="Nome, solução ou responsável"></div><div><label for="catalog-status">Status</label><select id="catalog-status" name="status"><option value="">Todos os status</option>${options(statuses,status)}</select></div><div><label for="catalog-area">Área</label><select id="catalog-area" name="area"><option value="">Todas as áreas</option>${options(categories,area)}</select></div><button class="primary" type="submit">Buscar</button>${filtered?'<a class="secondary" href="/catalogo">Limpar filtros</a>':''}</form>
<p class="catalog-count">${projects.length} ${projects.length===1?'projeto':'projetos'}${filtered?` de ${total}`:''}</p>
${projects.length?`<ul class="catalog-grid" role="list">${projects.map(card).join('')}</ul>`:`<section class="catalog-empty"><h2>${total?'Nenhum projeto encontrado':'Nenhum projeto publicado'}</h2><p>${total?'Tente outro termo ou limpe os filtros para ver todos os projetos.':'Os projetos aparecerão aqui quando forem publicados pela equipe.'}</p></section>`}`);
}

function projectPage(project){
  const url=safeUrl(project.url);
  return layout(project.title,`<nav class="catalog-back" aria-label="Caminho"><a href="/catalogo"><span aria-hidden="true">←</span> Voltar ao catálogo</a></nav>
<article class="public-project"><header class="project-heading"><div class="catalog-card-meta"><span class="project-area">${escape(project.category)}</span>${badge(project)}</div><h1 id="content" tabindex="-1">${escape(project.title)}</h1></header>
<div class="project-layout"><div class="project-copy"><section><h2>Sobre o projeto</h2><p>${escape(project.description)}</p></section><section><h2>A solução</h2><p>${escape(project.solution)}</p></section>${url?`<a class="primary" href="${escape(url)}" rel="noreferrer">Acessar solução</a>`:''}</div>
<aside class="project-information"><h2>Informações do projeto</h2><dl><div><dt>Responsável</dt><dd>${escape(project.owner)}</dd></div><div><dt>Área</dt><dd>${escape(project.category)}</dd></div><div><dt>Status</dt><dd>${escape(project.status)}</dd></div><div><dt>Solicitado em</dt><dd><time datetime="${escape(project.requested)}">${date(project.requested)}</time></dd></div><div><dt>Concluído em</dt><dd>${project.completed?`<time datetime="${escape(project.completed)}">${date(project.completed)}</time>`:'Não concluído'}</dd></div></dl></aside></div></article>`);
}

function errorPage(status){
  const missing=status===404;
  const method=status===405;
  const title=missing?'Projeto indisponível':method?'Método não permitido':'Catálogo indisponível';
  return layout(title,`<section class="catalog-empty"><h1 id="content" tabindex="-1">${missing?'Projeto indisponível':method?title:'Não foi possível carregar o catálogo'}</h1><p>${missing?'Este projeto não está disponível para consulta.':method?'Use os links do catálogo para consultar os projetos.':'Tente novamente em alguns instantes.'}</p><a class="secondary" href="/catalogo">Voltar ao catálogo</a></section>`);
}
module.exports={catalogPage,projectPage,errorPage};
