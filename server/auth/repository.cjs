const {randomUUID}=require('node:crypto');
const {transaction}=require('../persistence/database.cjs');
const {fail,createInviteToken,hashToken,validateAcceptance}=require('./policy.cjs');
function createAuthRepository(pool,{photoBaseUrl='https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg'}={}){
  function photoFor(row){
    let photoUrl=null;
    if(/^\d{11}$/.test(row.cpf||''))try{
      const url=new URL(photoBaseUrl.replace('{cpf}',row.cpf));
      if(url.protocol==='https:'&&photoBaseUrl.includes('{cpf}')&&!url.username&&!url.password)photoUrl=url.href;
    }catch{/* Invalid configuration keeps the initials fallback. */}
    return photoUrl;
  }
  const lookup=async subject=>{
    const row=(await pool.query('SELECT id,name,active,cpf FROM vault.internal_users WHERE auth_subject=$1',[subject])).rows[0];
    if(!row)return null;
    return {id:row.id,name:row.name,active:row.active,photoUrl:photoFor(row)};
  };
  async function active(client,id){
    if(!(await client.query('SELECT id FROM vault.internal_users WHERE id=$1 AND active=true FOR SHARE',[id])).rows.length)throw fail(403,'Acesso interno não autorizado.');
  }
  return {lookup,
    async listUsers(){return (await pool.query('SELECT id,name,cpf FROM vault.internal_users WHERE active=true ORDER BY name,id')).rows.map(row=>({id:row.id,name:row.name,photoUrl:photoFor(row)}));},
    async listInvites(issuer){return (await pool.query('SELECT id,created_at,expires_at,consumed_at,revoked_at FROM vault.invitations WHERE issuer_id=$1 ORDER BY created_at DESC',[issuer])).rows;},
    async invite(issuer){return transaction(pool,async client=>{
      await active(client,issuer);
      const token=createInviteToken(),id=randomUUID();
      const row=(await client.query('INSERT INTO vault.invitations(id,token_hash,issuer_id) VALUES ($1,$2,$3) RETURNING id,expires_at',[id,hashToken(token),issuer])).rows[0];
      return {...row,token};
    });},
    async revoke(id,issuer){return transaction(pool,async client=>{
      await active(client,issuer);
      const result=await client.query('UPDATE vault.invitations SET revoked_at=clock_timestamp() WHERE id=$1 AND issuer_id=$2 AND consumed_at IS NULL AND revoked_at IS NULL RETURNING id',[id,issuer]);
      if(!result.rows.length)throw fail(409,'Convite indisponível.');
      return {id};
    });},
    async accept(subject,input){
      const data=validateAcceptance(input);
      return transaction(pool,async client=>{
        // Serialize two invitations accepted by the same identity as well.
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
        const invitation=(await client.query('SELECT id,issuer_id FROM vault.invitations WHERE token_hash=$1 FOR UPDATE',[data.hash])).rows[0];
        if(!invitation)throw fail(409,'Convite indisponível.');
        await active(client,invitation.issuer_id);
        const existing=(await client.query('SELECT id FROM vault.internal_users WHERE auth_subject=$1',[subject])).rows[0];
        if(existing)throw fail(409,'Conta já cadastrada. Procure o responsável pelo acesso.');
        const id=randomUUID();
        // The subsequent conditional update uses wall clock after acquiring locks.
        await client.query('INSERT INTO vault.internal_users(id,auth_subject,name,cpf,active) VALUES ($1,$2,$3,$4,true)',[id,subject,data.name,data.cpf]);
        const consumed=await client.query(`UPDATE vault.invitations SET consumed_at=clock_timestamp(),accepted_by=$2
          WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp() RETURNING id`,[invitation.id,id]);
        if(!consumed.rows.length)throw fail(409,'Convite indisponível.');
        return {id,name:data.name};
      });
    }
  };
}
module.exports={createAuthRepository};
