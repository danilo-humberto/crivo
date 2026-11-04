const fs=require('node:fs/promises');
const {prepareImport}=require('./persistence/import.cjs');
const {createPool}=require('./persistence/database.cjs');
const {createRepository}=require('./persistence/repository.cjs');

async function main(args) {
  const [file,source,examples,...flags]=args;
  if(!file||!source||!['keep','exclude'].includes(examples)||flags.some(flag=>flag!=='--apply'&&!flag.startsWith('--exclude-project='))) {
    throw Error('Uso: node server/import-cli.cjs ARQUIVO ORIGEM keep|exclude [--exclude-project=ID] [--apply]');
  }
  const input=JSON.parse(await fs.readFile(file,'utf8'));
  const options={source,examples,excludeProjectIds:flags.filter(f=>f.startsWith('--exclude-project=')).map(f=>f.slice('--exclude-project='.length))};
  const plan=prepareImport(input,options);
  // Preview counts only: names and source data are not written to logs.
  console.log(JSON.stringify({counts:plan.counts,excluded:plan.excluded,unmappedOwners:plan.unmappedOwners.length}));
  if(!flags.includes('--apply'))return;
  if(process.env.VAULT_DB_ENV!=='development'||process.env.VAULT_IMPORT_APPROVED!=='yes')throw Error('Aplicação exige ambiente development e autorização explícita configurada.');
  const pool=createPool(process.env.DATABASE_URL);
  try {
    const identity=await pool.query('SELECT current_database() AS database,current_user AS role');
    if(identity.rows[0].database!==process.env.VAULT_EXPECTED_DATABASE||identity.rows[0].role!==process.env.VAULT_EXPECTED_ROLE)throw Error('Identidade do banco divergente.');
    console.log(JSON.stringify(await createRepository(pool).importState(input,options)));
  } finally {await pool.end();}
}
if(require.main===module)main(process.argv.slice(2)).catch(()=>{
  console.error('Importação não concluída. Confira argumentos, arquivo, ambiente e permissões. Nenhum detalhe de dados ou credenciais foi registrado.');
  process.exitCode=1;
});
module.exports={main};
