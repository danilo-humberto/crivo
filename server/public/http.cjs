const {filterProjects,statuses,categories}=require('../../src/domain/core.js');
const {catalogPage,projectPage,errorPage}=require('./pages.cjs');

function createPublicHandler(repository,reviewPageData=null){
  return async function handle(req,res,url){
    const path=url.pathname;
    const api=path==='/api/public/projects'||path.startsWith('/api/public/projects/');
    const catalog=path==='/catalogo'||path==='/api/public/projects';
    const match=path.match(api?/^\/api\/public\/projects\/~([^/]+)$/:/^\/projetos\/~([^/]+)$/);
    if(!api&&path!=='/catalogo'&&!path.startsWith('/projetos/'))return false;
    const send=(status,data)=>{
      res.writeHead(status,{'Content-Type':api?'application/json; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:api?JSON.stringify(data):data);
      return true;
    };
    const error=status=>send(status,api?{error:status===404?'Projeto indisponível.':'Catálogo indisponível. Tente novamente.'}:errorPage(status));
    if(!['GET','HEAD'].includes(req.method)){
      res.setHeader('Allow','GET, HEAD');
      return send(405,api?{error:'Método não permitido.'}:errorPage(405));
    }
    if(!catalog&&!match)return error(404);
    let id;
    if(match){try{id=decodeURIComponent(match[1]);}catch{return error(404);}}
    if(!repository)return error(503);
    try{
      if(catalog){
        const projects=await repository.listProjects();
        if(api)return send(200,projects);
        const q=(url.searchParams.get('q')||'').slice(0,200);
        const status=statuses.includes(url.searchParams.get('status'))?url.searchParams.get('status'):'';
        const area=categories.includes(url.searchParams.get('area'))?url.searchParams.get('area'):'';
        return send(200,catalogPage(filterProjects(projects,q,status,area),{q,status,area},projects.length));
      }
      const project=await repository.getProject(id);
      if(!project)return error(404);
      if(!api&&reviewPageData)res.setHeader('Referrer-Policy','same-origin');
      return send(200,api?project:projectPage(project,reviewPageData?await reviewPageData(id,url):null));
    }catch{
      // Database/provider details must never become public messages or logs.
      return error(503);
    }
  };
}
module.exports={createPublicHandler};
