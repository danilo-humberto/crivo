(function(global){
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render({items,total,page,totalPages}){
    return `<p>${total} ${total===1?'avaliação':'avaliações'}, incluindo ocultas.</p>${items.length?`<ul class="curation-list" role="list">${items.map(r=>`<li><article><header><strong>${esc(r.name)}</strong><span class="badge">${r.visible?'Visível':'Oculta'}</span></header><p>${r.rating} de 5 estrelas · <time datetime="${esc(r.createdAt)}">${new Date(r.createdAt).toLocaleDateString('pt-BR')}</time></p><p class="curation-comment">${esc(r.comment)}</p><button type="button" class="secondary" commandfor="curation" command="--visibility" data-review="${esc(r.id)}" data-visible="${r.visible}" aria-label="${r.visible?'Ocultar':'Reexibir'} avaliação de ${esc(r.name)}">${r.visible?'Ocultar':'Reexibir'}</button></article></li>`).join('')}</ul>`:'<p>Sem avaliações neste projeto.</p>'}
    <nav class="curation-pagination" aria-label="Páginas da curadoria"><button type="button" class="secondary" data-page="${page-1}"${page<=1?' disabled':''}>← Voltar</button><span>Página ${page} de ${totalPages}</span><button type="button" class="secondary" data-page="${page+1}"${page>=totalPages?' disabled':''}>Próximo →</button></nav>`;
  }
  function mount(root,{storage,projectId,onChanged}){
    root.innerHTML='<h3 tabindex="-1">Avaliações</h3><p>Ocultar retira a avaliação dos comentários e indicadores públicos. Reexibir restaura sua participação.</p><div class="curation-toast" hidden><span role="status"></span><button type="button" class="secondary" data-dismiss aria-label="Fechar notificação">×</button></div><p class="form-error" role="alert"></p><button type="button" class="secondary" data-refresh>Atualizar avaliações</button><div data-list></div>';
    const list=root.querySelector('[data-list]'),error=root.querySelector('[role="alert"]'),notification=root.querySelector('.curation-toast');
    let page=1,busy=false,timer;
    function toast(message){
      notification.querySelector('[role="status"]').textContent=message;notification.hidden=false;clearTimeout(timer);
      const hide=()=>{if(notification.contains(document.activeElement)){timer=setTimeout(hide,1000);return;}notification.hidden=true;};
      timer=setTimeout(hide,6000);
    }
    async function load(next=page){
      const data=await storage.listProjectReviews(projectId,next);
      if(!root.isConnected)return;
      page=data.page;list.innerHTML=render(data);
    }
    async function act(button){
      if(!button||busy||button.disabled)return;
      if(button.hasAttribute('data-dismiss')){clearTimeout(timer);notification.hidden=true;return;}
      busy=true;button.setAttribute('aria-disabled','true');error.textContent='';
      const reviewId=button.dataset.review;
      try{
        if(reviewId!==undefined){
          const previous=button.dataset.visible==='true';
          await storage.setReviewVisibility(projectId,reviewId,!previous,previous);
          if(!root.isConnected)return;
          toast(previous?'Avaliação ocultada.':'Avaliação reexibida.');
          // Report a successful write separately from any failed refresh.
          try{await load();await onChanged();}catch{error.textContent='Alteração salva. Não foi possível atualizar todos os dados; atualize a lista ou reabra a ficha.';}
          [...list.querySelectorAll('[data-review]')].find(el=>el.dataset.review===reviewId)?.focus();
        }else{
          await load(button.hasAttribute('data-page')?Number(button.dataset.page):page);
          if(button.hasAttribute('data-page')&&root.isConnected)root.querySelector('h3').focus();
        }
      }catch(e){if(root.isConnected)error.textContent=e.message||'Não foi possível concluir. Atualize a lista e tente novamente.';}
      finally{busy=false;button.removeAttribute('aria-disabled');}
    }
    const nativeCommands='commandForElement' in HTMLButtonElement.prototype;
    root.addEventListener('command',event=>{if(event.command==='--visibility')void act(event.source);});
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button||!root.contains(button))return;
      if(button.hasAttribute('command')&&nativeCommands)return;
      void act(button);
    });
    busy=true;list.textContent='Carregando avaliações…';
    return load().catch(()=>{if(root.isConnected){list.textContent='';error.textContent='Não foi possível carregar as avaliações. Use Atualizar avaliações para tentar novamente.';}}).finally(()=>{busy=false;});
  }
  const api={render,mount};if(typeof module!=='undefined')module.exports=api;else global.VaultCuration=api;
})(globalThis);
