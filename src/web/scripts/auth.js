import {createAuthClient} from '@neon/auth';
const auth=createAuthClient(`${location.origin}/api/auth`);
const $=id=>document.getElementById(id);
const tabs=[...document.querySelectorAll('.auth-tabs [role="tab"]')];
const tabBar=document.querySelector('.auth-tabs');
function highlightTab(tab){
  if(!tab||tab.hidden)return;
  tabs.forEach(item=>item.classList.toggle('tab-highlight',item===tab));
  tabBar.style.setProperty('--highlight-left',`${tab.offsetLeft}px`);
  tabBar.style.setProperty('--highlight-width',`${tab.offsetWidth}px`);
}
const highlightSelected=()=>{
  const selected=tabs.find(tab=>tab.getAttribute('aria-selected')==='true');
  highlightTab(selected);
  if(!selected||selected.hidden)return;
  tabBar.style.setProperty('--selected-left',`${selected.offsetLeft}px`);
  tabBar.style.setProperty('--selected-width',`${selected.offsetWidth}px`);
};
tabBar.addEventListener('pointerleave',highlightSelected);
tabBar.addEventListener('focusout',event=>{if(!tabBar.contains(event.relatedTarget))highlightSelected();});
new ResizeObserver(highlightSelected).observe(tabBar);
function selectTab(id,focus=false){
  for(const tab of tabs){
    const selected=tab.id===`auth-tab-${id}`;
    tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    $(tab.getAttribute('aria-controls')).hidden=!selected;
    if(selected&&focus)tab.focus();
  }
  highlightSelected();
}
tabs.forEach(tab=>{
  tab.addEventListener('pointerenter',()=>highlightTab(tab));
  tab.addEventListener('focus',()=>highlightTab(tab));
  tab.addEventListener('click',()=>selectTab(tab.id.slice(9)));
  tab.addEventListener('keydown',event=>{
    const available=tabs.filter(item=>!item.hidden),index=available.indexOf(tab);
    const next={ArrowRight:(index+1)%available.length,ArrowLeft:(index+available.length-1)%available.length,Home:0,End:available.length-1}[event.key];
    if(next===undefined)return;
    event.preventDefault();selectTab(available[next].id.slice(9),true);
  });
});
let invitation=new URLSearchParams(location.hash.slice(1)).get('invite');
let resetToken=new URLSearchParams(location.search).get('token');
if(invitation||resetToken)history.replaceState(null,'','/auth');
$('accept-section').hidden=!invitation;$('reset-section').hidden=!resetToken;
function message(text){$('auth-message').textContent=/^HTTP |fetch|network/i.test(text)?'Autenticação indisponível. Tente novamente mais tarde.':text;$('auth-message').focus();}
async function options(){
  const response=await fetch('/api/csrf',{cache:'no-store'});
  if(!response.ok)throw Error('Não foi possível preparar a solicitação.');
  return {headers:{'x-vault-csrf':(await response.json()).token}};
}
async function api(path,method='GET',data){
  const headers=method==='GET'?{}:(await options()).headers;
  if(data!==undefined)headers['content-type']='application/json';
  const response=await fetch(path,{method,headers,cache:'no-store',...(data===undefined?{}:{body:JSON.stringify(data)})});
  const body=await response.json();if(!response.ok)throw Error(body.error||'Não foi possível concluir.');return body;
}
async function sdk(call){const result=await call(await options());if(result.error)throw Error(result.error.message||'Não foi possível concluir.');return result.data;}
function verificationEmail(email){
  $('code-email').value=email;
  $('code-email').readOnly=Boolean(email);
  $('verification-email-field').hidden=Boolean(email);
  $('verification-destination').hidden=!email;
  $('verification-destination').textContent=email?`Código de verificação para ${email}.`:'';
  $('send-code').textContent=email?'Reenviar código':'Enviar código';
}
async function sendVerificationCode(){
  if(!$('code-email').reportValidity())return false;
  await sdk(opts=>auth.emailOtp.sendVerificationOtp({email:$('code-email').value,type:'email-verification'},opts));
  return true;
}
async function refresh(){
  const result=await auth.getSession({query:{disableCookieCache:true}});
  if(result.error)throw Error('Autenticação indisponível. Tente novamente mais tarde.');
  const signed=Boolean(result.data?.user);
  $('signed-out').hidden=(signed&&result.data.user.emailVerified)||Boolean(resetToken);$('account').hidden=!signed||Boolean(resetToken);
  tabs.forEach(tab=>{tab.hidden=signed&&tab.id!=='auth-tab-verify';});
  if(signed&&!result.data.user.emailVerified){verificationEmail(result.data.user.email);selectTab('verify');}
  $('verify-section').hidden=Boolean(resetToken)||Boolean(result.data?.user?.emailVerified);
  VaultProfile.render($('user-profile'),result.data?.user);
  $('auth-title').textContent=resetToken?'Uma nova senha.':signed?'Sua conta no Vault.':'Seu acesso ao cofre.';
  $('auth-intro').textContent=signed?'Seu acesso e os convites da equipe, em um só lugar.':'Projetos, decisões e soluções da equipe em um só lugar.';
  $('invites').hidden=true;$('management-link').hidden=true;
  if(!signed)return;
  $('account-status').textContent=result.data.user.emailVerified?'Conta conectada. Verificando acesso interno…':'Verifique seu e-mail para continuar.';
  try{
    const user=await api('/api/me');$('account-status').textContent='Seu acesso está ativo. Tudo pronto para consultar e organizar os projetos da equipe.';
    VaultProfile.render($('user-profile'),user);
    $('management-link').hidden=false;$('invites').hidden=Boolean(resetToken);await listInvites();
  }catch(error){$('account-status').textContent=error.message;}
}
function onForm(id,run){$(id).addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button:not([type="button"])'),label=button.textContent;button.disabled=true;button.textContent='Aguarde…';form.setAttribute('aria-busy','true');
  try{await run(Object.fromEntries(new FormData(form)));}catch(error){message(error.message);}finally{button.disabled=false;button.textContent=label;form.removeAttribute('aria-busy');}
});}
function onClick(id,run){$(id).addEventListener('click',async()=>{const button=$(id);button.disabled=true;try{await run();}catch(error){message(error.message);}finally{button.disabled=false;}});}
onForm('login',async data=>{await sdk(opts=>auth.signIn.email(data,opts));$('login-password').value='';message('Conta conectada.');await refresh();});
onForm('signup',async data=>{
  await sdk(opts=>auth.signUp.email(data,opts));
  $('signup-password').value='';verificationEmail(data.email);selectTab('verify');
  $('send-code').disabled=true;
  let sent=false;
  try{sent=await sendVerificationCode();}catch{ /* O cadastro já existe; o usuário pode tentar o reenvio. */ }
  finally{$('send-code').disabled=false;}
  let sessionWarning='';
  try{await refresh();}catch{sessionWarning=' Não foi possível atualizar a sessão agora. Você pode continuar a verificação.';}
  message((sent?'Conta criada. Código enviado. Confira seu e-mail e informe o código.':'Conta criada, mas não foi possível enviar o código. Use Reenviar código para tentar novamente.')+sessionWarning);
  if(sent)$('verify-otp').focus();
});
onForm('recovery',async data=>{await sdk(opts=>auth.requestPasswordReset({...data,redirectTo:`${location.origin}/auth`},opts));message('Se houver uma conta elegível, você receberá as instruções de recuperação.');});
onClick('send-code',async()=>{if(!await sendVerificationCode())return;message('Se a conta puder ser verificada, o código será enviado ao e-mail informado.');$('verify-otp').focus();});
onForm('verify',async data=>{await sdk(opts=>auth.emailOtp.verifyEmail(data,opts));$('verify-otp').value='';message('E-mail verificado.');await refresh();});
onForm('reset',async data=>{await sdk(opts=>auth.resetPassword({...data,token:resetToken},opts));resetToken=null;$('reset').reset();$('reset-section').hidden=true;message('Senha atualizada. Entre com a nova senha.');await refresh();});
onForm('accept',async data=>{await api('/api/invitations/accept','POST',{...data,token:invitation});invitation=null;$('accept').reset();$('accept-section').hidden=true;message('Convite aceito.');await refresh();});
onClick('logout',async()=>{await sdk(opts=>auth.signOut({},opts));location.replace('/auth');});
async function listInvites(){
  const list=await api('/api/invitations');$('invite-list').replaceChildren();$('invite-empty').hidden=list.length>0;
  for(const invite of list){
    const li=document.createElement('li'),state=invite.consumed_at?'Aceito':invite.revoked_at?'Revogado':Date.parse(invite.expires_at)<=Date.now()?'Expirado':'Pendente';
    li.textContent=`${state} — validade: ${new Date(invite.expires_at).toLocaleString('pt-BR')} `;
    if(state==='Pendente'){const button=document.createElement('button');button.type='button';button.textContent='Revogar';button.onclick=async()=>{button.disabled=true;try{await api(`/api/invitations/${invite.id}`,'DELETE');await listInvites();}catch(error){message(error.message);button.disabled=false;}};li.append(button);}
    $('invite-list').append(li);
  }
}
onClick('create-invite',async()=>{const invite=await api('/api/invitations','POST');$('invite-link').value=`${location.origin}/auth#invite=${invite.token}`;$('invite-result').hidden=false;await listInvites();});
onClick('copy-invite',async()=>{try{await navigator.clipboard.writeText($('invite-link').value);message('Link copiado.');}catch{$('invite-link').select();message('Selecione e copie o link do campo.');}});
document.querySelectorAll('[data-password]').forEach(button=>button.addEventListener('click',()=>{const input=$(button.dataset.password),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Ocultar senha':'Mostrar senha';button.setAttribute('aria-pressed',String(show));}));
refresh().catch(error=>message(error.message));
