const {test}=require('node:test');
const assert=require('node:assert/strict');
const {configureDevelopment}=require('../server/local-env.cjs');
const config='VAULT_DB_ENV=development\nDATABASE_URL=postgresql://test:synthetic@dev.example/test\nVAULT_EXPECTED_HOST=dev.example\nNEON_AUTH_BASE_URL=\n';

test('inicialização local usa arquivo development apesar de variáveis herdadas de produção',()=>{
  const env={DATABASE_URL:'postgresql://test:synthetic@prod.example/test',VAULT_DB_ENV:'production',NEON_AUTH_BASE_URL:'https://prod.example/auth'};
  configureDevelopment(config,env);
  assert.equal(new URL(env.DATABASE_URL).hostname,'dev.example');
  assert.equal(env.VAULT_DB_ENV,'development');
  assert.equal(env.NEON_AUTH_BASE_URL,'');
});

test('inicialização local recusa produção, conexão inválida e endpoint divergente sem modificar ambiente',()=>{
  for(const input of [config.replace('development','production'),config.replace('VAULT_EXPECTED_HOST=dev.example','VAULT_EXPECTED_HOST=prod.example'),config.replace('postgresql://test:synthetic@dev.example/test','invalid'),config.replace('VAULT_EXPECTED_HOST=dev.example','')]){
    const env={unchanged:'yes'};
    assert.throws(()=>configureDevelopment(input,env),/Configuração local inválida/);
    assert.deepEqual(env,{unchanged:'yes'});
  }
});
