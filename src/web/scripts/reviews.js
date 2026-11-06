// Progressive enhancement only: native POST and the default avatar work without JS.
document.querySelectorAll('[data-review-photo]').forEach(image=>{
  image.addEventListener('load',()=>{if(image.naturalWidth>0)image.hidden=false;});
  image.addEventListener('error',()=>{image.hidden=true;});
  image.src=image.dataset.reviewPhoto;
});
const reviewForm=document.querySelector('.review-form');
if(reviewForm){
  const cpf=reviewForm.querySelector('#review-cpf');
  const comment=reviewForm.querySelector('#review-comment');
  const counter=reviewForm.querySelector('#review-comment-count');
  const formatCpf=()=>{
    const digitsBefore=cpf.value.slice(0,cpf.selectionStart).replace(/\D/g,'').length;
    const digits=cpf.value.replace(/\D/g,'').slice(0,11);
    const formatted=digits.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3}\.\d{3})(\d)/,'$1.$2').replace(/(\d{3}\.\d{3}\.\d{3})(\d)/,'$1-$2');
    if(cpf.value===formatted)return;
    cpf.value=formatted;
    let position=0,count=0;
    while(position<formatted.length&&count<digitsBefore){if(/\d/.test(formatted[position]))count++;position++;}
    cpf.setSelectionRange(position,position);
  };
  // Deleting a separator must also delete the adjacent digit, not restore the
  // separator forever and leave the caret stuck at the same position.
  cpf.addEventListener('beforeinput',event=>{
    if(cpf.selectionStart!==cpf.selectionEnd)return;
    let start=cpf.selectionStart,end=start;
    if(event.inputType==='deleteContentBackward'&&/[.-]/.test(cpf.value[start-1]||'')){
      while(start>0&&/[.-]/.test(cpf.value[start-1]))start--;
      cpf.setSelectionRange(Math.max(0,start-1),end);
    }else if(event.inputType==='deleteContentForward'&&/[.-]/.test(cpf.value[end]||'')){
      while(end<cpf.value.length&&/[.-]/.test(cpf.value[end]))end++;
      cpf.setSelectionRange(start,Math.min(cpf.value.length,end+1));
    }
  });
  cpf.addEventListener('input',event=>{if(!event.isComposing)formatCpf();});
  cpf.addEventListener('compositionend',formatCpf);
  const updateCount=()=>{counter.textContent=`${comment.value.length.toLocaleString('pt-BR')} / 2.000`;};
  comment.addEventListener('input',updateCount);
  formatCpf();updateCount();
  reviewForm.addEventListener('submit',()=>{
    const button=reviewForm.querySelector('button[type="submit"]');
    button.disabled=true;button.textContent='Enviando avaliação…';
  });
  // Back/forward cache must not leave the native submit button disabled.
  window.addEventListener('pageshow',()=>{
    formatCpf();updateCount();
    const button=reviewForm.querySelector('button[type="submit"]');
    button.disabled=false;button.textContent='Publicar avaliação';
  });
  const sync=event=>{
    const field=event.target;
    if(field.matches('input:not([type="hidden"]), textarea')&&CSS.supports('selector(:user-invalid)')){
      if(field.matches(':user-invalid'))field.setAttribute('aria-invalid','true');
      else field.removeAttribute('aria-invalid');
    }
  };
  reviewForm.addEventListener('blur',sync,true);
  reviewForm.addEventListener('input',sync);
}
