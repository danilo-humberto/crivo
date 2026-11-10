const {randomBytes,timingSafeEqual}=require('node:crypto');
const {fail,requireIdentity,requireInternal}=require('./policy.cjs');
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function readBody(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Envie JSON.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>65536)throw fail(413,'Conteúdo muito grande.');chunks.push(chunk);}
  try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{throw fail(400,'Conteúdo inválido.');}
}
function checkMutation(req,origin){
  const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('vault_csrf='))?.slice(11);
  const token=req.headers['x-vault-csrf'];
  if(req.headers.origin!==origin||typeof token!=='string'||!cookie||!/^[a-f0-9]{64}$/.test(token)||cookie.length!==token.length||!timingSafeEqual(Buffer.from(token),Buffer.from(cookie)))throw fail(403,'Origem ou proteção da solicitação inválida.');
}
function createApi({auth,authRepository,repository,origin}){
  const authenticate=async(req,res)=>{
    if(!auth||!authRepository)throw fail(503,'Autenticação ainda não configurada.');
    return requireInternal(await auth.session(req,res),authRepository.lookup);
  };
  return {authenticate,async handle(req,res,path){
    if(path==='/api/csrf'&&req.method==='GET'){
      const existing=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('vault_csrf='))?.slice(11);
      const token=/^[a-f0-9]{64}$/.test(existing||'')?existing:randomBytes(32).toString('hex');
      res.setHeader('Set-Cookie',`vault_csrf=${token}; Path=/; HttpOnly; SameSite=Strict${origin.startsWith('https:')?'; Secure':''}`);
      return json(res,200,{token});
    }
    if(!auth||!authRepository)throw fail(503,'Autenticação ainda não configurada.');
    if(!['GET','POST','DELETE'].includes(req.method))throw fail(405,'Método não permitido.');
    if(req.method!=='GET')checkMutation(req,origin);
    if(path.startsWith('/api/auth/')){
      const action=path.slice('/api/auth/'.length);
      const allowed=new Set(['sign-in/email','sign-up/email','sign-out','get-session','request-password-reset','reset-password','email-otp/send-verification-otp','email-otp/verify-email']);
      if(!allowed.has(action)||(action==='get-session'?req.method!=='GET':req.method!=='POST'))throw fail(404,'Rota indisponível.');
      const fields={
        'sign-in/email':['email','password'], 'sign-up/email':['email','password','name'],
        'sign-out':[], 'request-password-reset':['email'], 'reset-password':['token','newPassword'],
        'email-otp/send-verification-otp':['email'], 'email-otp/verify-email':['email','otp']
      };
      const input=req.method==='GET'?undefined:await readBody(req);
      const data=input?Object.fromEntries(fields[action].filter(key=>typeof input[key]==='string').map(key=>[key,input[key]])):undefined;
      if(data){
        // Only fixed same-origin return destinations may reach the provider.
        for(const key of ['callbackURL','redirectTo','errorCallbackURL','newUserCallbackURL'])if(key in data)data[key]=`${origin}/auth`;
        if(action==='request-password-reset')data.redirectTo=`${origin}/auth`;
        if(action==='sign-up/email')data.callbackURL=`${origin}/auth`;
        if(action==='email-otp/send-verification-otp')data.type='email-verification';
        if(action==='email-otp/verify-email'&&typeof data.otp==='string')data.otp=data.otp.trim();
      }
      const response=await auth.proxy(req,action,data);
      const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
      if(!response.ok){
        const failure=await response.clone().json().catch(()=>({}));
        if(['INVALID_CALLBACK_URL','INVALID_ORIGIN'].includes(failure.code))return json(res,503,{code:'AUTH_ORIGIN_NOT_ALLOWED',message:'Este endereço não está autorizado no provedor. Abra o Crivo pelo endereço configurado.'});
        if(action==='email-otp/verify-email'){
          const messages={OTP_EXPIRED:'O código expirou. Solicite um novo e use o e-mail mais recente.',INVALID_OTP:'Código inválido. Confira o código do e-mail mais recente.',TOO_MANY_ATTEMPTS:'Limite de tentativas atingido. Aguarde e solicite um novo código.'};
          if(Object.hasOwn(messages,failure.code))return json(res,failure.code==='TOO_MANY_ATTEMPTS'?429:400,{code:failure.code,message:messages[failure.code]});
        }
      }
      if(action==='request-password-reset'||action==='email-otp/send-verification-otp'){
        if(response.status===429)return json(res,429,{error:'Aguarde antes de tentar novamente.'});
        if(response.status>=500)return json(res,503,{error:'Autenticação indisponível. Tente novamente mais tarde.'});
        return json(res,200,{status:true});
      }
      // Never relay provider error details (which can contain personal data).
      if(!response.ok)return json(res,response.status>=500?503:400,{code:'AUTH_REQUEST_FAILED',message:'Não foi possível concluir. Confira os dados e tente novamente.'});
      res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(await response.text());
    }
    if(path==='/api/invitations/accept'&&req.method==='POST'){
      const identity=requireIdentity(await auth.session(req,res));
      return json(res,200,await authRepository.accept(identity.id,await readBody(req)));
    }
    const user=await authenticate(req,res);
    const reviews=path.match(/^\/api\/projects\/~([^/]+)\/reviews(?:\/~([^/]+))?$/);
    if(reviews){
      let projectId,reviewId;
      try{projectId=decodeURIComponent(reviews[1]);reviewId=reviews[2]&&decodeURIComponent(reviews[2]);}catch{throw fail(404,'Rota indisponível.');}
      if(!reviewId&&req.method==='GET'){
        const value=new URL(req.url,'http://localhost').searchParams.get('page')??'1';
        if(!/^[1-9][0-9]{0,4}$/.test(value)||Number(value)>10000)throw fail(400,'Página inválida.');
        return json(res,200,await repository.listProjectReviews(projectId,Number(value)));
      }
      if(reviewId&&req.method==='POST'){
        const body=await readBody(req);
        return json(res,200,await repository.setReviewVisibility(projectId,reviewId,body.visible,{expectedVisible:body.expectedVisible,actorId:user.id}));
      }
      throw fail(405,'Método não permitido.');
    }
    if(path==='/api/me'&&req.method==='GET')return json(res,200,user);
    if(path==='/api/users'&&req.method==='GET')return json(res,200,await authRepository.listUsers());
    if(path==='/api/invitations'){
      if(req.method==='GET')return json(res,200,await authRepository.listInvites(user.id));
      if(req.method==='POST')return json(res,201,await authRepository.invite(user.id));
    }
    const invitation=path.match(/^\/api\/invitations\/([a-zA-Z0-9-]+)$/);
    if(invitation&&req.method==='DELETE')return json(res,200,await authRepository.revoke(invitation[1],user.id));
    if(path==='/api/projects'){
      if(req.method==='GET')return json(res,200,await repository.listState());
      if(req.method==='POST'){
        const body=await readBody(req);
        return json(res,200,await repository.saveProject(body.project,{expectedVersion:body.expectedVersion??null,actorId:user.id}));
      }
    }
    const project=path.match(/^\/api\/projects\/([^/]+)$/);
    if(project&&req.method==='DELETE'){
      const body=await readBody(req);
      return json(res,200,await repository.deleteProject(decodeURIComponent(project[1]),{expectedVersion:body.expectedVersion,actorId:user.id}));
    }
    throw fail(404,'Rota indisponível.');
  }};
}
module.exports={createApi,json};
