const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {createApi,json}=require('./auth/http.cjs');
const {createPublicHandler}=require('./public/http.cjs');
// Keep public URLs stable and expose only explicitly listed assets.
const files = new Map(Object.entries({
  '/':'src/web/pages/index.html', '/index.html':'src/web/pages/index.html',
  '/core.js':'src/domain/core.js', '/audit.js':'src/domain/audit.js',
  '/local-storage.js':'src/infrastructure/local-storage.js',
  '/app.js':'src/web/scripts/app.js', '/styles.css':'src/web/styles/styles.css',
  '/motion.css':'src/web/styles/motion.css',
  '/catalog.css':'src/web/styles/catalog.css',
  '/profile.js':'src/web/scripts/profile.js', '/profile.css':'src/web/styles/profile.css',
  '/auth':'src/web/pages/auth.html', '/auth.css':'src/web/styles/auth.css',
  '/auth.js':'dist/auth.js', '/remote-storage.js':'src/infrastructure/remote-storage.js'
}));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function createServer(options={}) {
  const mode=options.mode||'managed';
  const api=createApi({origin:'http://127.0.0.1:4173',...options});
  const publicHandle=createPublicHandler(options.publicRepository);
  return http.createServer(async(req,res)=>{
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    try {
    const url=new URL(req.url,'http://localhost');
    const pathname=url.pathname;
    if(mode!=='local'&&options.origin&&req.method==='GET'&&['/','/auth','/index.html','/management'].includes(pathname)&&req.headers.host!==new URL(options.origin).host){
      const canonical=new URL(options.origin);canonical.pathname=pathname;canonical.search=new URL(req.url,'http://localhost').search;
      res.writeHead(302,{Location:canonical.href});return res.end();
    }
    if(await publicHandle(req,res,url))return;
    if(pathname.startsWith('/api/'))return await api.handle(req,res,pathname);
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    if(mode!=='local'&&(pathname==='/'||pathname==='/index.html')){res.writeHead(302,{Location:'/catalogo'});return res.end();}
    if(pathname==='/management'){
      try{await api.authenticate(req,res);}catch(error){if(error.status===401||error.status===403){res.writeHead(302,{Location:'/auth'});return res.end();}throw error;}
    }
    const file=pathname==='/management'?'src/web/pages/index.html':files.get(pathname);
    if(!file){res.writeHead(404);return res.end('Not found');}
    fs.readFile(path.join(__dirname,'..',file),(err,data)=>{
      if(err){res.writeHead(500);return res.end('Unable to read file');}
      if(pathname==='/management')data=Buffer.from(data.toString().replace('src="local-storage.js"','src="remote-storage.js"').replace('Dados salvos somente neste navegador.','Dados salvos no servidor.').replace('Salvo neste navegador','Salvo no servidor').replace('Os registros ficam neste navegador; baixe uma cópia para guardá-los fora dele.','Os registros ficam no servidor.').replace('</head>','<link rel="stylesheet" href="/profile.css"><script defer src="/profile.js"></script></head>').replace('class="app-header"','class="app-header with-profile"').replace(/<header class="topbar">[\s\S]*?<\/header>/,'').replace('</header>','<div class="header-account"><nav class="account-navigation" aria-label="Conta"><a href="/catalogo">Catálogo público</a><a href="/auth">Minha conta e convites</a></nav><div class="user-profile" data-managed-profile hidden></div></div></header>'));
      res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(req.method==='HEAD'?undefined:data);
    });
    }catch(error){json(res,error.status||500,{error:error.status?error.message:'Não foi possível concluir a operação.'});}
  });
}
function start(){
  const origin=process.env.APP_ORIGIN||'http://localhost:4173';
  const options={origin,mode:process.env.VAULT_MODE||'managed'};
  if(options.mode==='local'&&process.env.VAULT_DB_ENV==='production')throw Error('Modo local indisponível em produção.');
  if(options.mode!=='local'&&process.env.DATABASE_URL){
    const pool=require('./persistence/database.cjs').createPool(process.env.DATABASE_URL);
    options.authRepository=require('./auth/repository.cjs').createAuthRepository(pool,{photoBaseUrl:process.env.EMPLOYEE_PHOTO_BASE_URL});
    options.repository=require('./persistence/repository.cjs').createRepository(pool);
    options.publicRepository=require('./persistence/public-repository.cjs').createPublicRepository(pool);
  }
  if(options.mode!=='local'&&process.env.NEON_AUTH_BASE_URL){
    options.auth=require('./auth/provider.cjs').createProvider({baseUrl:process.env.NEON_AUTH_BASE_URL,cookieSecret:process.env.NEON_AUTH_COOKIE_SECRET,origin});
  }
  return createServer(options).listen(4173,'127.0.0.1',()=>console.log(`Vault TI: ${origin}`));
}
if(require.main===module)start();
module.exports={createServer,start};
