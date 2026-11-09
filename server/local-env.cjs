const {parseEnv}=require('node:util');

function configureDevelopment(source,env=process.env){
  let config,url;
  try{
    config=parseEnv(source);
    url=new URL(config.DATABASE_URL);
    if(config.VAULT_DB_ENV!=='development'||!['postgres:','postgresql:'].includes(url.protocol)||
      !config.VAULT_EXPECTED_HOST||url.hostname!==config.VAULT_EXPECTED_HOST)throw Error();
  }catch{
    throw Error('Configuração local inválida: confira development, DATABASE_URL e VAULT_EXPECTED_HOST no .env.');
  }
  // The local profile wins over inherited shell variables, including empty values.
  Object.assign(env,config);
}
module.exports={configureDevelopment};
