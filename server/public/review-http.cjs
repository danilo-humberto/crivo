const {validateReview}=require('../persistence/reviews.cjs');
const {publicProjectPath}=require('../../src/domain/core.js');
const {projectPage,reviewErrorPage}=require('./pages.cjs');
const {createReviewProtection}=require('./review-protection.cjs');
const fail=(status,message)=>Object.assign(Error(message),{status});
const messages={400:'Confira os campos da avaliação.',403:'Não foi possível validar o envio. Reabra a página do projeto e tente novamente.',404:'Projeto indisponível.',405:'Método não permitido.',408:'O envio demorou demais. Tente novamente.',409:'Já existe uma avaliação deste CPF neste projeto. Não é possível editar ou enviar outra.',413:'A avaliação ultrapassa o tamanho permitido.',415:'Formato de envio não permitido.',429:'Muitas tentativas. Aguarde alguns minutos e tente novamente.',503:'Não foi possível concluir a operação. Tente novamente.'};

function readBody(req){
  return new Promise((resolve,reject)=>{
    let size=0;const chunks=[];
    const finish=(error,value)=>{
      clearTimeout(timer);req.off('data',data);req.off('end',end);req.off('error',errorHandler);req.off('aborted',aborted);
      if(error){req.resume();reject(error);}else resolve(value);
    };
    const data=chunk=>{size+=chunk.length;if(size>16384)finish(fail(413));else chunks.push(chunk);};
    const end=()=>finish(null,Buffer.concat(chunks).toString('utf8'));
    const errorHandler=()=>finish(fail(400));
    const aborted=()=>finish(fail(400));
    const timer=setTimeout(()=>finish(fail(408)),10000);timer.unref();
    req.on('data',data);req.on('end',end);req.on('error',errorHandler);req.on('aborted',aborted);
  });
}
function parsePage(url){
  const raw=url.searchParams.get('page')||'1';
  if(!/^[1-9]\d{0,4}$/.test(raw)||Number(raw)>10000)throw fail(400);
  return Number(raw);
}
function createReviewHandler(projects,reviews,{origin,protection=createReviewProtection(),clientIp=req=>req.socket.remoteAddress||'unknown'}={}){
  const pageData=async(id,url)=>({page:parsePage(url),...(await reviews.listReviews(id,parsePage(url))),formToken:protection.token(id),sent:url.searchParams.get('enviada')==='1'});
  async function handle(req,res,url){
    const match=url.pathname.match(/^\/(api\/public\/projects|projetos)\/~([^/]+)\/reviews$/);
    if(!match)return false;
    const api=match[1]==='api/public/projects';
    let id,project,input,validationMessage;
    const send=(status,value)=>{
      if(!api)res.setHeader('Referrer-Policy','same-origin');
      res.writeHead(status,{'Content-Type':api?'application/json; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:api?JSON.stringify(value):value);return true;
    };
    try{
      const allowed=api?['GET','HEAD','POST']:['POST'];
      if(!allowed.includes(req.method)){res.setHeader('Allow',allowed.join(', '));throw fail(405);}
      try{id=decodeURIComponent(match[2]);}catch{throw fail(404);}
      if(req.method==='POST'){
        const retry=await protection.take(clientIp(req));
        if(retry){res.setHeader('Retry-After',String(retry));throw fail(429);}
        if(!origin||req.headers.origin!==new URL(origin).origin||req.headers['sec-fetch-site']==='cross-site')throw fail(403);
        const type=(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
        if(type!==(api?'application/json':'application/x-www-form-urlencoded'))throw fail(415);
        if(Number(req.headers['content-length'])>16384)throw fail(413);
        const body=await readBody(req);
        try{input=api?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));}catch{throw fail(400);}
        if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400);
        if(!protection.verify(input.formToken,id))throw fail(403);
      }
      if(!projects||!reviews)throw fail(503);
      project=await projects.getProject(id);
      if(!project)throw fail(404);
      if(req.method!=='POST')return send(200,await pageData(id,url));
      let review;
      try{review=validateReview({...input,rating:api?input.rating:/^[1-5]$/.test(input.rating||'')?Number(input.rating):null});}
      catch(error){validationMessage=error.message;throw fail(400);}
      const result=await reviews.addReview(id,review);
      if(api)return send(201,{id:result.id});
      res.writeHead(303,{Location:`${publicProjectPath(id)}?enviada=1#avaliacoes`,'Cache-Control':'no-store'});res.end();return true;
    }catch(error){
      const status=Object.hasOwn(messages,error.status)?error.status:503;
      const message=status===400&&validationMessage?validationMessage:messages[status];
      if(req.method==='POST'&&!req.complete){res.setHeader('Connection','close');req.resume();}
      if(api)return send(status,{error:message});
      if(project&&status===400){
        // Re-render safe fields only. Never echo the submitted CPF, even on errors.
        try{return send(status,projectPage(project,{...await pageData(id,new URL('http://local')),error:message,values:{name:typeof input.name==='string'?input.name.slice(0,120):'',comment:typeof input.comment==='string'?input.comment.slice(0,2000):'',rating:input.rating}}));}catch{/* Fall back without database details. */}
      }
      return send(status,reviewErrorPage(message,id));
    }
  }
  return {handle,pageData};
}
module.exports={createReviewHandler,readBody};
