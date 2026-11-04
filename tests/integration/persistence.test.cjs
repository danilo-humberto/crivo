// Explicit opt-in only. Use an empty, migrated, disposable development database.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createPool}=require('../../server/persistence/database.cjs');
const {createRepository}=require('../../server/persistence/repository.cjs');

test('Postgres: persistência, importação concorrente, rollback e unicidade de avaliações',async()=>{
  assert.equal(process.env.VAULT_DB_ENV,'development');
  assert.equal(process.env.VAULT_INTEGRATION_APPROVED,'yes');
  assert.ok(process.env.VAULT_EXPECTED_DATABASE);
  assert.ok(process.env.VAULT_EXPECTED_ROLE);
  const pool=createPool(process.env.DATABASE_URL);
  try {
    const identity=(await pool.query(`SELECT current_database() AS database,current_user AS role,
      has_schema_privilege(current_user,'vault','USAGE') AS schema_access`)).rows[0];
    assert.equal(identity.database,process.env.VAULT_EXPECTED_DATABASE);
    assert.equal(identity.role,process.env.VAULT_EXPECTED_ROLE);
    assert.equal(identity.schema_access,true);
    const id=randomUUID(),actorId=randomUUID();
    const p={id,title:'Projeto sintético',description:'Teste',solution:'Teste',owner:'Legado sintético',category:'Operações',status:'Planejado',requested:'2026-11-04',completed:'',cost:10.123,url:'',alternatives:[{name:'Sintética',cost:20.456,notes:''}]};
    const event={id:randomUUID(),projectId:id,action:'baseline',at:'2026-11-04T12:00:00Z',actor:'Não identificado',before:null,after:p};
    const input={version:2,projects:[p],audit:[event]},options={source:randomUUID(),examples:'keep'};
    const repo=createRepository(pool);
    const imports=await Promise.all([repo.importState(input,options),repo.importState(input,options)]);
    assert.deepEqual(imports.map(r=>r.repeated).sort(),[false,true]);
    const connection=createPool(process.env.DATABASE_URL);
    try {
      const saved=await createRepository(connection).getProject(id);
      assert.equal(saved.cost,10.123);
      assert.deepEqual(saved.alternatives,p.alternatives);
      assert.equal(saved.owner_id,null);
      assert.equal(saved.is_public,false);
    } finally {await connection.end();}
    const history=(await pool.query('SELECT before_snapshot,after_snapshot,actor_id,legacy_event FROM vault.audit WHERE id=$1',[event.id])).rows[0];
    assert.equal(history.actor_id,null);
    assert.deepEqual(history.after_snapshot,p);
    assert.deepEqual(history.legacy_event,event);
    await assert.rejects(repo.importState({...input,projects:[{...p,cost:11}]},options));
    // A duplicate audit ID fails after insertion of a new project: all must roll back.
    const failedId=randomUUID(),failedSource=randomUUID();
    await assert.rejects(repo.importState({version:2,projects:[{...p,id:failedId}],audit:[event]},{source:failedSource,examples:'keep'}));
    assert.equal(await repo.getProject(failedId),null);
    assert.equal((await pool.query('SELECT source FROM vault.imports WHERE source=$1',[failedSource])).rows.length,0);
    await pool.query('INSERT INTO vault.internal_users(id,auth_subject,name,cpf,active) VALUES ($1,$1,$2,$3,true)',[actorId,'Usuário sintético','01234567890']);
    const updated=await repo.saveProject({...p,cost:12},{actorId,expectedVersion:1});
    assert.equal(updated.version,2);
    await assert.rejects(repo.saveProject({...p,cost:13},{actorId,expectedVersion:1}),/Conflito/);
    assert.equal((await pool.query('SELECT id FROM vault.audit WHERE project_id=$1',[id])).rows.length,2);
    const review={name:'Pessoa sintética',cpf:'01234567890',rating:5,comment:'Somente teste'};
    await assert.rejects(repo.addReview(id,review),/indisponível/);
    await pool.query('UPDATE vault.projects SET is_public=true WHERE id=$1',[id]);
    const results=await Promise.allSettled([repo.addReview(id,review),repo.addReview(id,review)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected').length,1);
    await pool.query('UPDATE vault.reviews SET visible=false WHERE project_id=$1',[id]);
    await assert.rejects(repo.addReview(id,review),/já registrada/);
    assert.equal((await pool.query('SELECT length(cpf) AS length,left(cpf,1) AS first FROM vault.reviews WHERE project_id=$1',[id])).rows[0].first,'0');
    await assert.rejects(pool.query('DELETE FROM vault.projects WHERE id=$1',[id]));
  } finally {await pool.end();}
});
