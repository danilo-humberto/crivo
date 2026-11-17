// Imported only by the development CLI/tests; never by the production runtime.
const {Client,Pool}=require('@neondatabase/serverless');
const databaseUrl='postgresql://crivo_app:crivo_app_local_only@127.0.0.1:55432/crivo_dev';

function developmentConfig(){
  // Deliberately independent of .env and process.env, including inherited prod URLs.
  return {databaseUrl,origin:'http://127.0.0.1:4173',photoBaseUrl:''};
}

function assertLocalDocker(endpoint){
  if(!/^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint))throw Error('Use um Docker local (socket Unix ou named pipe).');
}

function createDevelopmentPool(connectionString=databaseUrl){
  if(connectionString!==databaseUrl)throw Error('Desenvolvimento exige o banco local fixo.');
  class DevelopmentClient extends Client {
    constructor(options){
      super(options);
      Object.assign(this.neonConfig,{
        webSocketConstructor:globalThis.WebSocket,
        wsProxy:()=> '127.0.0.1:55433/v1?address=db:5432',
        useSecureWebSocket:false,
        pipelineConnect:false,
      });
    }
  }
  const pool=new Pool({connectionString,ssl:false,max:4,connectionTimeoutMillis:5000});
  // Neon 1.2.0 overwrites options.Client in its constructor; set the pool factory afterward.
  pool.Client=DevelopmentClient;
  // Disable the driver's optional HTTP shortcut for this pool without changing globals.
  pool.on('connect',()=>{});
  return pool;
}

function createDevelopmentAuth(){
  const session=async()=>({user:{id:'crivo-dev-user',name:'Pessoa de desenvolvimento',email:'dev@example.invalid',emailVerified:true},session:{expiresAt:new Date(Date.now()+86400000).toISOString()}});
  return {session,async proxy(req,action){
    if(action==='get-session')return Response.json(await session());
    return Response.json({code:'DEV_AUTH_SIMULATED',message:'Use /management; autenticação simulada local.'},{status:400});
  }};
}

async function createDevelopmentServer(){
  const config=developmentConfig(),pool=createDevelopmentPool();
  try{
    const {rows:[identity]}=await pool.query('SELECT current_database() AS database,current_user AS role');
    if(identity.database!=='crivo_dev'||identity.role!=='crivo_app')throw Error('Identidade do banco local divergente.');
    const versions=(await pool.query('SELECT version FROM vault.schema_migrations ORDER BY version')).rows;
    if(JSON.stringify(versions)!==JSON.stringify([{version:1},{version:2},{version:3}]))throw Error('Schema local incompatível; confira as migrations.');
    const photoOptions={photoBaseUrl:config.photoBaseUrl};
    const server=require('./server.cjs').createServer({origin:config.origin,
      auth:createDevelopmentAuth(),
      authRepository:require('./auth/repository.cjs').createAuthRepository(pool,photoOptions),
      repository:require('./persistence/repository.cjs').createRepository(pool),
      publicRepository:require('./persistence/public-repository.cjs').createPublicRepository(pool),
      reviewRepository:require('./persistence/review-repository.cjs').createReviewRepository(pool,photoOptions),
    });
    return {server,pool};
  }catch(error){await pool.end();throw error;}
}

module.exports={developmentConfig,assertLocalDocker,createDevelopmentPool,createDevelopmentAuth,createDevelopmentServer};
