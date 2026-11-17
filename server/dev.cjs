const path=require('node:path');
const {devNull}=require('node:os');
const {spawnSync}=require('node:child_process');
const {once}=require('node:events');
const {assertLocalDocker,createDevelopmentServer}=require('./dev-runtime.cjs');
const root=path.join(__dirname,'..');

function docker(args,capture=false){
  const result=spawnSync('docker',args,{cwd:root,encoding:'utf8',stdio:capture?'pipe':'inherit'});
  if(result.error||result.status!==0)throw Error('Docker indisponível ou comando recusado. Confira o Docker Desktop e as portas locais.');
  return result.stdout?.trim();
}

async function main(){
  const action=process.argv[2]||'start';
  if(!['start','stop'].includes(action))throw Error('Ação de desenvolvimento inválida.');
  // Inspect the effective endpoint, including DOCKER_HOST; never provision remotely.
  if(process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT)assertLocalDocker(process.env.DOCKER_HOST);
  const context=docker(['context','show'],true);
  assertLocalDocker(docker(['context','inspect',context,'--format','{{.Endpoints.docker.Host}}'],true));
  const compose=['--context',context,'compose','--env-file',devNull,'-p','crivo-development','-f',path.join(root,'compose.dev.yaml')];
  if(action==='stop'){docker([...compose,'stop']);return;}
  docker([...compose,'up','-d','--wait','--wait-timeout','90']);
  await require('esbuild').build({absWorkingDir:root,entryPoints:['src/web/scripts/auth.js'],bundle:true,outfile:'dist/auth.js',platform:'browser',format:'iife',target:['es2022'],minify:true});
  const {server,pool}=await createDevelopmentServer();
  try{
    server.listen(4173,'127.0.0.1');
    await once(server,'listening');
  }catch(error){await pool.end();throw error;}
  console.log('Crivo DEV: http://127.0.0.1:4173/management');
  console.log('PostgreSQL Docker local; usuário fictício automático; fotos externas desativadas.');
  console.log('Ctrl+C encerra a aplicação. npm run dev:stop para os containers sem apagar dados.');
  let stopping=false;
  const stop=()=>{
    if(stopping)return;stopping=true;
    server.close(async()=>{await pool.end();process.exit(0);});
    server.closeIdleConnections();
  };
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
if(require.main===module)main().catch(error=>{console.error(error.message||'Falha na conexão local. Confira o PostgreSQL e o proxy Docker.');process.exitCode=1;});
