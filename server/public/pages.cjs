const {safeUrl,statuses,categories,publicProjectPath}=require('../../src/domain/core.js');
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>value?value.split('-').reverse().join('/'):'Não concluído';
const badge=project=>`<span class="badge ${project.status==='Planejado'?'planned':project.status==='Em andamento'?'progress':''}">${escape(project.status)}</span>`;

function layout(title,content,referrer='no-referrer'){
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="${referrer}"><title>${escape(title)} — Vault TI</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/catalog.css"></head>
<body class="public-page"><a class="skip-link" href="#content">Ir para o conteúdo</a>
<header class="public-header"><a href="/catalogo" class="brand" aria-label="Vault TI, catálogo"><span class="brand-icon" aria-hidden="true">▧</span> vault<span class="brand-ti">TI</span></a><nav aria-label="Principal"><a href="/catalogo">Catálogo</a><a href="/auth">Área interna</a></nav></header>
<main class="public-main">${content}<footer class="public-footer"><span>Vault TI</span><span>Projetos e soluções da equipe.</span></footer></main></body></html>`;
}

function card(project){
  return `<li><article class="catalog-card">
<header><div class="catalog-card-meta"><span class="project-area">${escape(project.category)}</span>${badge(project)}</div><h2><a href="${escape(publicProjectPath(project.id))}">${escape(project.title)}</a></h2></header>
<p class="catalog-summary">${escape(project.description)}</p>
<dl class="catalog-card-facts"><div><dt>Responsável</dt><dd>${escape(project.owner)}</dd></div><div><dt>${project.completed?'Concluído':'Solicitado'} em</dt><dd><time datetime="${escape(project.completed||project.requested)}">${date(project.completed||project.requested)}</time></dd></div></dl>
${reviewSummary(project)}
</article></li>`;
}
function reviewSummary(project){
  const count=project.reviewCount||0,average=project.reviewAverage;
  if(!count)return '<p class="catalog-rating catalog-rating-empty">Sem avaliações</p>';
  const label=Number(average).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  return `<a class="catalog-rating" href="${escape(publicProjectPath(project.id))}#avaliacoes"><span class="rating-stars" aria-hidden="true"><span>☆☆☆☆☆</span><span class="rating-fill" style="width:${Math.max(0,Math.min(100,average*20))}%">★★★★★</span></span><span>${label} de 5 · ${count} ${count===1?'avaliação':'avaliações'}</span><span class="review-sr-only"> — Ver comentários de ${escape(project.title)}</span></a>`;
}
const options=(values,selected)=>values.map(value=>`<option value="${escape(value)}"${value===selected?' selected':''}>${escape(value)}</option>`).join('');
function catalogPage(projects,{q='',status='',area=''}={},total=projects.length){
  const filtered=Boolean(q||status||area);
  return layout('Catálogo de projetos',`<section class="catalog-heading"><h1 id="content" tabindex="-1">Soluções que fazem <br>parte do nosso trabalho.</h1><p>Conheça os projetos de TI, acompanhe as entregas e encontre as soluções da equipe.</p></section>
<form class="catalog-filters" role="search" action="/catalogo" method="get" aria-label="Buscar projetos"><div class="catalog-search"><label for="catalog-search">Buscar projetos</label><input id="catalog-search" name="q" type="search" maxlength="200" value="${escape(q)}" placeholder="Nome, solução ou responsável"></div><div><label for="catalog-status">Status</label><select id="catalog-status" name="status"><option value="">Todos os status</option>${options(statuses,status)}</select></div><div><label for="catalog-area">Área</label><select id="catalog-area" name="area"><option value="">Todas as áreas</option>${options(categories,area)}</select></div><button class="primary" type="submit">Buscar</button>${filtered?'<a class="secondary" href="/catalogo">Limpar filtros</a>':''}</form>
<p class="catalog-count">${projects.length} ${projects.length===1?'projeto':'projetos'}${filtered?` de ${total}`:''}</p>
${projects.length?`<ul class="catalog-grid" role="list">${projects.map(card).join('')}</ul>`:`<section class="catalog-empty"><h2>${total?'Nenhum projeto encontrado':'Nenhum projeto publicado'}</h2><p>${total?'Tente outro termo ou limpe os filtros para ver todos os projetos.':'Os projetos aparecerão aqui quando forem publicados pela equipe.'}</p></section>`}`);
}

function projectPage(project,reviews=null){
  const url=safeUrl(project.url);
  return layout(project.title,`<nav class="catalog-back" aria-label="Caminho"><a href="/catalogo"><span aria-hidden="true">←</span> Voltar ao catálogo</a></nav>
<article class="public-project"><header class="project-heading"><div class="catalog-card-meta"><span class="project-area">${escape(project.category)}</span>${badge(project)}</div><h1 id="content" tabindex="-1">${escape(project.title)}</h1></header>
<div class="project-layout"><div class="project-copy"><section><h2>Sobre o projeto</h2><p>${escape(project.description)}</p></section><section><h2>A solução</h2><p>${escape(project.solution)}</p></section>${url?`<a class="primary" href="${escape(url)}" rel="noreferrer">Acessar solução</a>`:''}</div>
<aside class="project-information"><h2>Informações do projeto</h2><dl><div><dt>Responsável</dt><dd>${escape(project.owner)}</dd></div><div><dt>Área</dt><dd>${escape(project.category)}</dd></div><div><dt>Status</dt><dd>${escape(project.status)}</dd></div><div><dt>Solicitado em</dt><dd><time datetime="${escape(project.requested)}">${date(project.requested)}</time></dd></div><div><dt>Concluído em</dt><dd>${project.completed?`<time datetime="${escape(project.completed)}">${date(project.completed)}</time>`:'Não concluído'}</dd></div></dl></aside></div></article>${reviews?reviewSection(project,reviews):''}`,reviews?'same-origin':'no-referrer');
}

function reviewSection(project,{items=[],total=items.length,totalPages=1,nextPage=null,page=1,formToken='',sent=false,error='',values={}}){
  const path=escape(publicProjectPath(project.id));
  const cards=items.map(review=>`<li><article class="review-card"><header><span class="review-avatar" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="17" r="8" fill="currentColor"/><path d="M9 42v-5a15 15 0 0 1 30 0v5" fill="currentColor"/></svg>${review.photoUrl?`<img data-review-photo="${escape(review.photoUrl)}" alt="" width="48" height="48" hidden referrerpolicy="no-referrer">`:''}</span><div><h3>${escape(review.name)}</h3><time datetime="${escape(review.createdAt)}">${date(review.createdAt.slice(0,10))}</time></div><p class="review-rating"><span aria-hidden="true">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span> ${review.rating} de 5 estrelas</p></header><p class="review-comment">${escape(review.comment)}</p></article></li>`).join('');
  return `<section class="project-reviews" aria-labelledby="avaliacoes"><h2 id="avaliacoes" tabindex="-1">Avaliações <span class="review-count" aria-label="${total} avaliações">${total}</span></h2>
${sent?'<div id="review-toast" class="review-toast" popover="manual" hidden data-message="Avaliação enviada. Obrigado por compartilhar sua experiência!"><div class="review-toast-content"><span role="status" aria-atomic="true"></span><button type="button" aria-label="Fechar notificação" popovertarget="review-toast" popovertargetaction="hide">×</button></div></div><noscript><p class="review-toast" role="status">Avaliação enviada. Obrigado por compartilhar sua experiência!</p></noscript><script defer src="/review-toast.js"></script>':''}
<div class="reviews-layout"><div>${items.length?`<ul class="review-list" role="list">${cards}</ul>`:`<p>${page===1?'Sem avaliações. Compartilhe sua experiência com este projeto.':'Nenhuma avaliação nesta página.'}</p>`}
${total>0?`<nav class="review-pagination" aria-label="Páginas de avaliações">${page>1?`<a rel="prev" href="${path}?page=${page-1}#avaliacoes"><span aria-hidden="true">←</span> Voltar</a>`:'<span class="pagination-disabled" aria-disabled="true"><span aria-hidden="true">←</span> Voltar</span>'}<span class="pagination-position" aria-current="page">Página ${page} de ${totalPages}</span>${nextPage?`<a rel="next" href="${path}?page=${nextPage}#avaliacoes">Próximo <span aria-hidden="true">→</span></a>`:'<span class="pagination-disabled" aria-disabled="true">Próximo <span aria-hidden="true">→</span></span>'}</nav>`:''}</div>
<form class="review-form" action="${path}/reviews" method="post" aria-labelledby="review-title">
<h3 id="review-title">Conte como foi sua experiência</h3><p>Todos os campos são obrigatórios. Uma avaliação por CPF neste projeto, sem edição após o envio.</p>
${error?`<p class="review-error" id="review-error" tabindex="-1" autofocus>${escape(error)}</p>`:''}
<input type="hidden" name="formToken" value="${escape(formToken)}">
<div class="review-field"><label for="review-name">Nome</label><input id="review-name" name="name" autocomplete="name" required maxlength="120" value="${escape(values.name||'')}"></div>
<div class="review-field"><label for="review-cpf">CPF</label><input id="review-cpf" name="cpf" type="text" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required maxlength="14" pattern="[0-9]{11}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}"></div>
<fieldset class="review-stars"><legend>Nota</legend><div>${[1,2,3,4,5].map(rating=>`<label for="review-rating-${rating}"><input id="review-rating-${rating}" type="radio" name="rating" value="${rating}" required${String(values.rating)===String(rating)?' checked':''}>${rating} <span aria-hidden="true">★</span><span class="review-sr-only">${rating===1?'estrela':'estrelas'}</span></label>`).join('')}</div></fieldset>
<div class="review-field"><label for="review-comment">Comentário</label><div class="review-comment-control"><textarea id="review-comment" name="comment" rows="5" maxlength="2000" required aria-describedby="review-comment-count">${escape(values.comment||'')}</textarea><span id="review-comment-count" class="review-comment-count">${(values.comment||'').length.toLocaleString('pt-BR')} / 2.000</span></div></div>
<button class="primary" type="submit">Publicar avaliação</button></form></div></section><script defer src="/reviews.js"></script>`;
}

function reviewErrorPage(message,id){
  return layout('Não foi possível enviar a avaliação',`<section class="catalog-empty"><h1 id="content" tabindex="-1">Não foi possível concluir</h1><p>${escape(message)}</p><a class="secondary" href="${escape(id?publicProjectPath(id):'/catalogo')}">Voltar ao projeto</a></section>`);
}

function errorPage(status){
  const missing=status===404;
  const method=status===405;
  const title=missing?'Projeto indisponível':method?'Método não permitido':'Catálogo indisponível';
  return layout(title,`<section class="catalog-empty"><h1 id="content" tabindex="-1">${missing?'Projeto indisponível':method?title:'Não foi possível carregar o catálogo'}</h1><p>${missing?'Este projeto não está disponível para consulta.':method?'Use os links do catálogo para consultar os projetos.':'Tente novamente em alguns instantes.'}</p><a class="secondary" href="/catalogo">Voltar ao catálogo</a></section>`);
}
module.exports={catalogPage,projectPage,errorPage,reviewErrorPage};
