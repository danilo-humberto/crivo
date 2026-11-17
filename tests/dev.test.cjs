const {test}=require('node:test');
const assert=require('node:assert/strict');
const {developmentConfig,createDevelopmentPool,createDevelopmentAuth,assertLocalDocker}=require('../server/dev-runtime.cjs');

test('perfil Docker ignora destinos de produção herdados e desliga fotos externas',()=>{
  const config=developmentConfig({DATABASE_URL:'postgresql://prod.example/prod',NEON_AUTH_BASE_URL:'https://prod.example',EMPLOYEE_PHOTO_BASE_URL:'https://prod.example/{cpf}'});
  assert.equal(new URL(config.databaseUrl).hostname,'127.0.0.1');
  assert.equal(config.origin,'http://127.0.0.1:4173');
  assert.equal(config.photoBaseUrl,'');
  assert.equal(config.authBaseUrl,undefined);
});

test('Docker remoto é recusado antes de criar recursos',()=>{
  for(const endpoint of ['ssh://remote','tcp://remote:2376','tcp://127.0.0.1:2375',''])assert.throws(()=>assertLocalDocker(endpoint),/Docker local/);
  assert.doesNotThrow(()=>assertLocalDocker('npipe:////./pipe/dockerDesktopLinuxEngine'));
  assert.doesNotThrow(()=>assertLocalDocker('unix:///var/run/docker.sock'));
});

test('pool de desenvolvimento recusa destinos diferentes do banco fixo local',()=>{
  assert.throws(()=>createDevelopmentPool('postgresql://prod.example/prod'),/banco local/);
});

test('clientes do pool usam proxy local sem alterar configuração global Neon',async()=>{
  const {neonConfig}=require('@neondatabase/serverless');
  const original=neonConfig.useSecureWebSocket;
  const pool=createDevelopmentPool();
  try{
    const client=new pool.Client(pool.options);
    assert.equal(client.neonConfig.wsProxy('anything',5432),'127.0.0.1:55433/v1?address=db:5432');
    assert.equal(client.neonConfig.useSecureWebSocket,false);
    assert.equal(client.neonConfig.pipelineConnect,false);
    assert.equal(neonConfig.useSecureWebSocket,original);
  }finally{await pool.end();}
});

test('identidade fictícia permanece exclusiva do runtime de desenvolvimento',async()=>{
  const auth=createDevelopmentAuth();
  const session=await auth.session();
  assert.equal(session.user.id,'crivo-dev-user');
  assert.equal(session.user.emailVerified,true);
  assert.ok(Date.parse(session.session.expiresAt)>Date.now());
  const unsupported=await auth.proxy({},'sign-up/email',{});
  assert.equal(unsupported.status,400);
});
