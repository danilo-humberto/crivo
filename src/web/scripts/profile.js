(function(root){
  function render(container,user){
    container.replaceChildren();container.hidden=!user;
    if(!user)return;
    const name=String(user.name||'').trim()||'Sua conta';
    const avatar=document.createElement('div'),initials=document.createElement('span'),label=document.createElement('strong');
    avatar.className='profile-photo';avatar.setAttribute('aria-hidden','true');
    const parts=name.trim().split(/\s+/);
    initials.textContent=(parts[0][0]+(parts.length>1?parts.at(-1)[0]:'')).toLocaleUpperCase('pt-BR');
    avatar.append(initials);label.textContent=name;
    if(user.photoUrl){
      const img=document.createElement('img');img.alt='';img.width=88;img.height=88;img.referrerPolicy='no-referrer';img.hidden=true;
      img.addEventListener('load',()=>{img.hidden=false;initials.hidden=true;});
      img.addEventListener('error',()=>{img.remove();initials.hidden=false;},{once:true});
      img.src=user.photoUrl;avatar.append(img);
    }
    container.append(avatar,label);
  }
  root.VaultProfile={render};
  const container=document.querySelector('[data-managed-profile]');
  if(container)fetch('/api/me',{cache:'no-store'}).then(async response=>{
    if(!response.ok)throw Error('Perfil indisponível');return response.json();
  }).then(user=>render(container,user)).catch(()=>{container.hidden=true;});
})(globalThis);
