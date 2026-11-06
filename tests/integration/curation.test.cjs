// Opt-in only: migrated, authorized, disposable development database.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createPool}=require('../../server/persistence/database.cjs');
const {createRepository}=require('../../server/persistence/repository.cjs');
const {createPublicRepository}=require('../../server/persistence/public-repository.cjs');

test('Postgres: curadoria, indicadores, auditoria, rollback e concorrência',async()=>{
  assert.equal(process.env.VAULT_DB_ENV,'development');
  assert.equal(process.env.VAULT_INTEGRATION_APPROVED,'yes');
  assert.ok(process.env.VAULT_EXPECTED_DATABASE);assert.ok(process.env.VAULT_EXPECTED_ROLE);
  const pool=createPool(process.env.DATABASE_URL);
  try{
    const identity=(await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0];
    assert.equal(identity.database,process.env.VAULT_EXPECTED_DATABASE);assert.equal(identity.role,process.env.VAULT_EXPECTED_ROLE);
    const projectId=randomUUID(),actorId=randomUUID(),reviewId=randomUUID();
    await pool.query("INSERT INTO vault.internal_users(id,auth_subject,name,cpf,active) VALUES ($1,$1,'Autor sintético','01234567890',true)",[actorId]);
    await pool.query(`INSERT INTO vault.projects(id,title,description,solution,owner_legacy,category,status,requested,cost,is_public)
      VALUES ($1,'Curadoria sintética','Resumo','Solução','Equipe sintética','Operações','Planejado','2026-11-06',0,true)`,[projectId]);
    for(const [index,rating] of [1,4,5].entries())await pool.query(`INSERT INTO vault.reviews(id,project_id,name,cpf,rating,comment)
      VALUES ($1,$2,'Pessoa sintética',$3,$4,'Comentário sintético')`,[index===0?reviewId:randomUUID(),projectId,['01234567890','52998224725','11144477735'][index],rating]);
    const repo=createRepository(pool),pub=createPublicRepository(pool);
    const indicators=async()=>{const p=await pub.getProject(projectId);return [p.reviewCount,p.reviewAverage];};
    assert.deepEqual(await indicators(),[3,10/3]);
    await repo.setReviewVisibility(projectId,reviewId,false,{actorId,expectedVisible:true});
    assert.deepEqual(await indicators(),[2,4.5]);
    const list=await repo.listProjectReviews(projectId,100);
    assert.equal(list.page,1);assert.equal(list.total,3);
    assert.equal(list.items.find(r=>r.id===reviewId).visible,false);assert.ok(list.items.every(r=>!('cpf' in r)));
    await assert.rejects(repo.addReview(projectId,{name:'Pessoa sintética',cpf:'01234567890',rating:5,comment:'Duplicada'}),{status:409});
    await repo.setReviewVisibility(projectId,reviewId,true,{actorId,expectedVisible:false});
    assert.deepEqual(await indicators(),[3,10/3]);
    const audit=(await pool.query('SELECT action,actor_id,before_snapshot,after_snapshot FROM vault.audit WHERE project_id=$1 ORDER BY happened_at',[projectId])).rows;
    assert.deepEqual(audit.map(e=>e.action),['review_hidden','review_shown']);assert.ok(audit.every(e=>e.actor_id===actorId));
    assert.doesNotMatch(JSON.stringify(audit),/cpf|photoUrl/);
    const failingPool={connect:async()=>{
      const client=await pool.connect();return {release:()=>client.release(),query:(sql,args)=>{
        if(sql.startsWith('INSERT INTO vault.audit'))throw Error('Synthetic audit failure');
        return client.query(sql,args);
      }};
    }};
    await assert.rejects(createRepository(failingPool).setReviewVisibility(projectId,reviewId,false,{actorId,expectedVisible:true}),/Synthetic audit failure/);
    assert.deepEqual(await indicators(),[3,10/3]);
    const concurrent=await Promise.allSettled([1,2].map(()=>repo.setReviewVisibility(projectId,reviewId,false,{actorId,expectedVisible:true})));
    assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(concurrent.find(r=>r.status==='rejected').reason.status,409);
    assert.deepEqual(await indicators(),[2,4.5]);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM vault.audit WHERE project_id=$1',[projectId])).rows[0].n,3);
    await pool.query('UPDATE vault.projects SET archived_at=clock_timestamp() WHERE id=$1',[projectId]);
    await assert.rejects(repo.listProjectReviews(projectId),{status:404});
    await assert.rejects(repo.setReviewVisibility(projectId,reviewId,true,{actorId,expectedVisible:false}),{status:404});
    assert.equal(await pub.getProject(projectId),null);
    // Synthetic records remain available for inspection in the disposable database.
  }finally{await pool.end();}
});
