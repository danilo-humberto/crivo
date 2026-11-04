const {Pool,neonConfig}=require('@neondatabase/serverless');

function createPool(connectionString) {
  if(typeof connectionString!=='string'||!connectionString)throw Error('Conexão não configurada.');
  neonConfig.webSocketConstructor=globalThis.WebSocket;
  return new Pool({connectionString,max:4,connectionTimeoutMillis:10000});
}

async function transaction(pool,work) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const result=await work(client);
    await client.query('COMMIT');
    return result;
  } catch(error) {
    try {await client.query('ROLLBACK');} catch { /* Preserve the original failure. */ }
    throw error;
  } finally {client.release();}
}

module.exports={createPool,transaction};
