const fs=require('node:fs');
const path=require('node:path');
const {configureDevelopment}=require('./local-env.cjs');

try{
  configureDevelopment(fs.readFileSync(path.join(__dirname,'..','.env'),'utf8'));
}catch{
  console.error('Inicialização local recusada. Configure o .env de desenvolvimento com DATABASE_URL e VAULT_EXPECTED_HOST correspondentes.');
  process.exit(1);
}
require('./server.cjs').start();
