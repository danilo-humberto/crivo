// Explicitly authorized test database only. Auth identity is simulated; SQL and HTTP are real.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {once}=require('node:events');
const {createPool}=require('../../server/persistence/database.cjs');
const {createRepository}=require('../../server/persistence/repository.cjs');
const {createPublicRepository}=require('../../server/persistence/public-repository.cjs');
const {createReviewRepository}=require('../../server/persistence/review-repository.cjs');
const {createAuthRepository}=require('../../server/auth/repository.cjs');
const {createServer}=require('../../server/server.cjs');

test('HTTP/Postgres: duplicidade, curadoria concorrente, arquivamento e proteção das rotas',async()=>{
  assert.equal(process.env.VAULT_DB_ENV,'development');
  assert.equal(process.env.VAULT_INTEGRATION_APPROVED,'yes');
  assert.ok(process.env.VAULT_EXPECTED_DATABASE);assert.ok(process.env.VAULT_EXPECTED_ROLE);
  const pool=createPool(process.env.DATABASE_URL);
  let server;
  try{
    const identity=(await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0];
    assert.equal(identity.database,process.env.VAULT_EXPECTED_DATABASE);assert.equal(identity.role,process.env.VAULT_EXPECTED_ROLE);
    const permissions=(await pool.query(`SELECT bool_and(has_table_privilege(current_user,c.oid,'SELECT')
      AND has_table_privilege(current_user,c.oid,'INSERT') AND has_table_privilege(current_user,c.oid,'UPDATE')
      AND has_table_privilege(current_user,c.oid,'DELETE')) AS allowed FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='vault' AND c.relkind='r'`)).rows[0];
    assert.equal(permissions.allowed,true);
    const actor=randomUUID(),project=randomUUID(),origin='http://127.0.0.1:4173';
    await pool.query("INSERT INTO vault.internal_users(id,auth_subject,name,cpf,active) VALUES ($1,$1,'HTTP sintético','01234567890',true)",[actor]);
    await pool.query(`INSERT INTO vault.projects(id,title,description,solution,owner_legacy,category,status,requested,cost,is_public)
      VALUES ($1,'HTTP sintético','Resumo','Solução','Equipe sintética','Operações','Planejado','2026-11-09',0,true)`,[project]);
    server=createServer({origin,repository:createRepository(pool),publicRepository:createPublicRepository(pool),
      reviewRepository:createReviewRepository(pool,{photoBaseUrl:'https://example.invalid/{cpf}.jpeg'}),
      authRepository:createAuthRepository(pool),auth:{session:async req=>req.headers.cookie?.includes('synthetic_session=yes')?
        {user:{id:actor,emailVerified:true},session:{expiresAt:'2099-01-01'}}:null}});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const base=`http://127.0.0.1:${server.address().port}`;
    const route=`/api/public/projects/~${project}/reviews`;
    const request=async(path,options)=>{const r=await fetch(base+path,options);return {status:r.status,body:await r.json()};};
    const form=(await request(route)).body;
    const payload={name:'Pessoa sintética',cpf:'01234567890',rating:5,comment:'Concorrência HTTP sintética',formToken:form.formToken};
    const publish=()=>request(route,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)});
    const duplicate=await Promise.all([publish(),publish()]);
    assert.deepEqual(duplicate.map(r=>r.status).sort(),[201,409]);
    const review=duplicate.find(r=>r.status===201).body.id;
    const csrf=(await request('/api/csrf')).body.token;
    const headers={origin,'content-type':'application/json',cookie:`synthetic_session=yes; vault_csrf=${csrf}`,'x-vault-csrf':csrf};
    const internal=`/api/projects/~${project}/reviews/~${review}`;
    assert.equal((await request(`/api/projects/~${project}/reviews`)).status,401);
    assert.equal((await request(internal,{method:'POST',headers:{...headers,origin:'https://invalid.example'},body:JSON.stringify({visible:false,expectedVisible:true})})).status,403);
    const curate=(visible,expectedVisible)=>request(internal,{method:'POST',headers,body:JSON.stringify({visible,expectedVisible})});
    const conflict=await Promise.all([curate(false,true),curate(false,true)]);
    assert.deepEqual(conflict.map(r=>r.status).sort(),[200,409]);
    assert.equal((await request(route)).body.total,0);
    assert.equal((await publish()).status,409);
    assert.equal((await curate(true,false)).status,200);
    const racing=await Promise.all([
      request(`/api/projects/${project}`,{method:'DELETE',headers,body:JSON.stringify({expectedVersion:1})}),
      curate(false,true)
    ]);
    assert.equal(racing[0].status,200);assert.equal(racing[0].body.action,'archived');
    assert.ok([200,404].includes(racing[1].status));
    assert.equal((await request(route)).status,404);
    assert.equal((await curate(true,false)).status,404);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM vault.reviews WHERE project_id=$1',[project])).rows[0].n,1);
    const audit=(await pool.query('SELECT action,actor_id,before_snapshot,after_snapshot FROM vault.audit WHERE project_id=$1',[project])).rows;
    assert.equal(audit.filter(e=>e.action==='archived').length,1);
    assert.equal(audit.filter(e=>e.action==='review_hidden').length,racing[1].status===200?2:1);
    assert.equal(audit.filter(e=>e.action==='review_shown').length,1);
    assert.ok(audit.every(e=>e.actor_id===actor));assert.doesNotMatch(JSON.stringify(audit),/cpf|photoUrl/);
    // Only generated records are touched; leave them available for inspection.
  }finally{
    if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    await pool.end();
  }
});
