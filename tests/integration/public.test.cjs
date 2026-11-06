// Opt-in integration against an explicitly authorized, migrated, disposable database.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createPool}=require('../../server/persistence/database.cjs');
const {createPublicRepository}=require('../../server/persistence/public-repository.cjs');
const {createReviewRepository}=require('../../server/persistence/review-repository.cjs');

test('Postgres: consultas públicas filtram visibilidade e nunca retornam campos internos',async()=>{
  assert.equal(process.env.VAULT_DB_ENV,'development');
  assert.equal(process.env.VAULT_INTEGRATION_APPROVED,'yes');
  assert.ok(process.env.VAULT_EXPECTED_DATABASE);
  assert.ok(process.env.VAULT_EXPECTED_ROLE);
  const pool=createPool(process.env.DATABASE_URL);
  let client;
  try{
    client=await pool.connect();
    const identity=(await client.query('SELECT current_database() AS database,current_user AS role')).rows[0];
    assert.equal(identity.database,process.env.VAULT_EXPECTED_DATABASE);
    assert.equal(identity.role,process.env.VAULT_EXPECTED_ROLE);
    await client.query('BEGIN');
    const ids=[randomUUID(),randomUUID(),randomUUID()];
    for(const [index,id] of ids.entries())await client.query(`INSERT INTO vault.projects
      (id,title,description,solution,owner_legacy,category,status,requested,cost,solution_url,is_public,archived_at)
      VALUES ($1,'Projeto sintético','Resumo','Solução','Equipe sintética','Operações','Planejado','2026-11-06',999,'https://example.invalid/hidden',$2,$3)`,
      [id,index!==1,index===2?'2026-11-06T00:00:00Z':null]);
    const repository=createPublicRepository(client);
    const publicProject=await repository.getProject(ids[0]);
    assert.deepEqual(Object.keys(publicProject).sort(),['id','title','description','solution','category','status','requested','completed','owner'].sort());
    assert.equal(await repository.getProject(ids[1]),null);
    assert.equal(await repository.getProject(ids[2]),null);
    assert.deepEqual((await repository.listProjects()).filter(p=>ids.includes(p.id)).map(p=>p.id),[ids[0]]);
    const reviews=createReviewRepository(client,{photoBaseUrl:'https://example.invalid/{cpf}.jpeg'});
    for(const id of ids)await client.query(`INSERT INTO vault.reviews(id,project_id,name,cpf,rating,comment)
      VALUES ($1,$2,'Pessoa sintética','01234567890',5,'Comentário sintético')`,[randomUUID(),id]);
    const visible=await reviews.listReviews(ids[0]);
    assert.equal(visible.items.length,1);
    assert.deepEqual(Object.keys(visible.items[0]).sort(),['id','name','rating','comment','createdAt','photoUrl'].sort());
    assert.equal(visible.items[0].photoUrl,'https://example.invalid/01234567890.jpeg');
    assert.equal((await reviews.listReviews(ids[1])).items.length,0);
    assert.equal((await reviews.listReviews(ids[2])).items.length,0);
    await client.query('UPDATE vault.reviews SET visible=false WHERE project_id=$1',[ids[0]]);
    assert.equal((await reviews.listReviews(ids[0])).items.length,0);
    await client.query('UPDATE vault.projects SET show_solution_url=true WHERE id=$1',[ids[0]]);
    assert.equal((await repository.getProject(ids[0])).url,'https://example.invalid/hidden');
    await client.query('UPDATE vault.projects SET is_public=false WHERE id=$1',[ids[0]]);
    assert.equal(await repository.getProject(ids[0]),null);
  }finally{
    if(client){try{await client.query('ROLLBACK');}finally{client.release();}}
    await pool.end();
  }
});
