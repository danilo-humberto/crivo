// Receives a private JSON document on stdin. Never pass personal data in argv.
const {createPool}=require('./persistence/database.cjs');
const {createProvider}=require('./auth/provider.cjs');
const {bootstrap}=require('./auth/bootstrap.cjs');
async function main(){
  const env=process.env;
  if(env.VAULT_BOOTSTRAP_APPROVED!=='yes'||!['development','production'].includes(env.VAULT_DB_ENV)||!env.VAULT_EXPECTED_DATABASE||!env.VAULT_EXPECTED_ROLE||process.stdin.isTTY)throw Error('Autorização, destino e entrada privada são obrigatórios.');
  let raw='';for await(const chunk of process.stdin){raw+=chunk;if(raw.length>16384)throw Error('Entrada inválida.');}
  const input=JSON.parse(raw);
  if(typeof input.sessionCookie!=='string'||!input.sessionCookie)throw Error('Sessão obrigatória.');
  const provider=createProvider({baseUrl:env.NEON_AUTH_BASE_URL,cookieSecret:env.NEON_AUTH_COOKIE_SECRET,origin:env.APP_ORIGIN});
  const session=await provider.session({headers:{cookie:input.sessionCookie}},{setHeader(){}});
  const pool=createPool(env.DATABASE_URL);
  try{
    const identity=(await pool.query(`SELECT current_database() AS database,current_user AS role,
      (has_table_privilege(current_user,'vault.internal_users','SELECT') AND
       has_table_privilege(current_user,'vault.internal_users','INSERT')) AS allowed`)).rows[0];
    if(identity.database!==env.VAULT_EXPECTED_DATABASE||identity.role!==env.VAULT_EXPECTED_ROLE||!identity.allowed)throw Error('Destino ou permissões divergentes.');
    await bootstrap(pool,session,input);
    console.log('Primeiro usuário provisionado.');
  }finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error('Provisionamento não concluído. Confira autorização, ambiente, identidade verificada e entrada privada.');process.exitCode=1;});
module.exports={main};
